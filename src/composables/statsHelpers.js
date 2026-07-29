export function trendClass(scores) {
  if (scores.length < 2) return 'flat'
  const diff = scores[scores.length - 1] - scores[0]
  return diff > 3 ? 'up' : diff < -3 ? 'down' : 'flat'
}

export function trendLabel(scores) {
  if (scores.length < 2) return ''
  const diff = scores[scores.length - 1] - scores[0]
  if (diff > 3) return `↑ +${Math.round(diff)}%`
  if (diff < -3) return `↓ ${Math.round(diff)}%`
  return '→ estable'
}

export function trendArrow(scores) {
  const cls = trendClass(scores)
  return cls === 'up' ? '↑' : cls === 'down' ? '↓' : '→'
}

export function sparkline(scores, width = 130, height = 44) {
  if (scores.length < 2) {
    return `<span style="font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;color:var(--accent)">${scores[0] ?? '—'}%</span>`
  }
  const pad = 4, w = width - pad * 2, h = height - pad * 2
  const pts = scores.map((s, i) => [pad + (i / (scores.length - 1)) * w, pad + h - (s / 100) * h])
  const diff = scores[scores.length - 1] - scores[0]
  const color = diff > 3 ? 'var(--accent2)' : diff < -3 ? '#C0392B' : 'var(--ink3)'
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const [lx, ly] = pts[pts.length - 1]
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.5" fill="${color}"/>
  </svg>`
}

export function testMeta(rs) {
  const scores = rs.filter(r => r.score !== null).map(r => r.score)
  const best = scores.length ? Math.max(...scores) : null
  return [
    `${rs.length} intento${rs.length !== 1 ? 's' : ''}`,
    best !== null ? `Mejor: ${best}%` : null,
    scores.length > 1 ? `Último: ${scores[scores.length - 1]}%` : null,
  ].filter(Boolean).join(' · ')
}

export function filterStudentResults(results, students) {
  const studentIds = new Set(students.map(s => s.id))
  return results.filter(r => studentIds.has(r.user_id))
}
