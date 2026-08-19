import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useGrammarCheck } from '@/composables/useGrammarCheck'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQ(text, options = []) {
  return { type: options.length ? 'single' : 'open', text, options }
}

function makeOpt(text, correct = false) { return { text, correct } }

// Build a fake LanguageTool response with a match at an absolute offset in the flat text.
function ltResponse(matches = []) {
  return { matches: matches.map(m => ({
    offset: m.offset,
    length: m.length,
    message: m.message || 'Error ortográfico',
    shortMessage: m.shortMessage || 'Ortografía',
    replacements: (m.replacements || []).map(v => ({ value: v })),
    rule: { id: 'SPELL', description: 'Spelling' },
    context: { text: 'context', offset: 0, length: 1 },
  })) }
}

// ── Offset mapping logic (isolated, no fetch) ─────────────────────────────────

describe('useGrammarCheck — offset mapping (lógica pura)', () => {
  it('mapea una coincidencia en la primera pregunta', () => {
    // Q1: "Hola mundo" (10 chars)
    // Match at offset 5, length 5 → "mundo" → local offset 5 in Q1.text
    const questions = [makeQ('Hola mundo', [makeOpt('A', true), makeOpt('B')])]
    // Simulate what check() does internally:
    const SEP = '\n\n'
    const segments = []
    const parts = []
    let offset = 0
    questions.forEach((q, qi) => {
      const qText = q.text.trim()
      segments.push({ questionIdx: qi, field: 'text', label: `P${qi + 1} · Pregunta`, startOffset: offset, endOffset: offset + qText.length })
      parts.push(qText)
      offset += qText.length + SEP.length
      q.options.forEach((opt, oi) => {
        const optText = opt.text.trim()
        if (optText) {
          segments.push({ questionIdx: qi, field: `opt_${oi}`, label: `P${qi + 1} · Opción ${oi + 1}`, startOffset: offset, endOffset: offset + optText.length })
          parts.push(optText)
          offset += optText.length + SEP.length
        }
      })
    })

    const match = { offset: 5, length: 5 }
    const seg = segments.find(s => match.offset >= s.startOffset && match.offset < s.endOffset)
    expect(seg).toBeDefined()
    expect(seg.field).toBe('text')
    expect(seg.questionIdx).toBe(0)
    expect(match.offset - seg.startOffset).toBe(5)
  })

  it('mapea una coincidencia en la opción de una pregunta', () => {
    // Q1.text: "Pregunta" (8 chars), SEP (2), Q1.opt0: "Respuesa" (8 chars)
    const questions = [makeQ('Pregunta', [makeOpt('Respuesa', true), makeOpt('No')])]
    const SEP = '\n\n'
    const segments = []
    const parts = []
    let offset = 0
    questions.forEach((q, qi) => {
      const qText = q.text.trim()
      segments.push({ questionIdx: qi, field: 'text', startOffset: offset, endOffset: offset + qText.length })
      parts.push(qText)
      offset += qText.length + SEP.length
      q.options.forEach((opt, oi) => {
        const optText = opt.text.trim()
        segments.push({ questionIdx: qi, field: `opt_${oi}`, startOffset: offset, endOffset: offset + optText.length })
        parts.push(optText)
        offset += optText.length + SEP.length
      })
    })

    // "Respuesa" starts at offset 10 (8 + 2). Match at offset 10.
    const matchOffset = 10
    const seg = segments.find(s => matchOffset >= s.startOffset && matchOffset < s.endOffset)
    expect(seg?.field).toBe('opt_0')
    expect(seg?.questionIdx).toBe(0)
    expect(matchOffset - seg.startOffset).toBe(0)
  })

  it('una coincidencia en el separador no se asigna a ningún segmento', () => {
    const questions = [makeQ('Hola', [makeOpt('A', true)]), makeQ('Mundo', [makeOpt('B', true)])]
    const SEP = '\n\n'
    const segments = []
    let offset = 0
    questions.forEach((q, qi) => {
      const qText = q.text.trim()
      segments.push({ questionIdx: qi, field: 'text', startOffset: offset, endOffset: offset + qText.length })
      offset += qText.length + SEP.length
      q.options.forEach((opt, oi) => {
        const optText = opt.text.trim()
        segments.push({ questionIdx: qi, field: `opt_${oi}`, startOffset: offset, endOffset: offset + optText.length })
        offset += optText.length + SEP.length
      })
    })

    // "Hola" ends at 4. Separator is at 4-5. Match inside separator.
    const sepOffset = 4
    const seg = segments.find(s => sepOffset >= s.startOffset && sepOffset < s.endOffset)
    expect(seg).toBeUndefined()
  })
})

