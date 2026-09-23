/**
 * An in-progress test must survive a reload: mobile browsers discard
 * backgrounded tabs and the OS kills the PWA to reclaim memory.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'

const PLAYER_KEY = 'testcraft_player_v1'

const TEST = {
  id: 't1',
  title: 'Simulacro TREBEP',
  timeLimit: 30,
  questions: [
    { id: 'q1', type: 'single', text: 'P1', options: [{ text: 'a', correct: true }, { text: 'b', correct: false }] },
    { id: 'q2', type: 'single', text: 'P2', options: [{ text: 'a', correct: false }, { text: 'b', correct: true }] },
    { id: 'q3', type: 'single', text: 'P3', options: [{ text: 'a', correct: true }, { text: 'b', correct: false }] },
  ],
}

function saved() {
  const raw = localStorage.getItem(PLAYER_KEY)
  return raw ? JSON.parse(raw) : null
}

describe('test en curso — persistencia', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    store = useAppStore()
    store.tests = [TEST]
  })

  it('al empezar un test queda guardado', async () => {
    await store.startTest('t1')
    expect(saved()?.test?.id).toBe('t1')
    expect(saved().questions).toHaveLength(3)
  })

  it('guarda la respuesta elegida', async () => {
    await store.startTest('t1')
    store.selectOption(0)
    expect(saved().answers['0']).toEqual([0])
  })

  it('guarda la pregunta en la que vas', async () => {
    await store.startTest('t1')
    store.selectOption(0)
    store.nextQuestion()
    expect(saved().current).toBe(1)
  })

  it('no guarda el identificador del temporizador', async () => {
    await store.startTest('t1')
    expect(saved()).not.toHaveProperty('timerInterval')
  })

  it('restaurar devuelve el test con sus respuestas y su posición', async () => {
    await store.startTest('t1')
    store.selectOption(0)
    store.nextQuestion()
    store.selectOption(1)

    // Simula la recarga: el estado en memoria se pierde, localStorage no
    setActivePinia(createPinia())
    const fresh = useAppStore()
    expect(fresh.playerState.test).toBe(null)

    expect(fresh.restorePlayer()).toBe(true)
    expect(fresh.playerState.test.id).toBe('t1')
    expect(fresh.playerState.current).toBe(1)
    expect(fresh.playerState.answers['0']).toEqual([0])
    expect(fresh.playerState.answers['1']).toEqual([1])
  })

  it('restaurar sin nada guardado devuelve false', () => {
    expect(store.restorePlayer()).toBe(false)
  })

  it('restaurar con datos corruptos devuelve false y no lanza', () => {
    localStorage.setItem(PLAYER_KEY, '{ esto no es json')
    expect(store.restorePlayer()).toBe(false)
  })

  it('al terminar el test se borra lo guardado', async () => {
    await store.startTest('t1')
    store.selectOption(0)
    expect(saved()).not.toBe(null)

    await store.finishTest()
    expect(saved()).toBe(null)
  })

  it('terminado el test, restaurar ya no devuelve nada', async () => {
    await store.startTest('t1')
    await store.finishTest()
    expect(store.restorePlayer()).toBe(false)
  })
})

describe('test en curso — el temporizador es un instante límite', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    store = useAppStore()
    store.tests = [TEST]
  })

  it('guarda un instante futuro, no un contador de segundos', async () => {
    const before = Date.now()
    await store.startTest('t1')
    const { deadline } = store.playerState
    expect(deadline).toBeGreaterThanOrEqual(before + 30 * 60_000)
    expect(deadline).toBeLessThan(before + 30 * 60_000 + 5_000)
  })

  it('el tiempo corre aunque la pestaña esté en segundo plano', async () => {
    await store.startTest('t1')
    const deadline = store.playerState.deadline

    // Diez minutos fuera de la app: ningún tick se ejecuta
    vi.spyOn(Date, 'now').mockReturnValue(deadline - 20 * 60_000)
    const left = Math.round((deadline - Date.now()) / 1000)
    expect(left).toBe(20 * 60) // quedan 20, no los 30 del inicio
    Date.now.mockRestore()
  })

  it('el instante límite sobrevive a la recarga', async () => {
    await store.startTest('t1')
    const deadline = store.playerState.deadline

    setActivePinia(createPinia())
    const fresh = useAppStore()
    fresh.restorePlayer()

    expect(fresh.playerState.deadline).toBe(deadline)
  })

  it('un test sin límite de tiempo no tiene instante límite', async () => {
    store.tests = [{ ...TEST, timeLimit: 0 }]
    await store.startTest('t1')
    expect(store.playerState.deadline).toBe(null)
  })
})
