import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const { email, redirectTo } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ role: 'unknown' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, is_teacher, is_blocked')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (!profile) {
      return new Response(JSON.stringify({ role: 'unknown' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (profile.is_teacher) {
      return new Response(JSON.stringify({ role: 'teacher' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (profile.is_blocked) {
      return new Response(JSON.stringify({ role: 'blocked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate a magic link for the student (no email sent — returned directly)
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: { redirectTo: redirectTo ?? '' },
    })
    if (error) throw error

    return new Response(JSON.stringify({ role: 'student', link: data.properties.action_link }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
