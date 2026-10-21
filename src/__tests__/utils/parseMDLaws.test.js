import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseMDLaws } from '@/utils/parseMDLaws'

const FIXTURE_DIR = resolve(process.cwd(), 'src/__tests__/fixtures/')

// ── Format A: ## heading ───────────────────────────────────────────────────

const FORMAT_A = `
## Real Decreto 513/2017, de 22 de mayo

Artículo 1. Objeto.

Este reglamento tiene por objeto establecer las condiciones y los requisitos
exigibles al diseño e instalación de los sistemas de protección contra incendios.

## Ley 31/1995, de 8 de noviembre

Artículo 1. Ámbito de aplicación.

La presente Ley tiene por objeto la prevención de riesgos laborales.
`

// ── Format B: TÍTULO: marker ────────────────────────────────────────────────

const FORMAT_B = `
TÍTULO: RD 1215/1997, de 18 de julio
Artículo único. Objeto.
Por el que se establecen las disposiciones mínimas de seguridad y salud
para la utilización por los trabajadores de los equipos de trabajo.

TITULO: Ley 54/2003
Reforma del marco normativo de la prevención de riesgos laborales.
`

// ── Mixed ────────────────────────────────────────────────────────────────────

const FORMAT_MIXED = `
## Ley con heading

Contenido de la primera.

TÍTULO: Ley con marcador

Contenido de la segunda.
`

describe('parseMDLaws — formato A (## heading)', () => {
  it('parsea 2 leyes', () => {
    expect(parseMDLaws(FORMAT_A)).toHaveLength(2)
  })

  it('extrae el título correctamente', () => {
    const result = parseMDLaws(FORMAT_A)
    expect(result[0].title).toBe('Real Decreto 513/2017, de 22 de mayo')
    expect(result[1].title).toBe('Ley 31/1995, de 8 de noviembre')
  })

  it('extrae el contenido completo, con sus saltos de párrafo', () => {
    const result = parseMDLaws(FORMAT_A)
    expect(result[0].content).toContain('Artículo 1. Objeto.')
    expect(result[0].content).toContain('sistemas de protección contra incendios')
    expect(result[0].content).toContain('\n\n')
  })

  it('no arrastra el título dentro del contenido', () => {
    const result = parseMDLaws(FORMAT_A)
    expect(result[0].content).not.toContain('Real Decreto 513/2017')
  })
})

describe('parseMDLaws — formato B (TÍTULO:)', () => {
  it('parsea 2 leyes', () => {
    expect(parseMDLaws(FORMAT_B)).toHaveLength(2)
  })

  it('admite TITULO sin tilde', () => {
    const result = parseMDLaws(FORMAT_B)
    expect(result[1].title).toBe('Ley 54/2003')
  })

  it('extrae título y contenido', () => {
    const result = parseMDLaws(FORMAT_B)
    expect(result[0].title).toBe('RD 1215/1997, de 18 de julio')
    expect(result[0].content).toContain('equipos de trabajo')
  })
})

describe('parseMDLaws — formato mixto', () => {
  it('admite ## y TÍTULO: en el mismo texto', () => {
    const result = parseMDLaws(FORMAT_MIXED)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Ley con heading')
    expect(result[1].title).toBe('Ley con marcador')
  })
})

describe('parseMDLaws — casos límite', () => {
  it('devuelve [] con texto vacío', () => {
    expect(parseMDLaws('')).toHaveLength(0)
  })

  it('ignora el preámbulo antes del primer título', () => {
    const result = parseMDLaws('Texto suelto antes de nada.\n\n## Primera ley\nContenido.')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Primera ley')
  })

  it('descarta un título sin contenido', () => {
    const result = parseMDLaws('## Título sin cuerpo\n\n## Siguiente título\nContenido real.')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Siguiente título')
  })

  it('hace trim del título y del contenido', () => {
    const result = parseMDLaws('##   Con espacios   \n  Contenido con espacios  ')
    expect(result[0].title).toBe('Con espacios')
    expect(result[0].content).toBe('Contenido con espacios')
  })

  it('colapsa líneas en blanco excesivas dentro del contenido', () => {
    const result = parseMDLaws('## T\nPárrafo uno.\n\n\n\n\nPárrafo dos.')
    expect(result[0].content).not.toMatch(/\n{3,}/)
    expect(result[0].content).toContain('Párrafo uno.\n\nPárrafo dos.')
  })

  it('cada ley tiene title y content como string', () => {
    const result = parseMDLaws(FORMAT_A)
    for (const l of result) {
      expect(typeof l.title).toBe('string')
      expect(typeof l.content).toBe('string')
    }
  })

  it('un texto largo de varios artículos se conserva íntegro', () => {
    const largo = Array.from({ length: 30 }, (_, i) => `Artículo ${i + 1}. Texto del artículo número ${i + 1}.`).join('\n\n')
    const result = parseMDLaws(`## Ley extensa\n${largo}`)
    expect(result[0].content).toContain('Artículo 1.')
    expect(result[0].content).toContain('Artículo 30.')
  })
})

