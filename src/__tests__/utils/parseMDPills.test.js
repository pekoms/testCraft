import { describe, it, expect } from 'vitest'
import { parseMDPills } from '@/utils/parseMDPills'

// ── Format A: P:/R: markers ───────────────────────────────────────────────────

const FORMAT_A = `
P: ¿Cuál es la capital de España?
R: Madrid

P: ¿Cuántos planetas hay en el sistema solar?
R: Ocho
`

const FORMAT_A_NOBLANK = `
P: Pregunta 1
R: Respuesta 1
P: Pregunta 2
R: Respuesta 2
`

const FORMAT_A_MULTILINE = `
P: ¿Qué es la vulnerabilidad según el PLATERCAM?
R: La característica de una colectividad de personas, bienes o medio ambiente,
que los hacen susceptibles de ser afectados en mayor o menor grado
por un peligro en determinadas circunstancias.

P: Pregunta corta
R: Respuesta corta
`

const FORMAT_A_QA = `
Q: Question in English
A: Answer in English

Q: Second question
A: Second answer
`

// ── Format B: ## headings ─────────────────────────────────────────────────────

const FORMAT_B = `
## ¿Cuál es la capital de España?

Madrid

## ¿Cuántos planetas hay en el sistema solar?

Ocho
`

const FORMAT_B_MULTILINE_BACK = `
## Situaciones operativas del PLATERCAM

El plan define tres situaciones:
- Situación 0: emergencia local
- Situación 1: emergencia autonómica
- Situación 2: emergencia de interés nacional

## Segunda píldora

Segunda respuesta
`

// ── Format C: ## separator + P:/R: markers ───────────────────────────────────

const FORMAT_C = `
##
P: ¿Cuáles son las cuatro clases de empleados públicos según el artículo 8.2 del TREBEP?
R: **1) Funcionarios de carrera, 2) Funcionarios interinos, 3) Personal laboral** (ya sea fijo, por tiempo indefinido o temporal) y **4) Personal eventual.**

##
P: ¿Qué define a un funcionario de carrera conforme al artículo 9.1 del TREBEP?
R: Son quienes, en virtud de **nombramiento legal**, están vinculados a una Administración Pública por una **relación estatutaria** regulada por el **Derecho Administrativo** para el desempeño de servicios profesionales retribuidos de carácter **permanente.**
`

// ── Mixed formats ─────────────────────────────────────────────────────────────

const FORMAT_MIXED = `
P: Pregunta en formato marcador
R: Respuesta en formato marcador

## Pregunta en formato heading

Respuesta en formato heading
`

// ── describe blocks ───────────────────────────────────────────────────────────

describe('parseMDPills — formato A (P:/R:)', () => {
  it('parsea 2 píldoras separadas por línea en blanco', () => {
    const result = parseMDPills(FORMAT_A)
    expect(result).toHaveLength(2)
  })

  it('extrae el front correctamente', () => {
    const result = parseMDPills(FORMAT_A)
    expect(result[0].front).toBe('¿Cuál es la capital de España?')
    expect(result[1].front).toBe('¿Cuántos planetas hay en el sistema solar?')
  })

  it('extrae el back correctamente', () => {
    const result = parseMDPills(FORMAT_A)
    expect(result[0].back).toBe('Madrid')
    expect(result[1].back).toBe('Ocho')
  })

  it('funciona sin líneas en blanco entre píldoras', () => {
    const result = parseMDPills(FORMAT_A_NOBLANK)
    expect(result).toHaveLength(2)
    expect(result[0].front).toBe('Pregunta 1')
    expect(result[0].back).toBe('Respuesta 1')
    expect(result[1].front).toBe('Pregunta 2')
    expect(result[1].back).toBe('Respuesta 2')
  })

  it('soporta back multilínea', () => {
    const result = parseMDPills(FORMAT_A_MULTILINE)
    expect(result).toHaveLength(2)
    expect(result[0].back).toContain('colectividad de personas')
    expect(result[0].back).toContain('peligro en determinadas circunstancias')
  })

  it('soporta Q:/A: como alias de P:/R:', () => {
    const result = parseMDPills(FORMAT_A_QA)
    expect(result).toHaveLength(2)
    expect(result[0].front).toBe('Question in English')
    expect(result[0].back).toBe('Answer in English')
  })
})

