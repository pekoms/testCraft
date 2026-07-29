import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'

const Q_SINGLE = {
  type: 'single', text: 'Q única?',
  options: [{ text: 'A', correct: true }, { text: 'B', correct: false }],
}
const Q_MULTI = {
  type: 'multiple', text: 'Q múltiple?',
  options: [{ text: 'C', correct: true }, { text: 'D', correct: true }, { text: 'E', correct: false }],
}

function initPlayer(store, overrides = {}) {
  store.playerState = {
    test: { id: 't1', title: 'Test' },
    questions: [Q_SINGLE, Q_MULTI],
    answers: {},
    revealed: {},
    current: 0,
    timerInterval: null,
    timeLeft: 0,
    ...overrides,
  }
}

describe('selectOption — opción única', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
    initPlayer(store)
  })

  it('registra la respuesta seleccionada', () => {
    store.selectOption(0)
    expect(store.playerState.answers[0]).toEqual([0])
  })

  it('auto-revela al seleccionar en pregunta de opción única', () => {
    store.selectOption(1)
    expect(store.playerState.revealed[0]).toBe(true)
  })

  it('no permite cambiar respuesta después de revelar', () => {
    store.selectOption(0) // selecciona A, se revela
    store.selectOption(1) // intenta cambiar a B
    expect(store.playerState.answers[0]).toEqual([0]) // sigue siendo A
  })
})

describe('selectOption — opción múltiple', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
    initPlayer(store, { current: 1 })
  })

  it('acumula opciones al seleccionar varias', () => {
    store.selectOption(0) // C
    store.selectOption(1) // D
    expect(store.playerState.answers[1]).toEqual([0, 1])
  })

  it('elimina la opción si ya estaba seleccionada (toggle)', () => {
    store.selectOption(0)
    store.selectOption(1)
    store.selectOption(0) // deselecciona C
    expect(store.playerState.answers[1]).toEqual([1])
  })

  it('NO revela automáticamente en opción múltiple', () => {
    store.selectOption(0)
    expect(store.playerState.revealed[1]).toBeFalsy()
  })
})

describe('navegación entre preguntas', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
    initPlayer(store)
  })

  it('nextQuestion avanza el índice', () => {
    store.nextQuestion()
    expect(store.playerState.current).toBe(1)
  })

  it('prevQuestion retrocede el índice', () => {
    initPlayer(store, { current: 1 })
    store.prevQuestion()
    expect(store.playerState.current).toBe(0)
  })

  it('prevQuestion no va por debajo de 0', () => {
    expect(store.playerState.current).toBe(0)
    store.prevQuestion()
    expect(store.playerState.current).toBe(0)
  })

  it('nextQuestion en la última pregunta llama a finishTest', () => {
    initPlayer(store, { current: 1 }) // última pregunta (índice 1 de 2)
    store.nextQuestion()
    // si llama a finishTest, resultData se rellena y router.push es llamado
    expect(store.resultData).not.toBeNull()
  })
})

describe('saveCurrentAnswer — texto libre', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
    initPlayer(store, {
      questions: [{ type: 'open', text: 'Q?', options: [] }],
      current: 0,
    })
  })

  it('guarda el texto de respuesta abierta', () => {
    store.saveCurrentAnswer('Mi respuesta')
    expect(store.playerState.answers[0]).toBe('Mi respuesta')
  })

  it('guarda null si el texto está vacío', () => {
    store.saveCurrentAnswer('   ')
    expect(store.playerState.answers[0]).toBeNull()
  })
})
