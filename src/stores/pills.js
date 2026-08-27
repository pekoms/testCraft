import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'testcraft_pills_v1'

export const usePillsStore = defineStore('pills', () => {
  const pills = ref([])

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      pills.value = raw ? JSON.parse(raw) : []
    } catch {
      pills.value = []
    }
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
  }

  function save(pill) {
    const id = pill.id || genId()
    const p = { id, front: pill.front.trim(), back: pill.back.trim() }
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

  return { pills, load, save, remove, genId }
})
