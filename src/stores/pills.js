import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'testcraft_pills_v1'
const DEFAULT_TOPIC = 'Tema 01. La Función Pública'

// Lazy imports avoid circular deps at module init
async function getAuth() {
  const { useAuthStore } = await import('./auth')
  return useAuthStore()
}
async function toast(msg) {
  const { useAppStore } = await import('./app')
  useAppStore().showToast(msg)
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

  // Returns the Supabase error, or null on success
  async function upsertRemote(pill, userId) {
    const { error } = await supabase.from('pills').upsert({
      id: pill.id,
      user_id: userId,
      data: pill,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,id' })
    return error
  }

  // PostgREST caps rows per response (1000 on Supabase by default), so a single
  // select silently truncates large collections. Page until a request comes
  // back empty, advancing by however many rows the server actually returned —
  // that way a cap lower than PAGE still terminates correctly. Ordering by id
  // (unique per user) keeps the window stable across requests; updated_at ties
  // could otherwise duplicate or skip rows between pages.
  async function fetchAllRemote() {
    const PAGE = 1000
    const rows = []
    for (let from = 0; ;) {
      const { data, error } = await supabase
        .from('pills').select('data, updated_at')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw error
      if (!data.length) break
      rows.push(...data)
      from += data.length
    }
    rows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    return rows
  }

  // ── Load ───────────────────────────────────────
  async function load() {
    const local = withTopic(loadLocal())
    const auth = await getAuth()

    if (supabase && auth.currentUser) {
      try {
        const data = await fetchAllRemote()
        const remote = withTopic(data.map(r => r.data))

        // First sync from a device that already had local pills: push them up
        // so switching devices doesn't look like the pills were lost.
        if (!remote.length && local.length) {
          const errors = await Promise.all(local.map(p => upsertRemote(p, auth.currentUser.id)))
          const failed = errors.filter(Boolean)
          pills.value = local
          saveLocal(local)
          if (failed.length) toast(`Fallo al subir ${failed.length}/${local.length}: ${failed[0].message}`)
          else toast(`${local.length} píldoras subidas a la nube ✓`)
          return
        }

        pills.value = remote
        saveLocal(remote)
        return
      } catch (e) {
        pills.value = local // offline — serve the cache
        toast(`Error al cargar las píldoras: ${e.message || e}`)
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
    if (supabase && auth.currentUser) {
      const error = await upsertRemote(p, auth.currentUser.id)
      if (error) toast(`Error al guardar en la nube: ${error.message}`)
    }

    return p
  }

  async function remove(id) {
    pills.value = pills.value.filter(p => p.id !== id)
    saveLocal(pills.value)

    const auth = await getAuth()
    if (supabase && auth.currentUser) {
      const { error } = await supabase.from('pills').delete()
        .eq('id', id)
        .eq('user_id', auth.currentUser.id)
      if (error) toast(`Error al eliminar en la nube: ${error.message}`)
    }
  }

  return { pills, load, save, remove, genId }
})
