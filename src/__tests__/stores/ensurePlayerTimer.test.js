/**
 * The countdown for a timed test lives entirely in the store (clockTick +
 * ensurePlayerTimer), not as a component-local interval — it must keep
 * running, and keep being resumable, whether or not PlayerView is mounted:
 * the user can browse to Leyes mid-test and come back to the same question.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'

function timedPlayer(store, msLeft) {
  store.playerState = {
    test: { id: 't1', title: 'Test con tiempo' },
    questions: [{ type: 'single', text: 'Q', options: [{ text: 'A', correct: true }] }],
    answers: {}, revealed: {}, current: 0,
    timerInterval: null,
    deadline: Date.now() + msLeft,
  }
}

describe('ensurePlayerTimer', () => {
  let store

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    store = useAppStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('no crea intervalo si no hay deadline', () => {
    store.playerState = { test: { id: 't1' }, questions: [], answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null }
    store.ensurePlayerTimer()
    expect(store.playerState.timerInterval).toBeNull()
  })

  it('crea un intervalo cuando hay deadline', () => {
    timedPlayer(store, 60_000)
    store.ensurePlayerTimer()
    expect(store.playerState.timerInterval).not.toBeNull()
  })

  it('es idempotente: llamarlo dos veces no reemplaza el intervalo existente', () => {
    timedPlayer(store, 60_000)
    store.ensurePlayerTimer()
    const first = store.playerState.timerInterval
    store.ensurePlayerTimer()
    expect(store.playerState.timerInterval).toBe(first)
  })

  it('clockTick avanza cada segundo mientras el test está activo', () => {
    timedPlayer(store, 60_000)
    store.ensurePlayerTimer()
    const before = store.clockTick
    vi.advanceTimersByTime(3000)
    expect(store.clockTick).toBe(before + 3)
  })

  it('al agotarse el tiempo, limpia el intervalo', () => {
    timedPlayer(store, 2000)
    store.ensurePlayerTimer()
    vi.advanceTimersByTime(2500)
    expect(store.playerState.timerInterval).toBeNull()
  })

  it('al agotarse el tiempo, termina el test automáticamente', () => {
    timedPlayer(store, 1000)
    store.ensurePlayerTimer()
    vi.advanceTimersByTime(1500)
    expect(store.playerState.test).toBeNull() // finishTest() vacía playerState
    expect(store.resultData).not.toBeNull()
  })

  it('tras remontar PlayerView (llamada repetida), el reloj sigue corriendo sin duplicarse', () => {
    // Simula: onMounted llama ensurePlayerTimer, el usuario navega a Leyes y
    // vuelve, onMounted se ejecuta de nuevo con el mismo playerState vivo.
    timedPlayer(store, 60_000)
    store.ensurePlayerTimer() // primer montaje
    vi.advanceTimersByTime(5000)
    store.ensurePlayerTimer() // "remontaje" tras volver de Leyes — no-op
    vi.advanceTimersByTime(5000)
    expect(store.clockTick).toBe(10)
  })
})

describe('restorePlayer — recrea el cronómetro tras una recarga', () => {
  let store

  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    store = useAppStore()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('un test con deadline guardado recrea el intervalo al restaurar', () => {
    const saved = {
      test: { id: 't1', title: 'T' },
      questions: [{ type: 'single', text: 'Q', options: [{ text: 'A', correct: true }] }],
      answers: {}, revealed: {}, current: 0,
      deadline: Date.now() + 60_000,
    }
    localStorage.setItem('testcraft_player_v1', JSON.stringify(saved))
    store.restorePlayer()
    expect(store.playerState.timerInterval).not.toBeNull()
  })

  it('un test sin deadline no crea intervalo al restaurar', () => {
    const saved = {
      test: { id: 't1', title: 'T' },
      questions: [{ type: 'single', text: 'Q', options: [{ text: 'A', correct: true }] }],
      answers: {}, revealed: {}, current: 0,
      deadline: null,
    }
    localStorage.setItem('testcraft_player_v1', JSON.stringify(saved))
    store.restorePlayer()
    expect(store.playerState.timerInterval).toBeNull()
  })
})
