/**
 * The pills table is fetched with a row cap (1000 on Supabase by default), so a
 * single select silently truncates. These cover the paging that works around it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Overrides the global null-supabase mock from setup.js
const query = { rows: [], calls: [], serverCap: 1000 }

vi.mock('@/lib/supabase', () => ({
  MANAGE_USERS_FN: '',
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          range: (from, to) => {
            query.calls.push([from, to])
            const size = Math.min(to - from + 1, query.serverCap)
            return Promise.resolve({ data: query.rows.slice(from, from + size), error: null })
          },
        }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ currentUser: { id: 'admin-1' } }),
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ showToast: vi.fn() }),
}))

const { usePillsStore } = await import('@/stores/pills')

// n pills over `topics` distinct topics, grouped in contiguous blocks — the way
// they are really created, one imported batch per topic. That grouping is what
// makes truncation drop whole topics off the tail instead of thinning them out.
function seed(n, topics) {
  const perTopic = Math.ceil(n / topics)
  query.rows = Array.from({ length: n }, (_, i) => ({
    data: {
      id: String(i).padStart(6, '0'),
      front: `P${i}`,
      back: `R${i}`,
      topic: `Tema ${String(Math.floor(i / perTopic) + 1).padStart(2, '0')}`,
    },
    updated_at: new Date(Date.now() - i * 1000).toISOString(),
  }))
}

describe('pills — paginación de la carga desde la nube', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    query.calls = []
    query.serverCap = 1000
    store = usePillsStore()
  })

  it('carga las 1000 de una tabla que cabe justo en una página', async () => {
    seed(1000, 10)
    await store.load()
    expect(store.pills).toHaveLength(1000)
  })

  it('carga TODAS cuando la tabla supera el tope de una respuesta', async () => {
    seed(1050, 35)
    await store.load()
    expect(store.pills).toHaveLength(1050)
  })

  it('no pierde temas por el truncado — los 35 siguen presentes', async () => {
    seed(1050, 35)
    await store.load()
    const topics = new Set(store.pills.map(p => p.topic))
    expect(topics.size).toBe(35)
  })

  it('una sola consulta sin paginar habría perdido temas (regresión)', async () => {
    seed(1050, 35)
    // Lo que devolvía la implementación anterior: la primera página y punto
    const truncated = query.rows.slice(0, 1000).map(r => r.data)
    expect(new Set(truncated.map(p => p.topic)).size).toBeLessThan(35)
  })

  it('pide páginas hasta recibir una vacía', async () => {
    seed(1050, 35)
    await store.load()
    expect(query.calls.length).toBe(3) // 0-999, 1000-1999 (50), 1050-2049 (vacía)
  })

  it('termina aunque el servidor limite por debajo del tamaño de página', async () => {
    seed(1200, 20)
    query.serverCap = 300 // tope más bajo que PAGE: avanzar por PAGE saltaría filas
    await store.load()
    expect(store.pills).toHaveLength(1200)
    expect(new Set(store.pills.map(p => p.topic)).size).toBe(20)
  })

  it('una tabla vacía no rompe la carga', async () => {
    seed(0, 0)
    await store.load()
    expect(store.pills).toHaveLength(0)
  })

  it('devuelve las píldoras ordenadas por fecha descendente', async () => {
    seed(1050, 35)
    await store.load()
    expect(store.pills[0].front).toBe('P0')
    expect(store.pills[1049].front).toBe('P1049')
  })
})
