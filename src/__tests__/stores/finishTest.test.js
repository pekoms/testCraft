import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'

// Helpers
function makeQuestion(type, correctFlags, text = 'Pregunta?') {
  return {
    type,
    text,
    options: correctFlags.map((correct, i) => ({
      text: String.fromCharCode(65 + i), // A, B, C...
      correct,
    })),
  }
}

function setupPlayer(store, questions, answers) {
  store.playerState = {
    test: { id: 'test1', title: 'Test de ejemplo' },
    questions,
    answers,
    revealed: {},
    current: questions.length - 1,
    timerInterval: null,
    timeLeft: 0,
  }
}

describe('finishTest — cálculo de puntuación', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  it('100% cuando todas las respuestas de opción única son correctas', () => {
    setupPlayer(
      store,
      [makeQuestion('single', [true, false]), makeQuestion('single', [false, true])],
      { 0: [0], 1: [1] },
    )
    store.finishTest()
    expect(store.resultData.pct).toBe(100)
    expect(store.resultData.correct).toBe(2)
    expect(store.resultData.total).toBe(2)
  })

  it('50% cuando una de dos respuestas es incorrecta', () => {
    setupPlayer(
      store,
      [makeQuestion('single', [true, false]), makeQuestion('single', [false, true])],
      { 0: [0], 1: [0] }, // la segunda es incorrecta (correcta sería índice 1)
    )
    store.finishTest()
    expect(store.resultData.pct).toBe(50)
    expect(store.resultData.correct).toBe(1)
  })

  it('0% cuando todas las respuestas son incorrectas', () => {
    setupPlayer(
      store,
      [makeQuestion('single', [true, false]), makeQuestion('single', [false, true])],
      { 0: [1], 1: [0] },
    )
    store.finishTest()
    expect(store.resultData.pct).toBe(0)
    expect(store.resultData.correct).toBe(0)
  })

  it('0% cuando no hay ninguna respuesta', () => {
    setupPlayer(
      store,
      [makeQuestion('single', [true, false]), makeQuestion('single', [false, true])],
      {},
    )
    store.finishTest()
    expect(store.resultData.pct).toBe(0)
    expect(store.resultData.correct).toBe(0)
    expect(store.resultData.total).toBe(2)
  })

  it('las preguntas abiertas no cuentan en el porcentaje', () => {
    setupPlayer(
      store,
      [
        makeQuestion('open', [], 'Pregunta abierta'),
        makeQuestion('single', [true, false]),
      ],
      { 0: 'mi respuesta', 1: [0] }, // 1 correcta de 1 cerrada
    )
    store.finishTest()
    expect(store.resultData.pct).toBe(100)
    expect(store.resultData.total).toBe(1)
  })

  it('pct es null cuando todas las preguntas son abiertas', () => {
    setupPlayer(
      store,
      [makeQuestion('open', [], 'Q1'), makeQuestion('open', [], 'Q2')],
      { 0: 'respuesta 1', 1: 'respuesta 2' },
    )
    store.finishTest()
    expect(store.resultData.pct).toBeNull()
    expect(store.resultData.total).toBe(0)
  })

  it('opción múltiple: correcto solo si se seleccionan TODAS las opciones correctas', () => {
    const q = makeQuestion('multiple', [true, true, false]) // A y B correctas, C incorrecta
    setupPlayer(store, [q], { 0: [0, 1] }) // selecciona A y B
    store.finishTest()
    expect(store.resultData.pct).toBe(100)
  })

  it('opción múltiple: selección parcial cuenta como incorrecta', () => {
    const q = makeQuestion('multiple', [true, true, false]) // A y B correctas
    setupPlayer(store, [q], { 0: [0] }) // solo selecciona A, falta B
    store.finishTest()
    expect(store.resultData.pct).toBe(0)
  })

  it('opción múltiple: seleccionar opción incorrecta extra cuenta como incorrecta', () => {
    const q = makeQuestion('multiple', [true, false]) // solo A correcta
    setupPlayer(store, [q], { 0: [0, 1] }) // selecciona A y B (B no debería estar)
    store.finishTest()
    expect(store.resultData.pct).toBe(0)
  })

  it('reviewItems incluye todas las preguntas con tipo correcto', () => {
    setupPlayer(
      store,
      [makeQuestion('open', [], 'Abierta'), makeQuestion('single', [true, false])],
      { 0: 'texto', 1: [0] },
    )
    store.finishTest()
    const items = store.resultData.reviewItems
    expect(items).toHaveLength(2)
    expect(items[0].type).toBe('open')
    expect(items[1].type).toBeUndefined() // las cerradas no tienen campo type
    expect(items[1].isCorrect).toBe(true)
  })

  it('mezcla de cerradas y abiertas calcula pct solo sobre las cerradas', () => {
    setupPlayer(
      store,
      [
        makeQuestion('open', [], 'Open 1'),
        makeQuestion('single', [true, false]), // correcta
        makeQuestion('open', [], 'Open 2'),
        makeQuestion('single', [false, true]), // incorrecta (responde 0, correcta es 1)
      ],
      { 0: 'resp', 1: [0], 2: 'resp2', 3: [0] },
    )
    store.finishTest()
    expect(store.resultData.total).toBe(2)
    expect(store.resultData.correct).toBe(1)
    expect(store.resultData.pct).toBe(50)
  })
})

describe('finishTest — durationSeconds', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  it('durationSeconds es null cuando playerState no tiene startedAt', () => {
    setupPlayer(store, [makeQuestion('single', [true, false])], { 0: [0] })
    store.finishTest()
    expect(store.resultData.durationSeconds).toBeNull()
  })

  it('durationSeconds se calcula en segundos desde startedAt', () => {
    store.playerState = {
      test: { id: 't1', title: 'T' },
      questions: [makeQuestion('single', [true, false])],
      answers: { 0: [0] },
      revealed: {}, current: 0, timerInterval: null, timeLeft: 0,
      startedAt: Date.now() - 5000,
    }
    store.finishTest()
    expect(store.resultData.durationSeconds).toBeGreaterThanOrEqual(4)
    expect(store.resultData.durationSeconds).toBeLessThanOrEqual(8)
  })

  it('resultData expone durationSeconds junto al resto de campos', () => {
    store.playerState = {
      test: { id: 't1', title: 'T' },
      questions: [makeQuestion('single', [true, false])],
      answers: { 0: [0] },
      revealed: {}, current: 0, timerInterval: null, timeLeft: 0,
      startedAt: Date.now() - 3000,
    }
    store.finishTest()
    const rd = store.resultData
    expect(rd).toHaveProperty('pct')
    expect(rd).toHaveProperty('durationSeconds')
    expect(typeof rd.durationSeconds).toBe('number')
  })
})
