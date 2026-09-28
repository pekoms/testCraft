/**
 * Bulk publish/secret over a whole topic.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// persistTest is called from inside the store, so it never goes through the
// Pinia proxy and cannot be spied on. Fail it at the real boundary instead.
const failFor = { ids: [] }

vi.mock('@/lib/supabase', () => ({
  MANAGE_USERS_FN: '',
  supabase: {
    from: () => ({
      upsert: payload => Promise.resolve({
        error: failFor.ids.includes(payload.id) ? { message: 'boom' } : null,
      }),
    }),
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ currentUser: { id: 'admin-1' }, isTeacher: true, isAdmin: true }),
}))

const { useAppStore } = await import('@/stores/app')

function makeTests() {
  return [
    { id: 'a', title: 'A', topic: 'Tema 01', published: false, secret: false, questions: [] },
    { id: 'b', title: 'B', topic: 'Tema 01', published: false, secret: false, questions: [] },
    { id: 'c', title: 'C', topic: 'Tema 01', published: false, secret: true,  questions: [] },
    { id: 'd', title: 'D', topic: 'Tema 02', published: false, secret: false, questions: [] },
    { id: 'e', title: 'E', topic: '',        published: true,  secret: false, questions: [] },
  ]
}

describe('bulkSetTopic', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    store = useAppStore()
    store.tests = makeTests()
    failFor.ids = []
  })

  const byId = id => store.tests.find(t => t.id === id)

  it('publica todos los tests del tema', async () => {
    await store.bulkSetTopic('Tema 01', { published: true })
    expect(byId('a').published).toBe(true)
    expect(byId('b').published).toBe(true)
  })

  it('no toca los tests de otros temas', async () => {
    await store.bulkSetTopic('Tema 01', { published: true })
    expect(byId('d').published).toBe(false)
    expect(byId('e').published).toBe(true)
  })

  it('omite los secretos al publicar, porque nunca se publican en la base', async () => {
    const r = await store.bulkSetTopic('Tema 01', { published: true })
    expect(byId('c').published).toBe(false)
    expect(r.skipped).toBe(1)
    expect(r.changed).toBe(2)
  })

  it('ocultar sí afecta también a los secretos', async () => {
    store.tests = makeTests().map(t => ({ ...t, published: true }))
    const r = await store.bulkSetTopic('Tema 01', { published: false })
    expect(r.skipped).toBe(0)
    expect(r.changed).toBe(3)
    expect(byId('c').published).toBe(false)
  })

  it('marca como secreto todo el tema', async () => {
    await store.bulkSetTopic('Tema 01', { secret: true })
    expect(byId('a').secret).toBe(true)
    expect(byId('b').secret).toBe(true)
    expect(byId('d').secret).toBe(false)
  })

  it('quita el secreto de todo el tema', async () => {
    await store.bulkSetTopic('Tema 01', { secret: false })
    expect(byId('c').secret).toBe(false)
  })

  it('informa del recuento', async () => {
    const r = await store.bulkSetTopic('Tema 01', { secret: true })
    expect(r).toMatchObject({ changed: 3, skipped: 0, failed: 0, total: 3 })
  })

  it('un tema sin tests no cambia nada', async () => {
    const r = await store.bulkSetTopic('Tema inexistente', { published: true })
    expect(r).toMatchObject({ changed: 0, total: 0 })
  })

  it('agrupa también los tests sin tema', async () => {
    const r = await store.bulkSetTopic('', { published: false })
    expect(r.changed).toBe(1)
    expect(byId('e').published).toBe(false)
  })

  it('si falla el guardado, revierte ese test y lo cuenta', async () => {
    failFor.ids = ['b']
    const r = await store.bulkSetTopic('Tema 01', { published: true })

    expect(byId('a').published).toBe(true)
    expect(byId('b').published).toBe(false) // revertido
    expect(r).toMatchObject({ changed: 1, failed: 1, skipped: 1 })
  })

  it('un fallo no impide que los demás se apliquen', async () => {
    failFor.ids = ['a']
    await store.bulkSetTopic('Tema 01', { secret: true })
    expect(byId('a').secret).toBe(false)
    expect(byId('b').secret).toBe(true)
  })
})