describe('parseMDLaws — texto real (RD y Ley combinados)', () => {
  const REAL = `
## Real Decreto 513/2017, de 22 de mayo, por el que se aprueba el Reglamento de instalaciones de protección contra incendios

El presente real decreto tiene por objeto aprobar el Reglamento de instalaciones
de protección contra incendios, que se incluye a continuación.

Artículo 1. Objeto.

Este reglamento tiene por objeto establecer las condiciones y los requisitos
exigibles al diseño, la instalación y el mantenimiento de los sistemas de
protección contra incendios empleados en los establecimientos industriales.

Artículo 2. Ámbito de aplicación.

Lo dispuesto en este reglamento será de aplicación a los establecimientos
industriales.

## Ley 31/1995, de 8 de noviembre, de Prevención de Riesgos Laborales

La presente Ley tiene por objeto promover la seguridad y la salud de los
trabajadores mediante la aplicación de medidas y el desarrollo de las
actividades necesarias para la prevención de riesgos derivados del trabajo.
`

  it('parsea las 2 leyes del texto real', () => {
    expect(parseMDLaws(REAL)).toHaveLength(2)
  })

  it('el título largo del RD se extrae completo', () => {
    const result = parseMDLaws(REAL)
    expect(result[0].title).toBe(
      'Real Decreto 513/2017, de 22 de mayo, por el que se aprueba el Reglamento de instalaciones de protección contra incendios'
    )
  })

  it('el contenido conserva los dos artículos del RD', () => {
    const result = parseMDLaws(REAL)
    expect(result[0].content).toContain('Artículo 1. Objeto.')
    expect(result[0].content).toContain('Artículo 2. Ámbito de aplicación.')
  })

  it('la Ley 31/1995 queda separada del RD', () => {
    const result = parseMDLaws(REAL)
    expect(result[1].title).toContain('Prevención de Riesgos Laborales')
    expect(result[1].content).not.toContain('Artículo 1. Objeto.')
  })
})

// ── Format C: citation-card style (AI study-guide exports) ──────────────────

const FORMAT_C = `
Artículo 40.2 de la Constitución Española:
Ubicación en el texto: Epígrafe 1.1.1 Fuentes de origen de la LPRL (Pág. 4)
.
Texto literal: "En primer lugar, destacar que la seguridad e higiene en el trabajo es un mandato constitucional"
.
Ley 31/1995, de 8 de noviembre, de Prevención de Riesgos Laborales (LPRL):
Ubicación en el texto: Epígrafes 1.1 Exposición de motivos y 1.2.1 Objeto (Págs. 4-5)
.
Texto literal: "Esta Ley tiene por objeto sentar las bases de las garantías..."
. "Tiene pues un carácter laboral y de Derecho necesario mínimo indisponible"
.
`

describe('parseMDLaws — formato C (fichas de cita)', () => {
  it('parsea las entradas por título', () => {
    const result = parseMDLaws(FORMAT_C)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Artículo 40.2 de la Constitución Española')
    expect(result[1].title).toBe('Ley 31/1995, de 8 de noviembre, de Prevención de Riesgos Laborales (LPRL)')
  })

  it('incluye la ubicación en el contenido', () => {
    const result = parseMDLaws(FORMAT_C)
    expect(result[0].content).toContain('Ubicación en el texto: Epígrafe 1.1.1')
  })

  it('incluye el texto literal en el contenido', () => {
    const result = parseMDLaws(FORMAT_C)
    expect(result[0].content).toContain('Texto literal: "En primer lugar')
  })

  it('una entrada con dos citas "Texto literal" las conserva ambas', () => {
    const result = parseMDLaws(FORMAT_C)
    const matches = result[1].content.match(/Texto literal:/g)
    expect(matches).toHaveLength(2)
    expect(result[1].content).toContain('garantías')
    expect(result[1].content).toContain('Derecho necesario mínimo indisponible')
  })

  it('las líneas con un único punto suelto se descartan como ruido', () => {
    const result = parseMDLaws(FORMAT_C)
    for (const l of result) expect(l.content).not.toMatch(/^\.\s*$/m)
  })

  it('una cita que llega tras un punto suelto en la misma línea se une a la entrada', () => {
    const result = parseMDLaws(FORMAT_C)
    expect(result[1].content).toContain('"Tiene pues un carácter laboral')
  })
})

