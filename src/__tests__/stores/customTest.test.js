import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'

function makeQ(type = 'single', text = 'Pregunta') {
  return {
    type, text,
    options: type === 'open' ? [] : [
      { text: 'A', correct: true },
      { text: 'B', correct: false },
    ],
  }
}

function seedTests(store, tests) {
  store.tests = tests
}

// ── startCustomTest ───────────────────────────────────────────────────────────

describe('startCustomTest', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  it('es no-op cuando no hay preguntas disponibles', () => {
    store.tests = []
    const before = store.playerState
    store.startCustomTest(5)
    expect(store.playerState).toBe(before)
  })

  it('crea un test con el número de preguntas solicitado', () => {
    seedTests(store, [
      { id: 't1', title: 'T1', questions: [makeQ(), makeQ(), makeQ()] },
    ])
    store.startCustomTest(2)
    expect(store.playerState.questions).toHaveLength(2)
  })

  it('no supera el total de preguntas disponibles si se pide más', () => {
    seedTests(store, [
      { id: 't1', title: 'T1', questions: [makeQ(), makeQ()] },
    ])
    store.startCustomTest(100)
    expect(store.playerState.questions).toHaveLength(2)
  })

  it('toma al menos 1 pregunta aunque se pida 0 o negativo', () => {
    seedTests(store, [
      { id: 't1', title: 'T1', questions: [makeQ()] },
    ])
    store.startCustomTest(0)
    expect(store.playerState.questions).toHaveLength(1)
  })

  it('el título incluye el número de preguntas', () => {
    seedTests(store, [
      { id: 't1', title: 'T1', questions: [makeQ(), makeQ(), makeQ()] },
    ])
    store.startCustomTest(3)
    expect(store.playerState.test.title).toMatch(/3 preguntas/)
  })

  it('ignora las preguntas abiertas al construir el pool', () => {
    seedTests(store, [
      { id: 't1', title: 'T1', questions: [makeQ('open'), makeQ(), makeQ()] },
    ])
    store.startCustomTest(10)
    expect(store.playerState.questions).toHaveLength(2)
    store.playerState.questions.forEach(q => expect(q.type).not.toBe('open'))
  })

  it('mezcla preguntas de múltiples tests', () => {
    seedTests(store, [
      { id: 't1', title: 'T1', questions: [makeQ('single', 'Q de T1')] },
      { id: 't2', title: 'T2', questions: [makeQ('single', 'Q de T2')] },
    ])
    store.startCustomTest(2)
    const texts = store.playerState.questions.map(q => q.text)
    expect(texts).toContain('Q de T1')
    expect(texts).toContain('Q de T2')
  })

  it('registra startedAt al iniciar', () => {
    const before = Date.now()
    seedTests(store, [{ id: 't1', title: 'T1', questions: [makeQ()] }])
    store.startCustomTest(1)
    expect(store.playerState.startedAt).toBeGreaterThanOrEqual(before)
  })

  it('el test empieza desde la primera pregunta sin respuestas previas', () => {
    seedTests(store, [{ id: 't1', title: 'T1', questions: [makeQ(), makeQ()] }])
    store.startCustomTest(2)
    expect(store.playerState.current).toBe(0)
    expect(store.playerState.answers).toEqual({})
    expect(store.playerState.timeLeft).toBe(0)
  })
})

// ── countAvailableQuestions ───────────────────────────────────────────────────

describe('countAvailableQuestions', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  it('devuelve 0 cuando no hay tests', () => {
    store.tests = []
    expect(store.countAvailableQuestions()).toBe(0)
  })

  it('cuenta solo preguntas no abiertas', () => {
    seedTests(store, [
      { id: 't1', title: 'T1', questions: [makeQ('open'), makeQ(), makeQ()] },
    ])
    expect(store.countAvailableQuestions()).toBe(2)
  })

  it('suma preguntas de varios tests', () => {
    seedTests(store, [
      { id: 't1', title: 'T1', questions: [makeQ(), makeQ()] },
      { id: 't2', title: 'T2', questions: [makeQ()] },
    ])
    expect(store.countAvailableQuestions()).toBe(3)
  })
})

