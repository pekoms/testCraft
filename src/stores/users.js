import { defineStore } from 'pinia'
import { supabase, MANAGE_USERS_FN } from '@/lib/supabase'

export const useUsersStore = defineStore('users', () => {
  async function callManageUsers(action, body = {}) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(MANAGE_USERS_FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...body }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Error en la operación')
    return json
  }

  return { callManageUsers }
})
