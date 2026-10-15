/**
 * Laws store — grouping by topic, secret visibility and CRUD.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const failFor = { ids: [] }
const remote = { rows: [], calls: [] }

vi.mock('@/lib/supabase', () => ({
  MANAGE_USERS_FN: '',
  supabase: {
    from: () => ({
      upsert: p => Promise.resolve({ error: failFor.ids.includes(p.id) ? { message: 'boom' } : null }),
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      select: () => ({
        order: () => ({
          range: (from, to) => {
            remote.calls.push([from, to])
            return Promise.resolve({ data: remote.rows.slice(from, to + 1), error: null })
          },
        }),
      }),
    }),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ currentUser: { id: 'u1' }, isTeacher: true, isAdmin: true }),
}))

const { useLawsStore } = await import('@/stores/laws')

const LAWS = [
  { id: 'l1', title: 'RD 513/2017', content: 'uno dos tres', topic: 'Tema 01', secret: false },
  { id: 'l2', title: 'Ley 31/1995', content: 'cuatro cinco', topic: 'Tema 01', secret: false },
  { id: 'l3', title: 'RD 1215/1997', content: 'seis', topic: 'Tema 02', secret: false },
  { id: 'l4', title: 'Borrador interno', content: 'siete', topic: 'Tema 03', secret: true },
]

describe('laws — agrupación por tema', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    failFor.ids = []
    remote.calls = []
    store = useLawsStore()
    store.laws = [...LAWS]
  })

  it('agrupa las leyes por tema', () => {
    const g = store.byTopic(true)
    expect(g.map(([t]) => t)).toEqual(['Tema 01', 'Tema 02', 'Tema 03'])
  })

  it('cuenta cuántas leyes tiene cada tema', () => {
    const g = store.byTopic(true)
    expect(g.find(([t]) => t === 'Tema 01')[1]).toHaveLength(2)
    expect(g.find(([t]) => t === 'Tema 02')[1]).toHaveLength(1)
  })

  it('oculta las leyes secretas a quien no es profesor', () => {
    const g = store.byTopic(false)
    expect(g.flatMap(([, items]) => items).map(l => l.id)).not.toContain('l4')
  })

  it('un tema con solo leyes secretas desaparece para el alumno', () => {
    expect(store.byTopic(false).map(([t]) => t)).toEqual(['Tema 01', 'Tema 02'])
    expect(store.byTopic(true).map(([t]) => t)).toContain('Tema 03')
  })

  it('las leyes sin tema caen en "Sin tema"', () => {
    store.laws = [{ id: 'x', title: 'T', content: 'c', topic: '', secret: false }]
    expect(store.byTopic(true)[0][0]).toBe('Sin tema')
  })

  it('ordena los temas alfabéticamente', () => {
    store.laws = [
      { id: 'a', title: 'A', content: 'c', topic: 'Zeta', secret: false },
      { id: 'b', title: 'B', content: 'c', topic: 'Alfa', secret: false },
    ]
    expect(store.byTopic(true).map(([t]) => t)).toEqual(['Alfa', 'Zeta'])
  })
})

describe('laws — CRUD', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    failFor.ids = []
    store = useLawsStore()
    store.laws = [...LAWS]
  })

  it('crea una ley con id propio', async () => {
    const l = await store.save({ id: null, title: 'Nueva', content: 'texto', topic: 'Tema 01' })
    expect(l.id).toBeTruthy()
    expect(store.laws.find(x => x.id === l.id)).toBeTruthy()
  })

  it('recorta título, contenido y tema', async () => {
    const l = await store.save({ id: null, title: '  T  ', content: '  C  ', topic: '  Tema 01  ' })
    expect(l).toMatchObject({ title: 'T', content: 'C', topic: 'Tema 01' })
  })

  it('editar no duplica la ley', async () => {
    const n = store.laws.length
    await store.save({ id: 'l1', title: 'Cambiada', content: 'otro', topic: 'Tema 01' })
    expect(store.laws).toHaveLength(n)
    expect(store.laws.find(l => l.id === 'l1').title).toBe('Cambiada')
  })

  it('guarda el indicador de secreta', async () => {
    const l = await store.save({ id: null, title: 'S', content: 'c', topic: 'T', secret: true })
    expect(l.secret).toBe(true)
  })

  it('elimina una ley', async () => {
    await store.remove('l1')
    expect(store.laws.find(l => l.id === 'l1')).toBeUndefined()
  })

  it('deja la caché local al día', async () => {
    await store.save({ id: null, title: 'Cacheada', content: 'c', topic: 'T' })
    const cached = JSON.parse(localStorage.getItem('testcraft_laws_v1'))
    expect(cached.some(l => l.title === 'Cacheada')).toBe(true)
  })

  it('renombrar un tema alcanza a sus leyes', async () => {
    await store.renameTopic('Tema 01', 'Tema 01. Nuevo')
    expect(store.laws.filter(l => l.topic === 'Tema 01. Nuevo')).toHaveLength(2)
    expect(store.laws.find(l => l.id === 'l3').topic).toBe('Tema 02')
  })
})

describe('laws — carga desde la nube', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    remote.calls = []
    store = useLawsStore()
  })

  it('carga todas aunque superen el tope de una respuesta', async () => {
    remote.rows = Array.from({ length: 1050 }, (_, i) => ({
      data: { id: 'x' + i, title: 'T' + i, content: 'c', topic: 'Tema ' + (i % 30), secret: false },
      updated_at: new Date(Date.now() - i * 1000).toISOString(),
    }))
    await store.load()
    expect(store.laws).toHaveLength(1050)
  })

  it('una tabla vacía no rompe la carga', async () => {
    remote.rows = []
    await store.load()
    expect(store.laws).toHaveLength(0)
  })
})