describe('parseMDLaws — formato C: encabezados de sección numerados', () => {
  const CON_SECCIONES = `
1. Marco Constitucional, Leyes Principales y Ámbito de Aplicación
Primera ley:
Ubicación en el texto: Epígrafe 1 (Pág. 1)
.
Texto literal: "contenido de la primera"
.
2. Reales Decretos Principales de Desarrollo Reglamentario
Segunda ley:
Ubicación en el texto: Epígrafe 2 (Pág. 2)
.
Texto literal: "contenido de la segunda"
.
`

  it('ignora los encabezados numerados de sección', () => {
    const result = parseMDLaws(CON_SECCIONES)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Primera ley')
    expect(result[1].title).toBe('Segunda ley')
  })

  it('el encabezado de sección no se cuela en el contenido de la entrada anterior', () => {
    const result = parseMDLaws(CON_SECCIONES)
    expect(result[0].content).not.toContain('Reales Decretos')
    expect(result[0].content).not.toContain('Marco Constitucional')
  })
})

describe('parseMDLaws — formato C: no interfiere con A/B', () => {
  it('una línea de prosa que termina en ":" dentro de formato ## no abre una entrada C', () => {
    const texto = '## Mi ley\nLos requisitos son los siguientes:\nUno, dos y tres.'
    const result = parseMDLaws(texto)
    expect(result).toHaveLength(1)
    expect(result[0].content).toContain('Los requisitos son los siguientes:')
    expect(result[0].content).toContain('Uno, dos y tres.')
  })

  it('formato A y formato C pueden mezclarse en el mismo texto', () => {
    const texto = '## Ley con heading\nContenido normal.\n\nOtra ley:\nUbicación en el texto: X\n.\nTexto literal: "cita"\n.'
    const result = parseMDLaws(texto)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Ley con heading')
    expect(result[1].title).toBe('Otra ley')
    expect(result[1].content).toContain('Texto literal: "cita"')
  })
})

describe('parseMDLaws — el texto real completo del usuario', () => {
  const REAL = readFileSync(resolve(FIXTURE_DIR, 'laws-citation-sample.txt'), 'utf8')

  it('parsea las 10 entradas del documento', () => {
    expect(parseMDLaws(REAL)).toHaveLength(10)
  })

  it('cada entrada tiene título y contenido no vacíos', () => {
    for (const l of parseMDLaws(REAL)) {
      expect(l.title.length).toBeGreaterThan(0)
      expect(l.content.length).toBeGreaterThan(0)
    }
  })

  it('la primera entrada es el Artículo 40.2 de la Constitución', () => {
    expect(parseMDLaws(REAL)[0].title).toBe('Artículo 40.2 de la Constitución Española')
  })

  it('la última entrada es el RD 138/2000', () => {
    const result = parseMDLaws(REAL)
    expect(result[result.length - 1].title).toBe('Real Decreto 138/2000, de 4 de febrero')
  })

  it('ninguna entrada arrastra el encabezado de sección "Reales Decretos Principales"', () => {
    for (const l of parseMDLaws(REAL)) {
      expect(l.title).not.toContain('Reales Decretos Principales')
      expect(l.content).not.toContain('Reales Decretos Principales')
    }
  })

  it('la Ley 31/1995 conserva sus dos citas literales', () => {
    const ley = parseMDLaws(REAL).find(l => l.title.includes('31/1995'))
    expect((ley.content.match(/Texto literal:/g) || [])).toHaveLength(2)
  })

  it('el RD 1407/1992 conserva sus dos citas literales', () => {
    const rd = parseMDLaws(REAL).find(l => l.title.includes('1407/1992'))
    expect((rd.content.match(/Texto literal:/g) || [])).toHaveLength(2)
  })

  it('todos los títulos esperados aparecen en orden', () => {
    const titles = parseMDLaws(REAL).map(l => l.title)
    expect(titles).toEqual([
      'Artículo 40.2 de la Constitución Española',
      'Ley 31/1995, de 8 de noviembre, de Prevención de Riesgos Laborales (LPRL)',
      'Texto Refundido de la Ley del Estatuto de los Trabajadores',
      'Ley 21/1992, de 16 de julio, de Industria',
      'Real Decreto 1407/1992, de 20 de noviembre',
      'Real Decreto 773/1997, de 30 de mayo',
      'Real Decreto 39/1997, de 17 de enero (Reglamento de los Servicios de Prevención)',
      'Real Decreto 171/2004, de 30 de enero (Coordinación de Actividades Empresariales - CAE)',
      'Real Decreto 485/1997 (Señalización de Seguridad y Salud)',
      'Real Decreto 138/2000, de 4 de febrero',
    ])
  })
})
