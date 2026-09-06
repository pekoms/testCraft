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
  let lastNum = 0
  const flush = () => {
    if (num !== null && qtxt.trim()) qs.push({ num, text: qtxt.trim(), opts: opts.trim() })
    num = null; qtxt = ''; opts = ''
  }

  // Unnumbered statement waiting for the options line that follows it
  let pending = ''
  let fromPending = false

  const startQuestion = (n, rest, viaPending = false) => {
    flush()
    num = n
    lastNum = n
    fromPending = viaPending
    // Options may be embedded in the same line after the question text
    const aPos = rest.search(/\sA\)/)
    if (aPos >= 0) { qtxt = rest.slice(0, aPos); opts = rest.slice(aPos + 1) }
    else qtxt = rest
  }

  for (const raw of bodyLines) {
    const line = raw.trim()
    if (!line) continue

    const qm = line.match(/^(\d+)[.)]\s+(.+)/)
    if (qm) { pending = ''; startQuestion(+qm[1], qm[2]); continue }

    // Unnumbered question: statement with its options inline on the same line.
    // Numbered by order of appearance so it lines up with the solutions sheet.
    // A line *starting* with "A)" is a continuation, not a new question — hence
    // the required leading whitespace.
    if (/\sA\)/.test(line) && /\sB\)/.test(line)) { pending = ''; startQuestion(lastNum + 1, line); continue }

    const isOptionsLine = /^[ABCD]\)/.test(line)

    // Unnumbered question whose options sit on the next line
    if (isOptionsLine && pending) {
      startQuestion(lastNum + 1, `${pending} ${line}`, true)
      pending = ''
      continue
    }

    // In that same style, a plain line after the options opens the next question
    if (num !== null && fromPending && !isOptionsLine && opts) {
      flush()
      pending = line
      continue
    }

    if (num !== null) {
      if (/[ABCD]\)/.test(line)) opts += (opts ? ' ' : '') + line
      else if (!opts) qtxt += ' ' + line
      else opts += ' ' + line
      continue
    }

    pending = pending ? `${pending} ${line}` : line
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