// ── apply ─────────────────────────────────────────────────────────────────────

describe('useGrammarCheck — apply', () => {
  let gc

  beforeEach(() => { gc = useGrammarCheck() })

  it('aplica la primera sugerencia al texto de la pregunta', () => {
    const questions = [makeQ('Hola mundoo', [makeOpt('A', true)])]
    gc.suggestions.value = [{
      questionIdx: 0, field: 'text', label: 'P1 · Pregunta',
      offset: 5, length: 6, message: 'Error', replacements: ['mundo'], original: 'mundoo',
    }]
    gc.apply(0, questions)
    expect(questions[0].text).toBe('Hola mundo')
    expect(gc.suggestions.value).toHaveLength(0)
  })

  it('aplica la sugerencia al texto de una opción', () => {
    const questions = [{ type: 'single', text: 'Q', options: [makeOpt('Respuesa', true), makeOpt('No')] }]
    gc.suggestions.value = [{
      questionIdx: 0, field: 'opt_0', label: 'P1 · Opción 1',
      offset: 0, length: 8, message: 'Error', replacements: ['Respuesta'], original: 'Respuesa',
    }]
    gc.apply(0, questions)
    expect(questions[0].options[0].text).toBe('Respuesta')
    expect(gc.suggestions.value).toHaveLength(0)
  })

  it('elimina solo la sugerencia aplicada, deja las demás intactas', () => {
    const questions = [makeQ('Hola mundoo ottro', [makeOpt('A', true)])]
    gc.suggestions.value = [
      { questionIdx: 0, field: 'text', offset: 5, length: 6, message: 'E1', replacements: ['mundo'], original: 'mundoo' },
      { questionIdx: 0, field: 'text', offset: 12, length: 5, message: 'E2', replacements: ['otro'], original: 'ottro' },
    ]
    gc.apply(0, questions)
    expect(gc.suggestions.value).toHaveLength(1)
    expect(gc.suggestions.value[0].original).toBe('ottro')
  })

  it('no lanza error si el índice no existe', () => {
    const questions = [makeQ('Texto')]
    gc.suggestions.value = []
    expect(() => gc.apply(0, questions)).not.toThrow()
  })
})

// ── applyAll ──────────────────────────────────────────────────────────────────

describe('useGrammarCheck — applyAll', () => {
  let gc

  beforeEach(() => { gc = useGrammarCheck() })

  it('aplica todas las sugerencias y vacía la lista', () => {
    const questions = [makeQ('Hola mundoo', [makeOpt('Respuesa', true)])]
    gc.suggestions.value = [
      { questionIdx: 0, field: 'text', offset: 5, length: 6, replacements: ['mundo'], original: 'mundoo', message: '' },
      { questionIdx: 0, field: 'opt_0', offset: 0, length: 8, replacements: ['Respuesta'], original: 'Respuesa', message: '' },
    ]
    gc.applyAll(questions)
    expect(questions[0].text).toBe('Hola mundo')
    expect(questions[0].options[0].text).toBe('Respuesta')
    expect(gc.suggestions.value).toHaveLength(0)
  })

  it('aplica sugerencias en un campo back-to-front para preservar offsets', () => {
    // "Holaa mundoo": "Holaa"→"Hola" at offset 0 (len 5), "mundoo"→"mundo" at offset 6 (len 6).
    // If applied first-to-last the first fix shifts offset 6 → wrong. Must apply back-to-front.
    const questions = [makeQ('Holaa mundoo')]
    gc.suggestions.value = [
      { questionIdx: 0, field: 'text', offset: 0, length: 5, replacements: ['Hola'], original: 'Holaa', message: '' },
      { questionIdx: 0, field: 'text', offset: 6, length: 6, replacements: ['mundo'], original: 'mundoo', message: '' },
    ]
    gc.applyAll(questions)
    expect(questions[0].text).toBe('Hola mundo')
  })
})

// ── dismiss ───────────────────────────────────────────────────────────────────

