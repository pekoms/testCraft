import { describe, it, expect } from 'vitest'
import {
  trendClass, trendLabel, trendArrow,
  sparkline, testMeta, filterStudentResults,
} from '@/composables/statsHelpers'

// ── trendClass ────────────────────────────────
describe('trendClass', () => {
  it('devuelve up cuando la puntuación sube más de 3 puntos', () => {
    expect(trendClass([50, 80])).toBe('up')
    expect(trendClass([60, 64])).toBe('up')
  })

  it('devuelve down cuando la puntuación baja más de 3 puntos', () => {
    expect(trendClass([80, 50])).toBe('down')
    expect(trendClass([70, 66])).toBe('down')
  })

  it('devuelve flat cuando la diferencia es 3 puntos o menos', () => {
    expect(trendClass([70, 70])).toBe('flat')
    expect(trendClass([70, 73])).toBe('flat')
    expect(trendClass([70, 67])).toBe('flat')
  })

  it('devuelve flat con una sola puntuación', () => {
    expect(trendClass([75])).toBe('flat')
  })

  it('funciona con múltiples puntos (compara primero y último)', () => {
    expect(trendClass([40, 60, 90])).toBe('up')
    expect(trendClass([90, 60, 40])).toBe('down')
  })
})

// ── trendLabel ────────────────────────────────
describe('trendLabel', () => {
  it('muestra el incremento positivo', () => {
    expect(trendLabel([50, 80])).toBe('↑ +30%')
  })

  it('muestra el decremento negativo', () => {
    expect(trendLabel([80, 50])).toBe('↓ -30%')
  })

  it('muestra estable cuando la variación es ≤3 puntos', () => {
    expect(trendLabel([70, 72])).toBe('→ estable')
    expect(trendLabel([70, 70])).toBe('→ estable')
  })

  it('devuelve string vacío con una sola puntuación', () => {
    expect(trendLabel([75])).toBe('')
  })

  it('redondea la diferencia', () => {
    expect(trendLabel([60, 64.6])).toBe('↑ +5%')
  })
})

// ── trendArrow ────────────────────────────────
describe('trendArrow', () => {
  it('devuelve ↑ para tendencia positiva', () => {
    expect(trendArrow([50, 90])).toBe('↑')
  })

  it('devuelve ↓ para tendencia negativa', () => {
    expect(trendArrow([90, 50])).toBe('↓')
  })

  it('devuelve → para tendencia plana', () => {
    expect(trendArrow([70, 71])).toBe('→')
  })
})

// ── sparkline ─────────────────────────────────
describe('sparkline', () => {
  it('devuelve un <span> con el porcentaje para una sola puntuación', () => {
    const result = sparkline([75])
    expect(result).toContain('75%')
    expect(result).not.toContain('<svg')
  })

  it('devuelve — cuando la puntuación es null/undefined con una entrada', () => {
    const result = sparkline([null])
    expect(result).toContain('—%')
  })

  it('devuelve SVG con path y circle para múltiples puntuaciones', () => {
    const result = sparkline([50, 75, 90])
    expect(result).toContain('<svg')
    expect(result).toContain('<path')
    expect(result).toContain('<circle')
  })

  it('usa color verde (accent2) cuando la tendencia sube', () => {
    const result = sparkline([40, 90])
    expect(result).toContain('var(--accent2)')
  })

  it('usa color rojo (#C0392B) cuando la tendencia baja', () => {
    const result = sparkline([90, 40])
    expect(result).toContain('#C0392B')
  })

  it('usa color neutro (ink3) cuando la tendencia es plana', () => {
    const result = sparkline([70, 71])
    expect(result).toContain('var(--ink3)')
  })

  it('respeta el ancho y alto personalizados', () => {
    const result = sparkline([50, 80], 100, 36)
    expect(result).toContain('width="100"')
    expect(result).toContain('height="36"')
  })
})

// ── testMeta ──────────────────────────────────
describe('testMeta', () => {
  it('muestra singular para un intento', () => {
    const meta = testMeta([{ score: 80 }])
    expect(meta).toContain('1 intento')
    expect(meta).not.toContain('1 intentos')
  })

  it('muestra plural para varios intentos', () => {
    const meta = testMeta([{ score: 60 }, { score: 80 }])
    expect(meta).toContain('2 intentos')
  })

  it('incluye la mejor nota', () => {
    const meta = testMeta([{ score: 60 }, { score: 90 }, { score: 70 }])
    expect(meta).toContain('Mejor: 90%')
  })

  it('no muestra Último con un solo intento', () => {
    const meta = testMeta([{ score: 80 }])
    expect(meta).not.toContain('Último')
  })

  it('muestra el último score con múltiples intentos', () => {
    const meta = testMeta([{ score: 60 }, { score: 90 }])
    expect(meta).toContain('Último: 90%')
  })

  it('ignora resultados con score null (preguntas abiertas)', () => {
    const meta = testMeta([{ score: null }, { score: null }])
    expect(meta).toContain('2 intentos')
    expect(meta).not.toContain('Mejor')
  })
})

// ── filterStudentResults ──────────────────────
describe('filterStudentResults', () => {
  const students = [{ id: 'student1' }, { id: 'student2' }]
  const results = [
    { user_id: 'student1', score: 80 },
    { user_id: 'student2', score: 70 },
    { user_id: 'admin-uuid', score: 95 },
    { user_id: 'teacher-uuid', score: 85 },
  ]

  it('conserva sólo resultados de alumnos de la lista', () => {
    const filtered = filterStudentResults(results, students)
    expect(filtered).toHaveLength(2)
    expect(filtered.map(r => r.user_id)).toEqual(['student1', 'student2'])
  })

  it('excluye resultados del admin', () => {
    const filtered = filterStudentResults(results, students)
    expect(filtered.find(r => r.user_id === 'admin-uuid')).toBeUndefined()
  })

  it('excluye resultados de otros profesores', () => {
    const filtered = filterStudentResults(results, students)
    expect(filtered.find(r => r.user_id === 'teacher-uuid')).toBeUndefined()
  })

  it('devuelve vacío si no hay alumnos', () => {
    expect(filterStudentResults(results, [])).toHaveLength(0)
  })

  it('devuelve vacío si no hay resultados', () => {
    expect(filterStudentResults([], students)).toHaveLength(0)
  })

  it('devuelve vacío si ambas listas están vacías', () => {
    expect(filterStudentResults([], [])).toHaveLength(0)
  })
})
