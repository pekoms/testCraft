import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'

function makeQuestion(correctFlags, text = 'Pregunta?') {
  return {
    type: 'single',
    text,
    options: correctFlags.map((correct, i) => ({ text: String.fromCharCode(65 + i), correct })),
  }
}

function buildResultData(reviewItems) {
  return {
    pct: 50, correct: 1, total: 2,
    test: { id: 'test1', title: 'Matemáticas', questions: [] },
    durationSeconds: null,
    reviewItems,
  }
}

describe('retryWrongOnly', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  it('no lanza error cuando resultData es null', () => {
    store.resultData = null
    expect(() => store.retryWrongOnly()).not.toThrow()
  })

  it('no modifica playerState cuando no hay preguntas incorrectas', () => {
    const q = makeQuestion([true, false], 'Correcta')
    store.resultData = buildResultData([
      { q, ans: [0], correctIndices: [0], isCorrect: true },
    ])
    const before = store.playerState
    store.retryWrongOnly()
    expect(store.playerState).toBe(before)
  })

  it('establece playerState solo con las preguntas incorrectas', () => {
    const q1 = makeQuestion([true, false], 'Correcta')
    const q2 = makeQuestion([false, true], 'Incorrecta')
    store.resultData = buildResultData([
      { q: q1, ans: [0], correctIndices: [0], isCorrect: true },
      { q: q2, ans: [0], correctIndices: [1], isCorrect: false },
    ])
    store.retryWrongOnly()
    expect(store.playerState.questions).toHaveLength(1)
    expect(store.playerState.questions[0].text).toBe('Incorrecta')
  })

  it('ignora las preguntas abiertas aunque estén sin responder', () => {
    const openQ = { type: 'open', text: 'Abierta', options: [] }
    const closedQ = makeQuestion([false, true], 'Cerrada incorrecta')
    store.resultData = buildResultData([
      { q: openQ, ans: '', type: 'open' },
      { q: closedQ, ans: [0], correctIndices: [1], isCorrect: false },
    ])
    store.retryWrongOnly()
    expect(store.playerState.questions).toHaveLength(1)
    expect(store.playerState.questions[0].text).toBe('Cerrada incorrecta')
  })

  it('mantiene el id y título del test original', () => {
    const q = makeQuestion([false, true], 'Incorrecta')
    store.resultData = buildResultData([
      { q, ans: [0], correctIndices: [1], isCorrect: false },
    ])
    store.retryWrongOnly()
    expect(store.playerState.test.id).toBe('test1')
    expect(store.playerState.test.title).toBe('Matemáticas')
  })

  it('registra startedAt para poder calcular la duración del reintento', () => {
    const before = Date.now()
    const q = makeQuestion([false, true], 'Incorrecta')
    store.resultData = buildResultData([
      { q, ans: [0], correctIndices: [1], isCorrect: false },
    ])
    store.retryWrongOnly()
    expect(store.playerState.startedAt).toBeGreaterThanOrEqual(before)
  })

  it('inicia con timeLeft 0 (sin límite de tiempo en modo retry)', () => {
    const q = makeQuestion([false, true], 'Incorrecta')
    store.resultData = buildResultData([
      { q, ans: [0], correctIndices: [1], isCorrect: false },
    ])
    store.retryWrongOnly()
    expect(store.playerState.timeLeft).toBe(0)
  })
})

describe('startWrongAnswersTest', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  it('es no-op cuando wrongAnswers está vacío', async () => {
    store.wrongAnswers = []
    const before = store.playerState
    await store.startWrongAnswersTest()
    expect(store.playerState).toBe(before)
  })

  it('crea un test llamado Repaso de errores con todas las preguntas', async () => {
    const q1 = makeQuestion([true, false], 'Q1')
    const q2 = makeQuestion([false, true], 'Q2')
    store.wrongAnswers = [q1, q2]
    await store.startWrongAnswersTest()
    expect(store.playerState.questions).toHaveLength(2)
    expect(store.playerState.test.title).toBe('Repaso de errores')
  })

  it('registra startedAt al iniciar el repaso', async () => {
    const before = Date.now()
    store.wrongAnswers = [makeQuestion([true, false], 'Q')]
    await store.startWrongAnswersTest()
    expect(store.playerState.startedAt).toBeGreaterThanOrEqual(before)
  })

  it('el test sintético no tiene timeLeft (no hay límite de tiempo)', async () => {
    store.wrongAnswers = [makeQuestion([true, false], 'Q')]
    await store.startWrongAnswersTest()
    expect(store.playerState.timeLeft).toBe(0)
  })
})

describe('loadWrongAnswers — sin sesión activa', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  it('vacía wrongAnswers cuando no hay supabase ni usuario autenticado', async () => {
    store.wrongAnswers = [{ id: 'q1', text: 'preset' }]
    await store.loadWrongAnswers()
    expect(store.wrongAnswers).toHaveLength(0)
  })

  it('no lanza error cuando se llama sin sesión', async () => {
    await expect(store.loadWrongAnswers()).resolves.not.toThrow()
  })
})