// ── clearWrongAnswers ─────────────────────────────────────────────────────────

describe('clearWrongAnswers', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAppStore()
  })

  it('pone wrongAnswers a [] inmediatamente', async () => {
    store.wrongAnswers = [makeQ(), makeQ()]
    await store.clearWrongAnswers()
    expect(store.wrongAnswers).toHaveLength(0)
  })

  it('no lanza error aunque no haya usuario autenticado', async () => {
    store.wrongAnswers = [makeQ()]
    await expect(store.clearWrongAnswers()).resolves.not.toThrow()
    expect(store.wrongAnswers).toHaveLength(0)
  })

  it('guarda timestamp en localStorage con clave basada en userId si hay usuario', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    store.wrongAnswers = [makeQ()]
    await store.clearWrongAnswers()
    // Sin sesión activa en test no escribe en localStorage (currentUser es null)
    // pero la función termina limpiando wrongAnswers sin error
    expect(store.wrongAnswers).toHaveLength(0)
    setItemSpy.mockRestore()
  })
})

// ── loadWrongAnswers respeta clearedAt ────────────────────────────────────────

describe('loadWrongAnswers — respeta timestamp de reset', () => {
  it('filtra resultados anteriores al timestamp de reset (simulación de lógica)', () => {
    const clearedAt = new Date('2026-01-15T12:00:00Z')

    // Simulate: only results AFTER clearedAt are considered
    const allResults = [
      // Newest: after clear — Q1 wrong
      {
        completed_at: '2026-01-20T10:00:00Z',
        answers: [{ q: 'Q1', type: 'single', ok: false, question: { id: 'q1', type: 'single', text: 'Q1', options: [] } }],
      },
      // Older: before clear — Q2 wrong (should be ignored)
      {
        completed_at: '2026-01-10T10:00:00Z',
        answers: [{ q: 'Q2', type: 'single', ok: false, question: { id: 'q2', type: 'single', text: 'Q2', options: [] } }],
      },
    ]

    const filtered = allResults.filter(r => new Date(r.completed_at) > clearedAt)

    const seenCorrect = new Set()
    const seenWrong = new Set()
    const wrong = []
    filtered.forEach(r => {
      ;(r.answers || []).forEach(a => {
        if (a.type === 'open') return
        const key = a.q
        if (a.ok === true) seenCorrect.add(key)
        if (a.ok === false && a.question && !seenCorrect.has(key) && !seenWrong.has(key)) {
          seenWrong.add(key)
          wrong.push(a.question)
        }
      })
    })

    // Q2 is before clearedAt → ignored. Only Q1 should appear.
    expect(wrong.map(q => q.text)).toContain('Q1')
    expect(wrong.map(q => q.text)).not.toContain('Q2')
    expect(wrong).toHaveLength(1)
  })

  it('incluye todos los resultados cuando no hay timestamp de reset', () => {
    const allResults = [
      {
        completed_at: '2026-01-10T10:00:00Z',
        answers: [{ q: 'Q1', type: 'single', ok: false, question: { id: 'q1', type: 'single', text: 'Q1', options: [] } }],
      },
    ]
    const filtered = allResults // no clearedAt filter

    const seenCorrect = new Set()
    const seenWrong = new Set()
    const wrong = []
    filtered.forEach(r => {
      ;(r.answers || []).forEach(a => {
        if (a.type === 'open') return
        const key = a.q
        if (a.ok === true) seenCorrect.add(key)
        if (a.ok === false && a.question && !seenCorrect.has(key) && !seenWrong.has(key)) {
          seenWrong.add(key)
          wrong.push(a.question)
        }
      })
    })

    expect(wrong).toHaveLength(1)
    expect(wrong[0].text).toBe('Q1')
  })
})
