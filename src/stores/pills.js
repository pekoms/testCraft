import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'testcraft_pills_v1'

export const usePillsStore = defineStore('pills', () => {
  const pills = ref([])

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const loaded = raw ? JSON.parse(raw) : []
      const needsMigration = loaded.some(p => !p.topic)
      pills.value = loaded.map(p => ({ topic: 'Tema 01. La Función Pública', ...p }))
      if (needsMigration) persist() // write topic permanently to localStorage
    } catch {
      pills.value = []
    }
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
  }

  function save(pill) {
    const id = pill.id || genId()
    const p = { id, front: pill.front.trim(), back: pill.back.trim(), topic: (pill.topic || '').trim() }
    const idx = pills.value.findIndex(x => x.id === id)
    if (idx >= 0) pills.value = pills.value.map((x, i) => i === idx ? p : x)
    else pills.value = [...pills.value, p]
    persist()
    return p
  }

  function remove(id) {
    pills.value = pills.value.filter(p => p.id !== id)
    persist()
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pills.value)) } catch {}
  }

  const topics = computed(() => {
    const set = new Set(pills.value.map(p => p.topic).filter(Boolean))
    return [...set].sort()
  })

  return { pills, topics, load, save, remove, genId }
})
