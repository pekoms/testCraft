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
        <div class="stats-kpi-num" :style="smallNum ? 'font-size:1.5rem' : ''">{{ kpi.num }}</div>
        <div class="stats-kpi-label">{{ kpi.label }}</div>
      </div>
    </div>

    <!-- Header row: title + export -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
      <div class="section-title" style="margin-bottom:0">{{ listTitle }}</div>
      <button v-if="authStore.isTeacher && results.length" class="btn sm" @click="exportCSV">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Exportar CSV
      </button>
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
      <div v-for="[testId, group] in studentGroups" :key="testId" class="stats-test-card">
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
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useUsersStore } from '@/stores/users'
import { supabase } from '@/lib/supabase'
import StatsDetailModal from '@/components/StatsDetailModal.vue'

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

const smallNum = false
</script>