describe('parseMDPills — formato B (## headings)', () => {
  it('parsea 2 píldoras con ## headings', () => {
    const result = parseMDPills(FORMAT_B)
    expect(result).toHaveLength(2)
  })

  it('extrae el front desde el heading', () => {
    const result = parseMDPills(FORMAT_B)
    expect(result[0].front).toBe('¿Cuál es la capital de España?')
    expect(result[1].front).toBe('¿Cuántos planetas hay en el sistema solar?')
  })

  it('extrae el back desde el cuerpo', () => {
    const result = parseMDPills(FORMAT_B)
    expect(result[0].back).toBe('Madrid')
    expect(result[1].back).toBe('Ocho')
  })

  it('soporta back multilínea con listas', () => {
    const result = parseMDPills(FORMAT_B_MULTILINE_BACK)
    expect(result).toHaveLength(2)
    expect(result[0].back).toContain('Situación 0')
    expect(result[0].back).toContain('Situación 1')
    expect(result[0].back).toContain('Situación 2')
  })
})

describe('parseMDPills — formato C (## separador + P:/R:)', () => {
  it('parsea 2 píldoras con ## como separador', () => {
    const result = parseMDPills(FORMAT_C)
    expect(result).toHaveLength(2)
  })

  it('extrae el front correctamente', () => {
    const result = parseMDPills(FORMAT_C)
    expect(result[0].front).toContain('cuatro clases de empleados públicos')
    expect(result[1].front).toContain('funcionario de carrera')
  })

  it('extrae el back con formato markdown', () => {
    const result = parseMDPills(FORMAT_C)
    expect(result[0].back).toContain('Funcionarios de carrera')
    expect(result[0].back).toContain('Personal eventual')
    expect(result[1].back).toContain('nombramiento legal')
    expect(result[1].back).toContain('permanente')
  })
})

describe('parseMDPills — formato mixto', () => {
  it('admite ambos formatos en el mismo texto', () => {
    const result = parseMDPills(FORMAT_MIXED)
    expect(result).toHaveLength(2)
    expect(result[0].front).toBe('Pregunta en formato marcador')
    expect(result[1].front).toBe('Pregunta en formato heading')
  })
})

describe('parseMDPills — casos límite', () => {
  it('devuelve [] con texto vacío', () => {
    expect(parseMDPills('')).toHaveLength(0)
  })

  it('devuelve [] si falta el back', () => {
    expect(parseMDPills('P: Solo anverso sin reverso')).toHaveLength(0)
  })

  it('devuelve [] si falta el front (## sin cuerpo)', () => {
    expect(parseMDPills('## Heading sin cuerpo')).toHaveLength(0)
  })

  it('ignora píldoras con front o back vacío', () => {
    const text = `P: Completa
R: Con respuesta

P:
R: Esto no tiene front
`
    const result = parseMDPills(text)
    expect(result).toHaveLength(1)
    expect(result[0].front).toBe('Completa')
  })

  it('hace trim del front y del back', () => {
    const result = parseMDPills('P:   Con espacios   \nR:   También con espacios   ')
    expect(result[0].front).toBe('Con espacios')
    expect(result[0].back).toBe('También con espacios')
  })

  it('cada píldora tiene front y back como string', () => {
    const result = parseMDPills(FORMAT_A)
    for (const p of result) {
      expect(typeof p.front).toBe('string')
      expect(typeof p.back).toBe('string')
    }
  })
})

describe('parseMDPills — texto real PLATERCAM (formato P:/R:)', () => {
  const PLATERCAM_PILLS = `
P: ¿Qué es la Amenaza según el apartado 1.4 del PLATERCAM?
R: El potencial de ocasionar daño en determinadas situaciones a colectivos de personas o bienes que deben ser preservados por la protección civil.

P: ¿Qué es la Vulnerabilidad según el glosario del PLATERCAM?
R: La característica de una colectividad de personas, bienes o medio ambiente, que los hacen susceptibles de ser afectados en mayor o menor grado por un peligro en determinadas circunstancias.

P: ¿Qué es el Riesgo según el PLATERCAM?
R: La probabilidad de que se produzcan daños en una zona o lugar determinados y que llegue a afectar a colectivos de personas o a bienes.

P: ¿Quién toma la decisión de evacuar a la población afectada?
R: El Director del Plan, previo asesoramiento con los responsables de los Grupos de Seguridad, Sanitario y autoridades locales.
`

  it('parsea 4 píldoras del texto real', () => {
    const result = parseMDPills(PLATERCAM_PILLS)
    expect(result).toHaveLength(4)
  })

  it('la primera píldora tiene el front y back correctos', () => {
    const result = parseMDPills(PLATERCAM_PILLS)
    expect(result[0].front).toContain('Amenaza')
    expect(result[0].back).toContain('potencial de ocasionar daño')
  })

  it('la cuarta píldora menciona al Director del Plan', () => {
    const result = parseMDPills(PLATERCAM_PILLS)
    expect(result[3].back).toContain('Director del Plan')
  })
})
