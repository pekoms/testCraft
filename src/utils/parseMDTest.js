export function parseMDTest(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  // Locate solutions section
  let solIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase()
    if (l.includes('hoja de soluciones') || (/^\s*pregunta/.test(l) && l.includes('solución'))) {
      solIdx = i; break
    }
  }

  const bodyLines = solIdx > -1 ? lines.slice(0, solIdx) : lines
  // Include the header line itself — solutions may appear on the same line as "HOJA DE SOLUCIONES"
  const solLines = solIdx > -1 ? lines.slice(solIdx) : []

  // Build { qNumber: 'A'|'B'|'C'|'D' } from solutions table.
  // Each line can have multiple pairs (e.g. "1  B    2  A    3  C"), so scan globally.
  const solutions = {}
  for (const line of solLines) {
    for (const m of line.matchAll(/(\d+)\s+([ABCD])(?=\s|$)/g)) {
      solutions[+m[1]] = m[2]
    }
  }

  // Parse questions
  const qs = []
  let num = null, qtxt = '', opts = ''
  const flush = () => {
    if (num !== null && qtxt.trim()) qs.push({ num, text: qtxt.trim(), opts: opts.trim() })
    num = null; qtxt = ''; opts = ''
  }

  for (const raw of bodyLines) {
    const line = raw.trim()
    if (!line) continue
    const qm = line.match(/^(\d+)[.)]\s+(.+)/)
    if (qm) {
      flush()
      num = +qm[1]
      const rest = qm[2]
      // Options may be embedded in the same line after the question text
      const aPos = rest.search(/\sA\)/)
      if (aPos >= 0) { qtxt = rest.slice(0, aPos); opts = rest.slice(aPos + 1) }
      else qtxt = rest
    } else if (num !== null) {
      if (/[ABCD]\)/.test(line)) opts += (opts ? ' ' : '') + line
      else if (!opts) qtxt += ' ' + line
      else opts += ' ' + line
    }
  }
  flush()

  return qs.map(q => {
    // Split "A) text B) text..." at each letter boundary preceded by whitespace
    const raw = ' ' + q.opts
    const parts = raw.split(/\s(?=[ABCD]\))/).filter(p => p.trim())
    const optMap = {}
    for (const part of parts) {
      const m = part.trim().match(/^([ABCD])\)\s*(.+)/)
      if (m) optMap[m[1]] = m[2].replace(/\s+/g, ' ').trim()
    }
    const correct = solutions[q.num]
    const options = ['A', 'B', 'C', 'D']
      .filter(l => optMap[l])
      .map(l => ({ text: optMap[l], correct: l === correct }))
    if (options.length < 2) return null
    if (!options.some(o => o.correct)) options[0].correct = true // fallback
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2), type: 'single', text: q.text, options }
  }).filter(Boolean)
}
