/**
 * Parses a .md text into an array of pill objects { front, back }.
 *
 * Supported formats (can be mixed in the same file):
 *
 * Format A — explicit markers (P:/R: or Q:/A:):
 *   P: Texto del anverso
 *   R: Texto del reverso
 *
 * Format B — markdown headings (## as front, body as back):
 *   ## Texto del anverso
 *   Texto del reverso
 *
 * Both formats support multi-line content. A blank line between pills
 * is optional in Format A (the next P:/## always flushes the previous one).
 */
export function parseMDPills(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const pills = []

  let front = null
  let back = null
  let mode = null   // 'front' | 'back'
  let fmt = null    // 'marker' | 'heading'

  function flush() {
    const f = front?.trim()
    const b = back?.trim()
    if (f && b) pills.push({ front: f, back: b })
    front = null; back = null; mode = null; fmt = null
  }

  for (const raw of lines) {
    const line = raw.trim()

    // Format B trigger: ## heading
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) {
      flush()
      front = h2[1].trim()
      back = ''
      mode = 'front'
      fmt = 'heading'
      continue
    }

    // Format A trigger: P: / Q: / Pregunta: / Anverso:
    const frontMarker = line.match(/^(?:P|Q|Pregunta|Anverso)\s*[:.]\s*(.*)/i)
    if (frontMarker) {
      flush()
      front = frontMarker[1].trim()
      back = null
      mode = 'front'
      fmt = 'marker'
      continue
    }

    // Format A: R: / A: / Respuesta: / Reverso:
    const backMarker = line.match(/^(?:R|A|Respuesta|Reverso)\s*[:.]\s*(.*)/i)
    if (backMarker && fmt === 'marker' && front !== null) {
      back = backMarker[1].trim()
      mode = 'back'
      continue
    }

    // Blank line
    if (!line) {
      if (fmt === 'heading' && mode === 'front') {
        // In heading format, blank line after ## switches to collecting back
        mode = 'back'
      } else if (fmt === 'marker' && mode === 'back') {
        flush()
      }
      // else: blank line inside content — preserve as paragraph break
      else if (mode === 'back' && back !== null) {
        back += '\n'
      }
      continue
    }

    // Content continuation
    if (mode === 'front') {
      front = front ? front + '\n' + line : line
    } else if (mode === 'back') {
      back = back ? back + '\n' + line : line
    }
  }

  flush()

  // Collapse excessive blank lines inside each field
  return pills.map(p => ({
    front: p.front.replace(/\n{3,}/g, '\n\n').trim(),
    back: p.back.replace(/\n{3,}/g, '\n\n').trim(),
  }))
}
