/**
 * Parses a .md text into an array of law objects { title, content }.
 *
 * Unlike pills (front/back), a law's content is one long free-text block —
 * the full legal text, with its own blank lines as paragraph breaks — so the
 * separator can't be a blank line like in other parsers. Only an explicit
 * marker starts a new law.
 *
 * Format A — ## heading as title, everything after (until the next marker)
 * is the content:
 *   ## Real Decreto 513/2017, de 22 de mayo
 *   Artículo 1. Objeto.
 *
 *   Este reglamento tiene por objeto...
 *
 * Format B — explicit TÍTULO: marker (accepts TITULO:, with or without accent):
 *   TÍTULO: Ley 31/1995, de 8 de noviembre
 *   Artículo 1. Objeto.
 *   ...
 *
 * Format C — citation-card style, as produced by AI study-guide exports:
 *   Artículo 40.2 de la Constitución Española:
 *   Ubicación en el texto: Epígrafe 1.1.1 Fuentes de origen de la LPRL (Pág. 4)
 *   Texto literal: "En primer lugar, destacar que..."
 *
 *   Ley 31/1995, de 8 de noviembre:
 *   Ubicación en el texto: Epígrafe 1.1 (Pág. 4)
 *   Texto literal: "Esta Ley tiene por objeto..."
 *
 * A "Name:" line only opens a Format C entry when the next non-blank line is
 * "Ubicación en el texto:" or "Texto literal:" — confirmed by lookahead so an
 * ordinary Format A/B content line that happens to end in ":" is never
 * mistaken for a new law. These exports also carry two kinds of noise that
 * get silently dropped: numbered section headers ("1. Marco Constitucional...")
 * grouping several entries, and stray "." lines — citation/footnote markers
 * that lost their digits when the source PDF was copied, sometimes with the
 * next quote tacked onto the same line (". "siguiente cita""). An entry can
 * carry more than one "Texto literal:" quote.
 *
 * All three formats can be mixed in the same file.
 */
export function parseMDLaws(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const laws = []

  let title = null
  let mode = null      // 'freeform' (A/B) | 'fields' (C)
  let content = null   // freeform accumulator
  let location = ''    // fields: "Ubicación en el texto: ..."
  let quotes = []       // fields: one or more "Texto literal: ..." excerpts

  function flush() {
    const t = title?.trim()
    let c
    if (mode === 'fields') {
      const parts = []
      if (location) parts.push(`Ubicación en el texto: ${location.trim()}`)
      for (const q of quotes) parts.push(`Texto literal: ${q.trim()}`)
      c = parts.join('\n\n')
    } else {
      c = content
    }
    c = c?.trim()
    if (t && c) laws.push({ title: t, content: c })
    title = null; mode = null; content = null; location = ''; quotes = []
  }

  function nextMeaningfulLine(i) {
    for (let j = i + 1; j < lines.length; j++) {
      const t = lines[j].trim()
      if (t) return t
    }
    return ''
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Numbered section header grouping several Format-C entries, e.g.
    // "1. Marco Constitucional, Leyes Principales y Ámbito de Aplicación" —
    // not a law itself, dropped wherever it appears.
    if (/^\d+\.\s+\S/.test(line) && !line.endsWith(':') && !line.startsWith('"')) continue

    // Stray citation-reference marker — a lone "." on its own line, sometimes
    // with the next quote tacked onto the same line (". "texto..."")
    const strayDot = line.match(/^\.\s*(.*)$/)
    if (strayDot) {
      const rest = strayDot[1]
      if (!rest) continue // bare "." — pure noise
      if (mode === 'fields') { quotes.push(rest); continue }
      content = content != null ? content + '\n' + rest : rest
      continue
    }

    // Format A — ## heading
    const h2 = line.match(/^##\s+(.+)$/)
    // Format B — TÍTULO: marker
    const marker = line.match(/^T[IÍ]TULO\s*[:.]\s*(.+)/i)
    if (h2 || marker) {
      flush()
      title = (h2 ? h2[1] : marker[1]).trim()
      mode = 'freeform'
      content = ''
      continue
    }

    // Format C fields — only meaningful once inside a citation-style entry
    if (mode === 'fields') {
      const ubic = line.match(/^Ubicaci[oó]n en el texto\s*:\s*(.*)$/i)
      if (ubic) { location = ubic[1]; continue }

      const lit = line.match(/^Texto literal\s*:\s*(.*)$/i)
      if (lit) { quotes.push(lit[1]); continue }
    }

    // Format C — "Law name:" trigger, confirmed by lookahead so a Format A/B
    // content line ending in ":" is never mistaken for a new entry
    if (line.endsWith(':') && line.length > 1) {
      const next = nextMeaningfulLine(i)
      if (/^Ubicaci[oó]n en el texto\s*:/i.test(next) || /^Texto literal\s*:/i.test(next)) {
        flush()
        title = line.slice(0, -1).trim()
        mode = 'fields'
        location = ''
        quotes = []
        continue
      }
    }

    if (title === null) continue // preamble before the first title — ignore

    if (mode === 'freeform') {
      if (!line) { content += '\n'; continue }
      content = content ? content + '\n' + line : line
    }
    // mode === 'fields' with an unrecognized line: ignore stray text
  }

  flush()

  // Collapse excessive blank lines left by consecutive empty source lines
  return laws.map(l => ({
    title: l.title,
    content: l.content.replace(/\n{3,}/g, '\n\n').trim(),
  }))
}
