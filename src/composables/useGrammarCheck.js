import { ref } from 'vue'

const LT_API = 'https://api.languagetool.org/v2/check'
// Two newlines as separator — short, clean, won't produce grammar errors across segments.
const SEP = '\n\n'

export function useGrammarCheck() {
  const checking = ref(false)
  const suggestions = ref([])
  const ltError = ref(null)

  async function check(questions) {
    checking.value = true
    ltError.value = null
    suggestions.value = []

    // Build a flat text from all question and option texts, tracking each segment's offset.
    const segments = []
    const parts = []
    let offset = 0

    questions.forEach((q, qi) => {
      const qText = (q.text || '').trim()
      if (qText) {
        segments.push({ questionIdx: qi, field: 'text', label: `P${qi + 1} · Pregunta`, startOffset: offset, endOffset: offset + qText.length })
        parts.push(qText)
        offset += qText.length + SEP.length
      }
      if (q.type !== 'open') {
        ;(q.options || []).forEach((opt, oi) => {
          const optText = (opt.text || '').trim()
          if (optText) {
            segments.push({ questionIdx: qi, field: `opt_${oi}`, label: `P${qi + 1} · Opción ${oi + 1}`, startOffset: offset, endOffset: offset + optText.length })
            parts.push(optText)
            offset += optText.length + SEP.length
          }
        })
      }
    })

    if (!parts.length) { checking.value = false; return }

    const fullText = parts.join(SEP)

    try {
      const body = new URLSearchParams({
        text: fullText,
        language: 'es',
        disabledRules: 'WHITESPACE_RULE,COMMA_PARENTHESIS_WHITESPACE',
      })
      const res = await fetch(LT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const result = []
      ;(data.matches || []).forEach(match => {
        // Find which segment owns this match offset.
        const seg = segments.find(s => match.offset >= s.startOffset && match.offset < s.endOffset)
        if (!seg) return
        const replacements = (match.replacements || []).slice(0, 3).map(r => r.value)
        if (!replacements.length) return // no actionable suggestion — skip

        const localOffset = match.offset - seg.startOffset
        const q = questions[seg.questionIdx]
        const rawText = seg.field === 'text'
          ? q?.text || ''
          : q?.options?.[parseInt(seg.field.split('_')[1])]?.text || ''

        result.push({
          questionIdx: seg.questionIdx,
          field: seg.field,
          label: seg.label,
          offset: localOffset,
          length: match.length,
          message: match.shortMessage || match.message,
          replacements,
          // Snapshot of the word/phrase being flagged (for display).
          original: rawText.slice(localOffset, localOffset + match.length),
        })
      })
      suggestions.value = result
    } catch {
      ltError.value = 'No se pudo contactar con el revisor. Puedes guardar el test igualmente.'
    } finally {
      checking.value = false
    }
  }

  function _applyToQuestion(s, questions) {
    const q = questions[s.questionIdx]
    if (!q || !s.replacements.length) return
    const rep = s.replacements[0]
    if (s.field === 'text') {
      q.text = q.text.slice(0, s.offset) + rep + q.text.slice(s.offset + s.length)
    } else {
      const oi = parseInt(s.field.split('_')[1])
      const opt = q.options?.[oi]
      if (opt) opt.text = opt.text.slice(0, s.offset) + rep + opt.text.slice(s.offset + s.length)
    }
  }

  function apply(idx, questions) {
    const s = suggestions.value[idx]
    if (!s) return
    _applyToQuestion(s, questions)
    suggestions.value.splice(idx, 1)
  }

  // Apply all suggestions, processing each field back-to-front so offsets stay valid.
  function applyAll(questions) {
    const grouped = new Map()
    suggestions.value.forEach(s => {
      const key = `${s.questionIdx}::${s.field}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key).push(s)
    })
    grouped.forEach(group => {
      group.sort((a, b) => b.offset - a.offset) // highest offset first
      group.forEach(s => _applyToQuestion(s, questions))
    })
    suggestions.value = []
  }

  function dismiss(idx) {
    suggestions.value.splice(idx, 1)
  }

  function clear() {
    suggestions.value = []
    ltError.value = null
  }

  return { checking, suggestions, ltError, check, apply, applyAll, dismiss, clear }
}