describe('useGrammarCheck — dismiss', () => {
  let gc

  beforeEach(() => { gc = useGrammarCheck() })

  it('elimina la sugerencia indicada sin modificar el texto', () => {
    const questions = [makeQ('Hola mundoo')]
    gc.suggestions.value = [
      { questionIdx: 0, field: 'text', offset: 5, length: 6, replacements: ['mundo'], original: 'mundoo', message: '' },
    ]
    gc.dismiss(0)
    expect(gc.suggestions.value).toHaveLength(0)
    expect(questions[0].text).toBe('Hola mundoo') // unchanged
  })
})

// ── clear ─────────────────────────────────────────────────────────────────────

describe('useGrammarCheck — clear', () => {
  let gc

  beforeEach(() => { gc = useGrammarCheck() })

  it('vacía sugerencias y el error', () => {
    gc.suggestions.value = [{ questionIdx: 0, field: 'text', offset: 0, length: 1, replacements: ['x'], original: 'y', message: '' }]
    gc.ltError.value = 'Error de conexión'
    gc.clear()
    expect(gc.suggestions.value).toHaveLength(0)
    expect(gc.ltError.value).toBeNull()
  })
})

// ── check (fetch mocked) ──────────────────────────────────────────────────────

describe('useGrammarCheck — check (fetch mocked)', () => {
  let gc

  beforeEach(() => { gc = useGrammarCheck() })
  afterEach(() => { vi.restoreAllMocks() })

  it('llama a LanguageTool y mapea los resultados a sugerencias', async () => {
    // Q: "Hola mundoo" (11 chars). Match at offset 5, length 6 → "mundoo" → replace with "mundo".
    const questions = [makeQ('Hola mundoo', [makeOpt('A', true)])]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ltResponse([{ offset: 5, length: 6, replacements: ['mundo'], message: 'Error ortográfico' }]),
    }))
    await gc.check(questions)
    expect(gc.suggestions.value).toHaveLength(1)
    expect(gc.suggestions.value[0].original).toBe('mundoo')
    expect(gc.suggestions.value[0].replacements).toEqual(['mundo'])
    expect(gc.suggestions.value[0].field).toBe('text')
    expect(gc.suggestions.value[0].questionIdx).toBe(0)
  })

  it('ignora coincidencias sin sugerencias de reemplazo', async () => {
    const questions = [makeQ('Pregunta', [makeOpt('A', true)])]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ltResponse([{ offset: 0, length: 8, replacements: [], message: 'Estilo' }]),
    }))
    await gc.check(questions)
    expect(gc.suggestions.value).toHaveLength(0)
  })

  it('pone ltError cuando fetch falla', async () => {
    const questions = [makeQ('Texto', [makeOpt('A', true)])]
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    await gc.check(questions)
    expect(gc.ltError.value).toBeTruthy()
    expect(gc.suggestions.value).toHaveLength(0)
  })

  it('pone ltError cuando la API devuelve un status de error', async () => {
    const questions = [makeQ('Texto', [makeOpt('A', true)])]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await gc.check(questions)
    expect(gc.ltError.value).toBeTruthy()
  })

  it('no llama a fetch si no hay texto en las preguntas', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await gc.check([makeQ('', [makeOpt('', true)])])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('checking es true durante la llamada y false al terminar', async () => {
    const questions = [makeQ('Texto', [makeOpt('A', true)])]
    let wasChecking = false
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      wasChecking = gc.checking.value
      return { ok: true, json: async () => ltResponse([]) }
    }))
    await gc.check(questions)
    expect(wasChecking).toBe(true)
    expect(gc.checking.value).toBe(false)
  })

  it('incluye el texto de preguntas abiertas pero no sus opciones', async () => {
    const questions = [
      { type: 'open', text: 'PreguntaAbierta', options: [] },
      makeQ('PreguntaCerrada', [makeOpt('A', true)]),
    ]
    let capturedBody = ''
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_, opts) => {
      capturedBody = decodeURIComponent(opts.body.toString().replace(/\+/g, ' '))
      return { ok: true, json: async () => ltResponse([]) }
    }))
    await gc.check(questions)
    expect(capturedBody).toContain('PreguntaAbierta')
    expect(capturedBody).toContain('PreguntaCerrada')
  })
})
