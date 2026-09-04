import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'testcraft_pills_v1'
const DEFAULT_TOPIC = 'Tema 01. La Función Pública'

// Lazy import avoids circular dep at module init
async function getAuth() {
  const { useAuthStore } = await import('./auth')
  return useAuthStore()
}

export const usePillsStore = defineStore('pills', () => {
  const pills = ref([])

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
  }

  // ── Local storage (offline cache) ──────────────
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
  }
  function saveLocal(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)) } catch {}
  }

  // Pills created before topics existed default to the first topic
  function withTopic(list) {
    return list.map(p => ({ topic: DEFAULT_TOPIC, ...p }))
  }

  async function upsertRemote(pill, userId) {
    const { error } = await supabase.from('pills').upsert({
      id: pill.id,
      user_id: userId,
      data: pill,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,id' })
    return !error
  }

  // ── Load ───────────────────────────────────────
  async function load() {
    const local = withTopic(loadLocal())
    const auth = await getAuth()

    if (supabase && auth.currentUser) {
      try {
        const { data, error } = await supabase
          .from('pills').select('data')
          .order('updated_at', { ascending: false })
        if (error) throw error

        const remote = withTopic(data.map(r => r.data))

        // First sync from a device that already had local pills: push them up
        // so switching devices doesn't look like the pills were lost.
        if (!remote.length && local.length) {
          await Promise.all(local.map(p => upsertRemote(p, auth.currentUser.id)))
          pills.value = local
          saveLocal(local)
          return
        }

        pills.value = remote
        saveLocal(remote)
        return
      } catch {
        pills.value = local // offline — serve the cache
        return
      }
    }

    pills.value = local
    saveLocal(local)
  }

  // ── CRUD ───────────────────────────────────────
  async function save(pill) {
    const id = pill.id || genId()
    const p = {
      id,
      front: pill.front.trim(),
      back: pill.back.trim(),
      topic: (pill.topic || '').trim(),
    }

    const idx = pills.value.findIndex(x => x.id === id)
    if (idx >= 0) pills.value = pills.value.map((x, i) => i === idx ? p : x)
    else pills.value = [...pills.value, p]
    saveLocal(pills.value)

    const auth = await getAuth()
    if (supabase && auth.currentUser) await upsertRemote(p, auth.currentUser.id)

    return p
  }

  async function remove(id) {
    pills.value = pills.value.filter(p => p.id !== id)
    saveLocal(pills.value)

    const auth = await getAuth()
    if (supabase && auth.currentUser) {
      await supabase.from('pills').delete()
        .eq('id', id)
        .eq('user_id', auth.currentUser.id)
    }
  }

  return { pills, load, save, remove, genId }
})
