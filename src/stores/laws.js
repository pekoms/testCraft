import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'testcraft_laws_v1'

// Lazy imports avoid circular deps at module init
async function getAuth() {
  const { useAuthStore } = await import('./auth')
  return useAuthStore()
}
async function toast(msg) {
  const { useAppStore } = await import('./app')
  useAppStore().showToast(msg)
}

export const useLawsStore = defineStore('laws', () => {
  const laws = ref([])

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

  // Returns the Supabase error, or null on success
  async function upsertRemote(law, userId) {
    const { error } = await supabase.from('laws').upsert({
      id: law.id,
      user_id: userId,
      data: law,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,id' })
    return error
  }

  // PostgREST caps rows per response (1000 on Supabase by default), so a single
  // select silently truncates. Page until a request comes back empty, advancing
  // by however many rows the server actually returned — a cap lower than PAGE
  // still terminates correctly. Ordering by id keeps the window stable.
  async function fetchAllRemote() {
    const PAGE = 1000
    const rows = []
    for (let from = 0; ;) {
      const { data, error } = await supabase
        .from('laws').select('data, updated_at')
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
    const local = loadLocal()
    const auth = await getAuth()

    if (supabase && auth.currentUser) {
      try {
        const data = await fetchAllRemote()
        laws.value = data.map(r => r.data)
        saveLocal(laws.value)
        return
      } catch (e) {
        laws.value = local // offline — serve the cache
        toast(`Error al cargar las leyes: ${e.message || e}`)
        return
      }
    }

    laws.value = local
    saveLocal(local)
  }

  // ── CRUD ───────────────────────────────────────
  async function save(law) {
    const id = law.id || genId()
    const l = {
      id,
      title: law.title.trim(),
      content: law.content.trim(),
      topic: (law.topic || '').trim(),
      secret: !!law.secret,
    }

    const idx = laws.value.findIndex(x => x.id === id)
    if (idx >= 0) laws.value = laws.value.map((x, i) => i === idx ? l : x)
    else laws.value = [l, ...laws.value]
    saveLocal(laws.value)

    const auth = await getAuth()
    if (supabase && auth.currentUser) {
      const error = await upsertRemote(l, auth.currentUser.id)
      if (error) toast(`Error al guardar en la nube: ${error.message}`)
    }

    return l
  }

  async function remove(id) {
    laws.value = laws.value.filter(l => l.id !== id)
    saveLocal(laws.value)

    const auth = await getAuth()
    if (supabase && auth.currentUser) {
      const { error } = await supabase.from('laws').delete()
        .eq('id', id)
        .eq('user_id', auth.currentUser.id)
      if (error) toast(`Error al eliminar en la nube: ${error.message}`)
    }
  }

  // Topics are shared with tests and pills, so a rename must reach the laws too
  async function renameTopic(from, to) {
    const prev = from || ''
    const next = (to || '').trim()
    if (!next || next === prev) return { changed: 0, failed: 0, total: 0 }

    const targets = laws.value.filter(l => (l.topic || '') === prev)
    if (!targets.length) return { changed: 0, failed: 0, total: 0 }

    const auth = await getAuth()
    const cloud = !!(supabase && auth.currentUser)

    let changed = 0, failed = 0
    for (const l of targets) {
      const moved = { ...l, topic: next }
      if (cloud && await upsertRemote(moved, auth.currentUser.id)) { failed++; continue }
      laws.value = laws.value.map(x => x.id === l.id ? moved : x)
      changed++
    }
    saveLocal(laws.value)
    return { changed, failed, total: targets.length }
  }

  // Laws grouped by topic, newest first within each. `includeSecret` is false
  // for students, so a topic holding only secret laws disappears for them
  // instead of showing up empty.
  function byTopic(includeSecret) {
    const visible = includeSecret ? laws.value : laws.value.filter(l => !l.secret)
    const map = new Map()
    for (const l of visible) {
      const t = l.topic || 'Sin tema'
      if (!map.has(t)) map.set(t, [])
      map.get(t).push(l)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))
  }

  const topics = computed(() =>
    [...new Set(laws.value.map(l => l.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
  )

  return { laws, topics, load, save, remove, renameTopic, byTopic, genId }
})
