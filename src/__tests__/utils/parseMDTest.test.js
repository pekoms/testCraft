import { describe, it, expect } from 'vitest'
import { parseMDTest } from '@/utils/parseMDTest'

// Format A: options on separate lines, solutions on separate lines
const FORMAT_A = `
1. ¿Cuál es la capital de España?
A) Barcelona
B) Madrid
C) Sevilla
D) Valencia

2. ¿Cuántos colores tiene el arcoíris?
A) Cinco
B) Seis
C) Siete
D) Ocho

HOJA DE SOLUCIONES
1 B
2 C
`

// Format B: options inline on same line as question, solutions on same line as header
const FORMAT_B = `
1. ¿Cuál es la capital de España? A) Barcelona B) Madrid C) Sevilla D) Valencia

2. ¿Cuántos colores tiene el arcoíris? A) Cinco B) Seis C) Siete D) Ocho

HOJA DE SOLUCIONES 1 B 2 C
`

// Format B with 30 questions (simulate the LGTBI law exam)
const FORMAT_B_LONG = `
1. Según el artículo 1, ¿cuál es la finalidad de la ley? A) Opción errónea 1 B) Opción correcta C) Opción errónea 3 D) Opción errónea 4

2. ¿Cuál es el ámbito de aplicación? A) Correcta ámbito B) Errónea 2 C) Errónea 3 D) Errónea 4

HOJA DE SOLUCIONES 1 B 2 A
`

// Format with question using numbered sub-article references like "artículo 3.a)"
const FORMAT_LOWERCASE_REFS = `
1. Conforme al artículo 3.a) de la ley, en el caso de personas con discapacidad, ¿qué conducta se considera discriminación directa? A) La denegación de ajustes razonables B) El despido objetivo C) La no inclusión en formación D) La exigencia de acreditación del 33%

HOJA DE SOLUCIONES 1 A
`

// Format: solutions distributed across multiple lines
const FORMAT_MULTILINE_SOLUTIONS = `
1. Pregunta uno A) Opt A B) Opt B C) Opt C D) Opt D
2. Pregunta dos A) Opt A B) Opt B C) Opt C D) Opt D
3. Pregunta tres A) Opt A B) Opt B C) Opt C D) Opt D

HOJA DE SOLUCIONES
1 C 2 A 3 D
`

describe('parseMDTest — formato A (opciones en líneas separadas)', () => {
  it('parsea 2 preguntas correctamente', () => {
    const result = parseMDTest(FORMAT_A)
    expect(result).toHaveLength(2)
  })

  it('asigna la respuesta correcta (B para pregunta 1)', () => {
    const result = parseMDTest(FORMAT_A)
    const q1 = result[0]
    expect(q1.text).toContain('capital de España')
    const correctOpt = q1.options.find(o => o.correct)
    expect(correctOpt.text).toContain('Madrid')
  })

  it('asigna la respuesta correcta (C para pregunta 2)', () => {
    const result = parseMDTest(FORMAT_A)
    const q2 = result[1]
    const correctOpt = q2.options.find(o => o.correct)
    expect(correctOpt.text).toContain('Siete')
  })

  it('genera 4 opciones por pregunta', () => {
    const result = parseMDTest(FORMAT_A)
    for (const q of result) {
      expect(q.options).toHaveLength(4)
    }
  })
})

describe('parseMDTest — formato B (opciones inline, soluciones inline)', () => {
  it('parsea 2 preguntas del formato inline', () => {
    const result = parseMDTest(FORMAT_B)
    expect(result).toHaveLength(2)
  })

  it('extrae el texto de la pregunta sin las opciones', () => {
    const result = parseMDTest(FORMAT_B)
    expect(result[0].text).toBe('¿Cuál es la capital de España?')
    expect(result[0].text).not.toContain('A)')
  })

  it('genera 4 opciones por pregunta (formato inline)', () => {
    const result = parseMDTest(FORMAT_B)
    for (const q of result) {
      expect(q.options).toHaveLength(4)
    }
  })

  it('asigna la respuesta correcta (B=Madrid para pregunta 1)', () => {
    const result = parseMDTest(FORMAT_B)
    const correct = result[0].options.find(o => o.correct)
    expect(correct.text).toContain('Madrid')
  })

  it('asigna la respuesta correcta (C=Siete para pregunta 2)', () => {
    const result = parseMDTest(FORMAT_B)
    const correct = result[1].options.find(o => o.correct)
    expect(correct.text).toContain('Siete')
  })

  it('cada pregunta tiene exactamente una opción correcta', () => {
    const result = parseMDTest(FORMAT_B)
    for (const q of result) {
      expect(q.options.filter(o => o.correct)).toHaveLength(1)
    }
  })
})

describe('parseMDTest — referencias a artículos con letras minúsculas (artículo 3.a))', () => {
  it('no confunde referencias "artículo 3.a)" con la opción A)', () => {
    const result = parseMDTest(FORMAT_LOWERCASE_REFS)
    expect(result).toHaveLength(1)
    expect(result[0].text).toContain('artículo 3.a)')
    expect(result[0].options).toHaveLength(4)
    const correct = result[0].options.find(o => o.correct)
    expect(correct.text).toContain('denegación de ajustes razonables')
  })
})

describe('parseMDTest — soluciones en múltiples pares por línea', () => {
  it('parsea soluciones distribuidas en una sola línea ("1 C 2 A 3 D")', () => {
    const result = parseMDTest(FORMAT_MULTILINE_SOLUTIONS)
    expect(result).toHaveLength(3)
    expect(result[0].options.find(o => o.correct).text).toContain('Opt C')
    expect(result[1].options.find(o => o.correct).text).toContain('Opt A')
    expect(result[2].options.find(o => o.correct).text).toContain('Opt D')
  })
})

describe('parseMDTest — formato B largo (preguntas numeradas hasta 30+)', () => {
  it('parsea preguntas con número de dos dígitos correctamente', () => {
    const result = parseMDTest(FORMAT_B_LONG)
    expect(result).toHaveLength(2)
    expect(result[0].options.find(o => o.correct).text).toContain('Opción correcta')
    expect(result[1].options.find(o => o.correct).text).toContain('Correcta ámbito')
  })
})

describe('parseMDTest — sin sección de soluciones', () => {
  it('cae al fallback options[0].correct=true cuando no hay soluciones', () => {
    const text = `1. Pregunta sin solución A) Primera opción B) Segunda C) Tercera D) Cuarta`
    const result = parseMDTest(text)
    expect(result).toHaveLength(1)
    expect(result[0].options[0].correct).toBe(true)
  })
})

describe('parseMDTest — propiedades de salida', () => {
  it('cada pregunta tiene id, type, text, options', () => {
    const result = parseMDTest(FORMAT_B)
    for (const q of result) {
      expect(q.id).toBeTruthy()
      expect(q.type).toBe('single')
      expect(typeof q.text).toBe('string')
      expect(Array.isArray(q.options)).toBe(true)
    }
  })
})
