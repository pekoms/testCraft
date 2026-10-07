/**
 * Moving a test from one topic to another.
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

describe('moveTestToTopic', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    failFor.ids = []
    store = useAppStore()
    store.tests = [
      { id: 'a', title: 'A', topic: 'Tema 01', published: true, questions: [] },
      { id: 'b', title: 'B', topic: 'Tema 01', published: false, questions: [] },
      { id: 'c', title: 'C', topic: '', published: false, questions: [] },
    ]
  })

  const byId = id => store.tests.find(t => t.id === id)

  it('cambia el tema del test', async () => {
    await store.moveTestToTopic('a', 'Tema 02')
    expect(byId('a').topic).toBe('Tema 02')
  })

  it('no deja copia en el tema de origen', async () => {
    await store.moveTestToTopic('a', 'Tema 02')
    expect(store.tests.filter(t => t.topic === 'Tema 01').map(t => t.id)).toEqual(['b'])
  })

  it('no duplica el test', async () => {
    await store.moveTestToTopic('a', 'Tema 02')
    expect(store.tests).toHaveLength(3)
    expect(store.tests.filter(t => t.id === 'a')).toHaveLength(1)
  })

  it('no toca los demás tests', async () => {
    await store.moveTestToTopic('a', 'Tema 02')
    expect(byId('b').topic).toBe('Tema 01')
    expect(byId('c').topic).toBe('')
  })

  it('conserva el resto de propiedades del test', async () => {
    await store.moveTestToTopic('a', 'Tema 02')
    expect(byId('a')).toMatchObject({ id: 'a', title: 'A', published: true })
  })

  it('admite un tema que todavía no existe', async () => {
    await store.moveTestToTopic('b', 'Tema 99. Nuevo')
    expect(byId('b').topic).toBe('Tema 99. Nuevo')
  })

  it('mueve también un test que no tenía tema', async () => {
    await store.moveTestToTopic('c', 'Tema 01')
    expect(byId('c').topic).toBe('Tema 01')
  })

  it('recorta los espacios del tema destino', async () => {
    await store.moveTestToTopic('a', '  Tema 02  ')
    expect(byId('a').topic).toBe('Tema 02')
  })

  it('mover al mismo tema no es un error', async () => {
    expect(await store.moveTestToTopic('a', 'Tema 01')).toBe(true)
    expect(byId('a').topic).toBe('Tema 01')
  })

  it('un id inexistente devuelve false', async () => {
    expect(await store.moveTestToTopic('zzz', 'Tema 02')).toBe(false)
  })

  it('si falla el guardado, el test se queda en su tema original', async () => {
    failFor.ids = ['a']
    expect(await store.moveTestToTopic('a', 'Tema 02')).toBe(false)
    expect(byId('a').topic).toBe('Tema 01')
  })
})
