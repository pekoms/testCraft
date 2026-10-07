/**
 * Renaming a topic. Topics live in two places — tests and pills — so each store
 * carries its own rename and the view calls both.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// persistTest/upsert are called from inside the stores, so they never go
// through the Pinia proxy. Fail them at the real boundary instead.
const failFor = { ids: [] }

vi.mock('@/lib/supabase', () => ({
  MANAGE_USERS_FN: '',
  supabase: {
    from: () => ({
      upsert: payload => Promise.resolve({
        error: failFor.ids.includes(payload.id) ? { message: 'boom' } : null,
      }),
      select: () => ({ order: () => ({ range: () => Promise.resolve({ data: [], error: null }) }) }),
    }),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ currentUser: { id: 'admin-1' }, isTeacher: true, isAdmin: true }),
}))

const { useAppStore } = await import('@/stores/app')
const { usePillsStore } = await import('@/stores/pills')

describe('renameTopic — tests', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    failFor.ids = []
    store = useAppStore()
    store.tests = [
      { id: 'a', title: 'A', topic: 'Tema 01', questions: [] },
      { id: 'b', title: 'B', topic: 'Tema 01', questions: [] },
      { id: 'c', title: 'C', topic: 'Tema 02', questions: [] },
    ]
  })

  const byId = id => store.tests.find(t => t.id === id)

  it('renombra todos los tests del tema', async () => {
    await store.renameTopic('Tema 01', 'Tema 01. La Función Pública')
    expect(byId('a').topic).toBe('Tema 01. La Función Pública')
    expect(byId('b').topic).toBe('Tema 01. La Función Pública')
  })

  it('no toca los tests de otros temas', async () => {
    await store.renameTopic('Tema 01', 'Nuevo')
    expect(byId('c').topic).toBe('Tema 02')
  })

  it('informa de cuántos ha cambiado', async () => {
    const r = await store.renameTopic('Tema 01', 'Nuevo')
    expect(r).toMatchObject({ changed: 2, failed: 0, total: 2 })
  })

  it('renombrar a un tema existente funde los dos', async () => {
    await store.renameTopic('Tema 01', 'Tema 02')
    expect(store.tests.filter(t => t.topic === 'Tema 02')).toHaveLength(3)
  })

  it('recorta espacios del nombre nuevo', async () => {
    await store.renameTopic('Tema 01', '  Limpio  ')
    expect(byId('a').topic).toBe('Limpio')
  })

  it('un nombre vacío no cambia nada', async () => {
    const r = await store.renameTopic('Tema 01', '   ')
    expect(r.changed).toBe(0)
    expect(byId('a').topic).toBe('Tema 01')
  })

  it('renombrar al mismo nombre no hace nada', async () => {
    const r = await store.renameTopic('Tema 01', 'Tema 01')
    expect(r.changed).toBe(0)
  })

  it('actualiza el tema abierto para no dejar la vista vacía', async () => {
    store.currentTopic = 'Tema 01'
    await store.renameTopic('Tema 01', 'Nuevo')
    expect(store.currentTopic).toBe('Nuevo')
  })

  it('no toca el tema abierto si estabas en otro', async () => {
    store.currentTopic = 'Tema 02'
    await store.renameTopic('Tema 01', 'Nuevo')
    expect(store.currentTopic).toBe('Tema 02')
  })

  it('si uno falla, ese se queda con el nombre viejo', async () => {
    failFor.ids = ['b']
    const r = await store.renameTopic('Tema 01', 'Nuevo')
    expect(byId('a').topic).toBe('Nuevo')
    expect(byId('b').topic).toBe('Tema 01')
    expect(r).toMatchObject({ changed: 1, failed: 1 })
  })
})

describe('renameTopic — píldoras', () => {
  let pills

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    failFor.ids = []
    pills = usePillsStore()
    pills.pills = [
      { id: 'p1', front: 'F1', back: 'B1', topic: 'Tema 01' },
      { id: 'p2', front: 'F2', back: 'B2', topic: 'Tema 01' },
      { id: 'p3', front: 'F3', back: 'B3', topic: 'Tema 02' },
    ]
  })

  const byId = id => pills.pills.find(p => p.id === id)

  it('renombra las píldoras del tema', async () => {
    await pills.renameTopic('Tema 01', 'Nuevo')
    expect(byId('p1').topic).toBe('Nuevo')
    expect(byId('p2').topic).toBe('Nuevo')
  })

  it('no toca las de otros temas', async () => {
    await pills.renameTopic('Tema 01', 'Nuevo')
    expect(byId('p3').topic).toBe('Tema 02')
  })

  it('conserva el contenido de la píldora', async () => {
    await pills.renameTopic('Tema 01', 'Nuevo')
    expect(byId('p1')).toMatchObject({ front: 'F1', back: 'B1' })
  })

  it('informa del recuento', async () => {
    const r = await pills.renameTopic('Tema 01', 'Nuevo')
    expect(r).toMatchObject({ changed: 2, failed: 0, total: 2 })
  })

  it('un tema sin píldoras devuelve cero', async () => {
    const r = await pills.renameTopic('Tema inexistente', 'Nuevo')
    expect(r).toMatchObject({ changed: 0, total: 0 })
  })

  it('si falla la subida, esa píldora mantiene su tema', async () => {
    failFor.ids = ['p2']
    const r = await pills.renameTopic('Tema 01', 'Nuevo')
    expect(byId('p1').topic).toBe('Nuevo')
    expect(byId('p2').topic).toBe('Tema 01')
    expect(r).toMatchObject({ changed: 1, failed: 1 })
  })

  it('deja la caché local al día', async () => {
    await pills.renameTopic('Tema 01', 'Nuevo')
    const cached = JSON.parse(localStorage.getItem('testcraft_pills_v1'))
    expect(cached.filter(p => p.topic === 'Nuevo')).toHaveLength(2)
  })
})
