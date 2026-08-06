<template>
  <div class="stats-detail-overlay" :class="{ open }" @click.self="$emit('close')">
    <div class="stats-detail-modal">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1.25rem">
        <div>
          <div style="font-size:11px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Alumno</div>
          <h3 style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;word-break:break-all">{{ email }}</h3>
        </div>
        <button class="btn sm" @click="$emit('close')" style="flex-shrink:0">✕</button>
      </div>

      <div v-if="loading" class="stats-summary">
        <div style="color:var(--ink3);font-size:13px">Cargando…</div>
      </div>
      <div v-else class="stats-summary" style="margin-bottom:1.5rem">
        <div v-for="kpi in kpis" :key="kpi.label" class="stats-kpi">
          <div class="stats-kpi-num" style="font-size:1.5rem">{{ kpi.num }}</div>
          <div class="stats-kpi-label">{{ kpi.label }}</div>
        </div>
      </div>

      <div class="section-title" style="margin-bottom:0.75rem">Progreso por test</div>

      <div v-if="loading" class="students-empty">—</div>
      <template v-else>
        <div v-if="!byTest.length" class="students-empty">Sin resultados.</div>
        <div v-for="group in byTest" :key="group.testId"
          class="stats-test-card stacked"
          style="padding:0.9rem 1.1rem;margin-bottom:6px"
        >
          <div class="stats-test-row" style="gap:1rem">
            <div class="stats-test-info">
              <div class="stats-test-name">{{ group.title }}</div>
              <div class="stats-test-meta">{{ group.meta }}</div>
            </div>
            <span v-if="group.scores.length" v-html="sparkline(group.scores, 100, 36)"></span>
            <span v-if="group.scores.length >= 2" class="stats-trend" :class="trendClass(group.scores)">
              {{ trendLabel(group.scores) }}
            </span>
          </div>

          <!-- Per-question breakdown from latest attempt -->
          <div v-if="group.answers.length" style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">
            <div style="font-size:11px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">
              Último intento{{ group.latestDate ? ' · ' + group.latestDate : '' }}
            </div>
            <div v-for="(a, i) in group.answers" :key="i" class="answer-row">
              <span class="answer-icon" :class="a.type === 'open' ? '' : a.ok ? 'answer-ok' : 'answer-fail'"
                :style="a.type === 'open' ? 'color:var(--accent)' : ''">
                {{ a.type === 'open' ? '✎' : a.ok ? '✓' : '✗' }}
              </span>
              <div>
                <span class="answer-q-text">P{{ i + 1 }}: {{ a.q }}</span>
                <template v-if="a.type === 'open'">
                  <span class="answer-open">{{ a.ans || '' }}</span>
                </template>
                <template v-else-if="a.ok">
                  <span class="answer-ok">{{ a.ans }}</span>
                </template>
                <template v-else>
                  <span class="answer-fail">{{ a.ans }}</span>
                  <span style="color:var(--ink3)"> → </span>
                  <span class="answer-corr">{{ a.correct }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabase'

const props = defineProps({
  open: Boolean,
  userId: String,
  email: String,
})
defineEmits(['close'])

const loading = ref(false)
const kpis = ref([])
const byTest = ref([])

watch(() => props.open, async (isOpen) => {
  if (!isOpen || !props.userId) return
  loading.value = true
  kpis.value = []
  byTest.value = []

  const { data: results, error } = await supabase
    .from('test_results').select('*')
    .eq('user_id', props.userId).order('completed_at', { ascending: true })

  if (error) { loading.value = false; return }

  const scored = results.filter(r => r.score !== null)
  const avg = scored.length ? Math.round(scored.reduce((a, r) => a + r.score, 0) / scored.length) : null
  const best = scored.length ? Math.max(...scored.map(r => r.score)) : null
  const latest = scored.length ? scored[scored.length - 1].score : null

  const timed = results.filter(r => r.duration_seconds != null)
  const avgTime = timed.length
    ? Math.round(timed.reduce((a, r) => a + r.duration_seconds, 0) / timed.length)
    : null

  kpis.value = [
    { num: results.length, label: 'Intentos' },
    { num: avg !== null ? avg + '%' : '—', label: 'Promedio' },
    { num: best !== null ? best + '%' : '—', label: 'Mejor nota' },
    { num: avgTime !== null ? fmtTime(avgTime) : '—', label: 'Tiempo medio' },
  ]

  const map = new Map()
  results.forEach(r => {
    if (!map.has(r.test_id)) map.set(r.test_id, { title: r.test_title, results: [] })
    map.get(r.test_id).results.push(r)
  })

  byTest.value = [...map.entries()].map(([testId, g]) => {
    const scores = g.results.filter(r => r.score !== null).map(r => r.score)
    const attempts = scores.map(s => s + '%').join(' → ')
    const latestR = g.results[g.results.length - 1]
    return {
      testId,
      title: g.title,
      scores,
      meta: [
        `${g.results.length} intento${g.results.length !== 1 ? 's' : ''}`,
        scores.length ? attempts : 'Respuesta abierta',
      ].join(' · '),
      answers: latestR?.answers || [],
      latestDate: latestR?.completed_at ? new Date(latestR.completed_at).toLocaleDateString('es-ES') : '',
    }
  })

  loading.value = false
})

function fmtTime(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${s}s`
}

function sparkline(scores, width = 130, height = 44) {
  if (scores.length < 2) return `<span style="font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;color:var(--accent)">${scores[0] ?? '—'}%</span>`
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

function trendClass(scores) {
  const diff = scores[scores.length - 1] - scores[0]
  return diff > 3 ? 'up' : diff < -3 ? 'down' : 'flat'
}

function trendLabel(scores) {
  const diff = scores[scores.length - 1] - scores[0]
  if (diff > 3) return `↑ +${Math.round(diff)}%`
  if (diff < -3) return `↓ ${Math.round(diff)}%`
  return '→ estable'
}
</script>
