<template>
  <div id="stats">
    <div class="home-header" style="padding-top:1rem;padding-bottom:1.5rem">
      <h1 v-if="authStore.isTeacher">
        Estadísticas de <span style="color:var(--accent)">alumnos</span>
      </h1>
      <h1 v-else>
        Mis <span style="color:var(--accent)">estadísticas</span>
      </h1>
      <p>{{ authStore.isTeacher ? 'Seguimiento del progreso de tus alumnos.' : 'Sigue tu evolución en cada test.' }}</p>
    </div>

    <!-- KPI summary -->
    <div class="stats-summary">
      <div v-for="kpi in kpis" :key="kpi.label" class="stats-kpi">
        <div class="stats-kpi-num">{{ kpi.num }}</div>
        <div class="stats-kpi-label">{{ kpi.label }}</div>
      </div>
    </div>

    <!-- Header row: title + export buttons -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;gap:8px;flex-wrap:wrap">
      <div class="section-title" style="margin-bottom:0">{{ listTitle }}</div>
      <div v-if="results.length" style="display:flex;gap:6px">
        <button v-if="authStore.isTeacher" class="btn sm" @click="exportCSV">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          CSV
        </button>
        <button class="btn sm" @click="exportPDF">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          PDF
        </button>
      </div>
    </div>

    <!-- Loading / Error -->
    <div v-if="loading" class="students-empty">Cargando…</div>
    <div v-else-if="loadError" class="students-empty">Error al cargar: {{ loadError }}</div>

    <!-- Student stats -->
    <template v-else-if="!authStore.isTeacher">
      <div v-if="!results.length" class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ink3);margin:0 auto 8px;display:block">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <strong>Aún no has completado ningún test</strong>
        <p>Completa un test y aquí verás tu progreso.</p>
      </div>
      <div v-for="[testId, group] in studentGroups" :key="testId" class="stats-test-card" style="flex-direction:column;align-items:stretch;gap:0.75rem">
        <!-- Main row: info + sparkline + trend -->
        <div style="display:flex;align-items:center;gap:1.25rem">
          <div class="stats-test-info">
            <div class="stats-test-name">{{ group.title }}</div>
            <div class="stats-test-meta">{{ testMeta(group.results) }}</div>
          </div>
          <span v-if="group.scores.length" v-html="sparkline(group.scores)"></span>
          <span v-else style="color:var(--ink3);font-size:12px">Respuesta abierta</span>
          <span v-if="group.scores.length >= 2" class="stats-trend" :class="trendClass(group.scores)">
            {{ trendLabel(group.scores) }}
          </span>
        </div>
        <!-- Action row -->
        <div style="border-top:1px solid var(--border);padding-top:0.65rem;display:flex;justify-content:flex-end">
          <button class="btn sm" @click="retryTest(testId)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.16"/>
            </svg>
            Reintentar
          </button>
        </div>
      </div>
    </template>

    <!-- Teacher: per-student list -->
    <template v-else>
      <div v-if="!activeStudents.length" class="empty-state">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ink3);margin:0 auto 8px;display:block">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        <strong>Ningún alumno ha completado tests todavía</strong>
        <p>Aquí verás el progreso de tus alumnos cuando completen sus primeros tests.</p>
      </div>
      <div v-for="item in activeStudents" :key="item.s.id" class="stats-student-card">
        <div class="stats-student-email" :title="item.s.email">{{ item.s.email }}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <template v-if="item.avg !== null">
            <div class="stats-student-score">{{ item.avg }}%</div>
            <span v-if="item.scores.length >= 2" class="stats-trend" :class="trendClass(item.scores)" style="font-size:11px;padding:2px 7px">
              {{ trendArrow(item.scores) }}
            </span>
          </template>
          <span v-else style="color:var(--ink3);font-size:12px">—</span>
        </div>
        <div class="stats-student-meta">
          {{ item.rs.length }} intento{{ item.rs.length !== 1 ? 's' : '' }}
          <br v-if="item.latest">
          {{ item.latest }}
        </div>
        <button class="btn sm" @click="openDetail(item.s)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Detalle
        </button>
      </div>
    </template>

    <!-- Student detail overlay -->
    <StatsDetailModal
      :open="detailOpen"
      :user-id="detailUserId"
      :email="detailEmail"
      @close="detailOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useUsersStore } from '@/stores/users'
