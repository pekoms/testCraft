import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    // Verify caller identity
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders })
    }

    // Verify teacher role
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('is_teacher').eq('id', user.id).single()
    if (!callerProfile?.is_teacher) {
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json()
    const { action } = body

    // ── LIST ──────────────────────────────────────────────────────
    if (action === 'list') {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      if (error) throw error

      const { data: profiles } = await supabaseAdmin
        .from('profiles').select('id, is_teacher, is_blocked')

      const studentProfileIds = new Set(
        (profiles ?? []).filter(p => !p.is_teacher).map(p => p.id)
      )
      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

      const students = users
        .filter(u => studentProfileIds.has(u.id))
        .map(u => ({
          id: u.id,
          email: u.email ?? '',
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          is_blocked: profileMap[u.id]?.is_blocked ?? false,
        }))

      return new Response(JSON.stringify({ students }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── INVITE ────────────────────────────────────────────────────
    if (action === 'invite') {
      const { email, redirectTo } = body
      if (!email) throw new Error('Email requerido')

      // Check if a user with this email already exists to avoid wasting rate-limit quota
      const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const alreadyExists = allUsers.some(u => u.email?.toLowerCase() === email.toLowerCase())
      if (alreadyExists) {
        return new Response(JSON.stringify({ error: 'Este correo ya tiene una cuenta registrada.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo ?? Deno.env.get('SUPABASE_URL'),
      })
      if (error) {
        const msg: string = (error as any).message ?? String(error)
        if (msg.toLowerCase().includes('rate') || (error as any).status === 429) {
          throw new Error('Límite de emails alcanzado. Espera unos minutos e inténtalo de nuevo.')
        }
        throw error
      }

      await supabaseAdmin.from('profiles').upsert({
        id: data.user.id,
        is_teacher: false,
        is_blocked: false,
      })

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── BLOCK / UNBLOCK ───────────────────────────────────────────
    if (action === 'block') {
      const { userId, block } = body
      if (!userId) throw new Error('userId requerido')

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: block ? '876600h' : 'none',
      })
      if (error) throw error

      await supabaseAdmin.from('profiles').update({ is_blocked: block }).eq('id', userId)

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── DELETE ────────────────────────────────────────────────────
    if (action === 'delete') {
      const { userId } = body
      if (!userId) throw new Error('userId requerido')

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) throw error

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Acción no reconocida' }), { status: 400, headers: corsHeaders })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