import { supabase } from '@/lib/supabase'
import StatsDetailModal from '@/components/StatsDetailModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const usersStore = useUsersStore()

const loading = ref(true)
const loadError = ref('')
const results = ref([])
const students = ref([])

const detailOpen = ref(false)
const detailUserId = ref('')
const detailEmail = ref('')

onMounted(load)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    if (!supabase) {
      loadError.value = 'Las estadísticas requieren sesión iniciada.'
      return
    }
    if (authStore.isTeacher) {
      const [{ students: list }, { data: res }] = await Promise.all([
        usersStore.callManageUsers('list'),
        supabase.from('test_results').select('*').order('completed_at', { ascending: true }),
      ])
      students.value = list
      results.value = res || []
    } else {
      const { data: res, error } = await supabase
        .from('test_results').select('*').order('completed_at', { ascending: true })
      if (error) throw error
      results.value = res || []
    }
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Student view ──────────────────────────────
const studentGroups = computed(() => {
  const map = new Map()
  results.value.forEach(r => {
    if (!map.has(r.test_id)) map.set(r.test_id, { title: r.test_title, results: [], scores: [] })
    const g = map.get(r.test_id)
    g.results.push(r)
    if (r.score !== null) g.scores.push(r.score)
  })
  return map
})

const kpis = computed(() => {
  if (!authStore.isTeacher) {
    const scored = results.value.filter(r => r.score !== null)
    const avg = scored.length ? Math.round(scored.reduce((a, r) => a + r.score, 0) / scored.length) : null
    const best = scored.length ? Math.max(...scored.map(r => r.score)) : null
    return [
      { num: results.value.length, label: 'Intentos' },
      { num: avg !== null ? avg + '%' : '—', label: 'Promedio' },
      { num: best !== null ? best + '%' : '—', label: 'Mejor nota' },
      { num: new Set(results.value.map(r => r.test_id)).size, label: 'Tests distintos' },
    ]
  }
  const scored = results.value.filter(r => r.score !== null)
  const globalAvg = scored.length ? Math.round(scored.reduce((a, r) => a + r.score, 0) / scored.length) : null
  return [
    { num: students.value.length, label: 'Alumnos' },
    { num: results.value.length, label: 'Tests completados' },
    { num: globalAvg !== null ? globalAvg + '%' : '—', label: 'Promedio general' },
  ]
})

const listTitle = computed(() => authStore.isTeacher ? 'Por alumno' : 'Progreso por test')

function testMeta(rs) {
  const scores = rs.filter(r => r.score !== null).map(r => r.score)
  const best = scores.length ? Math.max(...scores) : null
  return [
    `${rs.length} intento${rs.length !== 1 ? 's' : ''}`,
    best !== null ? `Mejor: ${best}%` : null,
    scores.length > 1 ? `Último: ${scores[scores.length - 1]}%` : null,
  ].filter(Boolean).join(' · ')
}

// ── Retry ─────────────────────────────────────
async function retryTest(testId) {
  const test = appStore.tests.find(t => t.id === testId)
  if (!test) {
    appStore.showToast('Este test ya no está disponible')
    return
  }
  await appStore.startTest(testId)
}

// ── Teacher view ──────────────────────────────
const byStudent = computed(() => {
  const map = {}
  results.value.forEach(r => {
    if (!map[r.user_id]) map[r.user_id] = []
    map[r.user_id].push(r)
  })
  return map
})

const activeStudents = computed(() =>
  students.value
    .filter(s => byStudent.value[s.id]?.length)
    .map(s => {
      const rs = byStudent.value[s.id]
      const sScored = rs.filter(r => r.score !== null)
      const avg = sScored.length ? Math.round(sScored.reduce((a, r) => a + r.score, 0) / sScored.length) : null
      const scores = sScored.map(r => r.score)
      const latest = rs.length ? new Date(rs[rs.length - 1].completed_at).toLocaleDateString('es-ES') : null
      return { s, rs, avg, scores, latest }
    })
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))
)

function openDetail(s) {
  detailUserId.value = s.id
  detailEmail.value = s.email
  detailOpen.value = true
}

// ── Export CSV ────────────────────────────────
async function exportCSV() {
  try {
    const emailMap = Object.fromEntries(students.value.map(s => [s.id, s.email]))
    const csvEsc = s => `"${String(s ?? '').replace(/"/g, '""')}"`
    const headers = ['Email', 'Test', 'Nota (%)', 'Correctas', 'Total preguntas', 'Fecha']
    const rows = results.value.map(r => [
      emailMap[r.user_id] || r.user_id,
      r.test_title, r.score ?? '', r.correct, r.total,
      new Date(r.completed_at).toLocaleString('es-ES'),
    ].map(csvEsc).join(','))
    const csv = '﻿' + [headers.map(csvEsc).join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `testcraft_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    appStore.showToast('CSV descargado ✓')
  } catch (e) { appStore.showToast('Error al exportar: ' + e.message) }
}

// ── Export PDF ────────────────────────────────
function exportPDF() {
  const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  const kpiHtml = kpis.value.map(k =>
    `<div class="kpi"><div class="kpi-num">${k.num}</div><div class="kpi-label">${k.label}</div></div>`
  ).join('')

  let tableHead = '', tableBody = ''

  if (authStore.isTeacher) {
    tableHead = '<tr><th>Alumno</th><th>Intentos</th><th>Promedio</th><th>Mejor nota</th><th>Último test</th></tr>'
    tableBody = activeStudents.value.map(item => {
      const best = item.scores.length ? Math.max(...item.scores) + '%' : '—'
      return `<tr>
        <td>${item.s.email}</td>
        <td class="center">${item.rs.length}</td>
        <td class="center score">${item.avg !== null ? item.avg + '%' : '—'}</td>
        <td class="center">${best}</td>
        <td class="center">${item.latest || '—'}</td>
      </tr>`
    }).join('')
  } else {
    const email = authStore.currentUser?.email || ''
    tableHead = '<tr><th>Test</th><th>Intentos</th><th>Último</th><th>Mejor nota</th></tr>'
    tableBody = [...studentGroups.value.entries()].map(([, group]) => {
      const best = group.scores.length ? Math.max(...group.scores) + '%' : '—'
      const last = group.scores.length ? group.scores[group.scores.length - 1] + '%' : '—'
      return `<tr>
        <td>${group.title}</td>
        <td class="center">${group.results.length}</td>
        <td class="center score">${last}</td>
        <td class="center">${best}</td>
      </tr>`
    }).join('')
  }

  const title = authStore.isTeacher
    ? 'Estadísticas de alumnos — TestCraft'
    : `Mis estadísticas — ${authStore.currentUser?.email || ''}`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1A1814; padding: 32px; }
    h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
    .meta { color: #5A5650; font-size: 11px; margin-bottom: 24px; }
    .kpis { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
    .kpi { border: 1px solid #ddd; border-radius: 10px; padding: 12px 20px; min-width: 100px; text-align: center; }
    .kpi-num { font-size: 20px; font-weight: 800; color: #D4571C; line-height: 1.1; }
    .kpi-label { font-size: 9px; color: #9A968F; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1A1814; color: #fff; padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
    td { padding: 9px 12px; border-bottom: 1px solid #ede9e2; }
    tr:last-child td { border-bottom: none; }
    .center { text-align: center; }
    .score { font-weight: 700; color: #D4571C; }
    @media print {
      body { padding: 20px; }
      @page { margin: 20mm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">TestCraft · Generado el ${date}</div>
  <div class="kpis">${kpiHtml}</div>
  <table>
    <thead>${tableHead}</thead>
    <tbody>${tableBody}</tbody>
  </table>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) {
    appStore.showToast('Activa las ventanas emergentes para exportar PDF')
    return
  }
  win.document.write(html)
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 400)
}

// ── Sparkline helpers ─────────────────────────
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
  if (scores.length < 2) return 'flat'
  const diff = scores[scores.length - 1] - scores[0]
  return diff > 3 ? 'up' : diff < -3 ? 'down' : 'flat'
}

function trendLabel(scores) {
  if (scores.length < 2) return ''
  const diff = scores[scores.length - 1] - scores[0]
  if (diff > 3) return `↑ +${Math.round(diff)}%`
  if (diff < -3) return `↓ ${Math.round(diff)}%`
  return '→ estable'
}

function trendArrow(scores) {
  const cls = trendClass(scores)
  return cls === 'up' ? '↑' : cls === 'down' ? '↓' : '→'
}
</script>
