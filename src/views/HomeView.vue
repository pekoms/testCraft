<template>
  <!-- MD Import modal -->
  <div v-if="showImportModal" class="modal-overlay open" @click.self="closeImportModal">
    <div class="modal import-md-modal">
      <h3>Importar test desde texto</h3>

      <div class="import-fields-row">
        <div class="field-group" style="flex:2">
          <label>Título del test</label>
          <input type="text" v-model="importTitle" placeholder="Ej: Simulacro TREBEP — Tema 3" maxlength="80">
        </div>
        <div class="field-group" style="flex:1">
          <label>Tema</label>
          <input type="text" v-model="importTopic" placeholder="Ej: TREBEP" maxlength="60"
            list="importTopicsList" autocomplete="off">
          <datalist id="importTopicsList">
            <option v-for="t in allTopics" :key="t" :value="t" />
          </datalist>
        </div>
      </div>

      <div class="import-fields-row" style="gap:12px;flex-wrap:wrap">
        <div class="field-group" style="flex:1;min-width:120px">
          <label>Orden</label>
          <select v-model="importShuffle">
            <option :value="false">Fijo</option>
            <option :value="true">Aleatorio</option>
          </select>
        </div>
        <div class="field-group" style="flex:1;min-width:120px">
          <label>Tiempo límite (min)</label>
          <input type="number" v-model.number="importTimeLimit" min="0" max="360" placeholder="0 = sin límite">
        </div>
        <div class="field-group" style="flex:1;min-width:140px">
          <label>Descripción (opcional)</label>
          <input type="text" v-model="importDescription" placeholder="Breve descripción" maxlength="200">
        </div>
      </div>

      <p class="import-hint" style="margin-top:4px">Pega el texto con las preguntas numeradas y la hoja de soluciones:</p>
      <pre class="import-example">1. Texto de la pregunta
A) Opción A B) Opción B C) Opción C D) Opción D

HOJA DE SOLUCIONES
1  B    2  A</pre>
      <div style="position:relative">
        <textarea v-model="importMDText" rows="10" class="import-textarea"
          placeholder="Pega aquí el texto completo..."></textarea>
        <span v-if="importPreviewCount" class="import-count-badge">{{ importPreviewCount }} preguntas</span>
      </div>
      <p v-if="importError" class="import-error">{{ importError }}</p>
      <div class="modal-actions">
        <button class="btn" @click="closeImportModal">Cancelar</button>
        <button class="btn accent" @click="doImportMD" :disabled="!importMDText.trim() || !importTitle.trim()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Importar
        </button>
      </div>
    </div>
  </div>

  <!-- Custom test config modal -->
  <div v-if="showCustomModal" class="modal-overlay open" @click.self="showCustomModal = false">
    <div class="modal custom-test-modal">
      <h3>Test personalizado</h3>
      <p>Elige cuántas preguntas quieres practicar mezclando todos los temas disponibles.</p>
      <div class="custom-q-picker">
        <div class="custom-q-display">{{ customQCount }}</div>
        <input
          type="range" v-model.number="customQCount"
          :min="1" :max="maxAvailableQ" class="q-slider"
          aria-label="Número de preguntas"
        />
        <div class="custom-q-labels">
          <span>1 pregunta</span>
          <span>{{ maxAvailableQ }} preguntas</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" @click="showCustomModal = false">Cancelar</button>
        <button class="btn accent" @click="launchCustomTest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Empezar
        </button>
      </div>
    </div>
  </div>

  <div id="home">
    <!-- Promotional banner -->
    <div v-if="showBanner" class="promo-banner">
      <div class="promo-content">
        <span>¡Bienvenido a la familia Vitastrong! 💪🎉</span>
        <a href="https://www.vitastrong.es" target="_blank" rel="noopener" class="promo-link">www.vitastrong.es</a>
        <span class="promo-sep">·</span>
        <span>Tu cupón como Ambassador:</span>
        <span class="promo-code">APFIRE</span>
      </div>
      <button class="promo-close" @click="dismissBanner" aria-label="Cerrar anuncio">✕</button>
    </div>

    <div class="home-header">
      <h1 v-if="authStore.isTeacher">
        Crea y comparte<br>tus <span style="color:var(--accent)">tests</span>
      </h1>
      <h1 v-else>Tus <span style="color:var(--accent)">tests</span></h1>
      <p>{{ authStore.isTeacher ? 'Diseña tests y publícalos para que los vean tus alumnos.' : 'Estos son los tests que tu profesor ha publicado.' }}</p>
      <button v-if="authStore.isAdmin" class="btn" @click="showImportModal = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Importar .md
      </button>
      <button v-if="authStore.isTeacher" class="btn accent" @click="newTest">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Nuevo test
      </button>
      <button v-if="!authStore.isTeacher || authStore.isAdmin" class="btn" :disabled="!maxAvailableQ" @click="openCustomModal"
        title="Crear un test mezclando preguntas de todos los temas">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Test personalizado
      </button>
      <div v-if="!authStore.isTeacher || authStore.isAdmin" class="wrong-answers-group">
        <button class="btn" :disabled="!appStore.wrongAnswers.length" @click="appStore.startWrongAnswersTest()"
          :title="appStore.wrongAnswers.length ? `Practicar ${appStore.wrongAnswers.length} pregunta${appStore.wrongAnswers.length !== 1 ? 's' : ''} errónea${appStore.wrongAnswers.length !== 1 ? 's' : ''}` : 'Completa algún test para usar esta función'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>
          Repaso de errores{{ appStore.wrongAnswers.length ? ` (${appStore.wrongAnswers.length})` : '' }}
        </button>
        <button v-if="appStore.wrongAnswers.length" class="btn sm danger reset-wrong-btn" @click="confirmResetWrong" title="Poner el contador de preguntas erróneas a 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
        </button>
      </div>
      <button v-if="(!authStore.isTeacher || authStore.isAdmin) && appStore.completedTestIds.length"
        class="btn sm" @click="confirmResetCompleted" title="Borrar el registro de tests completados">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
        Resetear progreso
      </button>
    </div>

    <!-- Breadcrumb when inside a topic -->
    <div v-if="appStore.currentTopic !== null" class="topic-breadcrumb">
      <button class="btn sm" @click="appStore.backToTopics()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="15 18 9 12 15 6"/></svg>
        Todos los temas
      </button>
      <button v-if="!authStore.isTeacher || authStore.isAdmin"
        class="btn sm accent" :disabled="!topicQuestionCount"
        @click="appStore.startTopicTest(appStore.currentTopic)"
        :title="topicQuestionCount ? `Practicar las ${topicQuestionCount} preguntas de este tema en orden aleatorio` : 'No hay preguntas en este tema'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Practicar tema completo{{ topicQuestionCount ? ` (${topicQuestionCount})` : '' }}
      </button>
    </div>

    <div class="section-title">{{ sectionTitle }}</div>

    <!-- Topics grid -->
    <div v-if="appStore.currentTopic === null" class="tests-grid">
      <template v-if="!appStore.tests.length">
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--ink3);margin:0 auto 8px;display:block"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="15" x2="12" y2="15"/></svg>
          <strong>{{ authStore.isTeacher ? 'Aún no tienes tests' : 'No hay tests disponibles' }}</strong>
          <p>{{ authStore.isTeacher ? 'Crea tu primer test con el botón de arriba.' : 'Cuando tu profesor publique un test, aparecerá aquí.' }}</p>
        </div>
      </template>
      <template v-else>
        <div v-for="[topic, topicTests] in topicEntries" :key="topic"
          class="topic-card" :class="{ 'secret-topic': hasSecretTests(topicTests) }"
          @click="appStore.showTopic(topic)">
          <div class="topic-title">
            <span>{{ topic || 'Sin tema' }}</span>
            <div style="display:flex;align-items:center;gap:6px">
              <span v-if="hasSecretTests(topicTests)" class="badge secret-badge topic-secret-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10" style="margin-right:3px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>{{ secretCount(topicTests) > 1 ? secretCount(topicTests) + ' secretos' : 'Secreto' }}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
          <div class="topic-meta">
            {{ visibleCount(topicTests) }} test{{ visibleCount(topicTests) !== 1 ? 's' : '' }}{{ draftText(topicTests) }}
            <span v-if="!authStore.isTeacher || authStore.isAdmin" class="topic-progress"
              :class="completedCount(topicTests) > 0 && completedCount(topicTests) === visibleCount(topicTests) ? 'all-done' : ''">
              · {{ completedCount(topicTests) }}/{{ visibleCount(topicTests) }} hechos
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- Tests in a topic -->
    <div v-else class="tests-grid">
      <div v-if="!visibleTopicTests.length" class="empty-state">
        <strong>{{ authStore.isTeacher ? 'No hay tests en este tema' : 'No hay tests disponibles en este tema' }}</strong>
        <p v-if="authStore.isTeacher">Crea un test y asígnale este tema.</p>
      </div>
      <div v-for="t in visibleTopicTests" :key="t.id"
        class="test-card" :class="{ 'secret-card': t.secret && authStore.isAdmin }"
        @click="appStore.startTest(t.id)">
        <div v-if="(!authStore.isTeacher || authStore.isAdmin) && appStore.completedTestIds.includes(t.id)"
          class="test-done-badge" title="Ya has completado este test">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3>{{ t.title }}</h3>
        <span v-if="t.secret && authStore.isAdmin" class="badge secret-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10" style="margin-right:3px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Secreto
        </span>
        <p>{{ t.description || 'Sin descripción' }}</p>
        <span class="badge">{{ t.questions.length }} pregunta{{ t.questions.length !== 1 ? 's' : '' }}</span>
        <span v-if="t.timeLimit" class="badge" style="background:var(--accent2-light);color:var(--accent2);margin-left:4px">⏱ {{ t.timeLimit }} min</span>
        <span v-if="deadlineInfo(t)" class="badge" :class="deadlineInfo(t).cls" style="margin-left:4px">{{ deadlineInfo(t).label }}</span>

        <div v-if="authStore.isTeacher" style="margin-top:8px">
          <span class="badge" :style="t.published ? 'background:var(--accent2-light);color:var(--accent2);margin-left:4px' : 'background:var(--surface2);color:var(--ink3);margin-left:4px'">
            {{ t.published ? 'Publicado' : 'Borrador' }}
          </span>
          <span v-if="t.maxAttempts" class="badge" style="background:var(--surface2);color:var(--ink3);margin-left:4px">
            {{ t.maxAttempts }} intento{{ t.maxAttempts !== 1 ? 's' : '' }} máx.
          </span>
        </div>

        <!-- Teacher actions in footer row, below card content -->
        <div v-if="authStore.isTeacher && isOwner(t)" class="card-actions" @click.stop>
          <button class="btn sm" @click="appStore.togglePublish(t.id)" :title="t.published ? 'Ocultar a los alumnos' : 'Publicar para los alumnos'">
            <svg v-if="t.published" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn sm" @click="appStore.duplicateTest(t.id)" title="Duplicar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn sm" @click="editTest(t.id)" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn sm danger" @click="appStore.deleteTest(t.id)" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Topics datalist for editor autocomplete -->
    <datalist id="topicsList">
      <option v-for="topic in allTopics" :key="topic" :value="topic" />
    </datalist>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const BANNER_KEY = 'vitastrong_banner_v1'
let _bannerVisible = true
try { _bannerVisible = !localStorage.getItem(BANNER_KEY) } catch {}
const showBanner = ref(_bannerVisible)

// MD Import modal
const showImportModal = ref(false)
const importMDText = ref('')
const importError = ref('')
const importTitle = ref('')
const importTopic = ref('')
const importDescription = ref('')
const importShuffle = ref(false)
const importTimeLimit = ref(0)

const importPreviewCount = computed(() => {
  const text = importMDText.value
  if (!text.trim()) return 0
  return (text.match(/^\d+[.)]\s/gm) || []).length
})

function closeImportModal() {
  showImportModal.value = false
  importMDText.value = ''
  importError.value = ''
  importTitle.value = ''
  importTopic.value = ''
  importDescription.value = ''
  importShuffle.value = false
  importTimeLimit.value = 0
}

function parseMDTest(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  // Locate solutions section
  let solIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase()
    if (l.includes('hoja de soluciones') || (l.includes('pregunta') && l.includes('solución'))) {
      solIdx = i; break
    }
  }

  const bodyLines = solIdx > -1 ? lines.slice(0, solIdx) : lines
  const solLines = solIdx > -1 ? lines.slice(solIdx + 1) : []

  // Build { qNumber: 'A'|'B'|'C'|'D' } from solutions table
  const solutions = {}
  for (const line of solLines) {
    const m = line.trim().match(/^(\d+)\s+([ABCD])(?:\s|$)/)
    if (m) solutions[+m[1]] = m[2]
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

function doImportMD() {
  importError.value = ''
  if (!importTitle.value.trim()) { importError.value = 'El título es obligatorio'; return }
  const parsed = parseMDTest(importMDText.value)
  if (!parsed.length) {
    importError.value = 'No se encontraron preguntas. Revisa el formato: preguntas numeradas (1. Texto...) y opciones A) B) C) D).'
    return
  }
  appStore.editingId = null
  appStore.editingQuestions = parsed
  appStore.importSecret = true
  appStore.importMeta = {
    title: importTitle.value.trim(),
    topic: importTopic.value.trim(),
    description: importDescription.value.trim(),
    shuffle: importShuffle.value,
    timeLimit: importTimeLimit.value || 0,
  }
  closeImportModal()
  router.push('/editor')
  appStore.showToast(`${parsed.length} preguntas importadas ✓`)
}

// Custom test modal
const showCustomModal = ref(false)
const customQCount = ref(10)
const maxAvailableQ = computed(() => appStore.countAvailableQuestions())

function openCustomModal() {
  customQCount.value = Math.min(10, maxAvailableQ.value || 1)
  showCustomModal.value = true
}
function launchCustomTest() {
  showCustomModal.value = false
  appStore.startCustomTest(customQCount.value)
}
function confirmResetWrong() {
  appStore.showModal(
    'Resetear preguntas erróneas',
    '¿Seguro? Se borrará el historial de preguntas erróneas y el contador volverá a 0.',
    () => appStore.clearWrongAnswers(),
    'Resetear', true,
  )
}

function confirmResetCompleted() {
  appStore.showModal(
    'Resetear tests completados',
    '¿Seguro? Se borrarán los checks verdes de todos los tests. El historial de resultados no se elimina.',
    () => appStore.resetCompletedTests(),
    'Resetear', true,
  )
}

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

onMounted(() => {
  if (!authStore.isTeacher || authStore.isAdmin) {
    appStore.loadWrongAnswers()
    appStore.loadCompletedTests()
  }
})

const sectionTitle = computed(() => {
  if (appStore.currentTopic === null) return authStore.isTeacher ? 'Temas' : 'Temas disponibles'
  return appStore.currentTopic || 'Sin tema'
})

const allTopics = computed(() =>
  [...new Set(appStore.tests.map(t => t.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
)

const topicEntries = computed(() => {
  const map = {}
  appStore.tests.forEach(t => {
    const key = t.topic || ''
    if (!map[key]) map[key] = []
    map[key].push(t)
  })
  return Object.entries(map)
    .filter(([, tests]) => authStore.isTeacher || visibleCount(tests) > 0)
    .sort(([a], [b]) => {
      if (!a && b) return 1
      if (a && !b) return -1
      return a.localeCompare(b, 'es')
    })
})

function visibleCount(tests) {
  return authStore.isTeacher ? tests.length : tests.filter(t => t.published).length
}

function completedCount(tests) {
  const visible = authStore.isTeacher ? tests : tests.filter(t => t.published)
  return visible.filter(t => appStore.completedTestIds.includes(t.id)).length
}

function hasSecretTests(tests) {
  return authStore.isAdmin && tests.some(t => t.secret)
}

function secretCount(tests) {
  return tests.filter(t => t.secret).length
}

function draftText(tests) {
  if (!authStore.isTeacher) return ''
  const n = tests.filter(t => !t.published).length
  return n ? ` · ${n} borrador${n !== 1 ? 'es' : ''}` : ''
}

const topicQuestionCount = computed(() => {
  const topic = appStore.currentTopic
  if (topic === null) return 0
  let n = 0
  appStore.tests
    .filter(t => (t.topic || '') === topic && (authStore.isTeacher || t.published))
    .forEach(t => t.questions?.forEach(q => { if (q.type !== 'open') n++ }))
  return n
})

const visibleTopicTests = computed(() => {
  const topic = appStore.currentTopic
  const all = appStore.tests.filter(t => (t.topic || '') === topic)
  return authStore.isTeacher ? all : all.filter(t => t.published)
})

function isOwner(t) {
  return !authStore.currentUser || authStore.isAdmin || t._ownerId === authStore.currentUser?.id
}

function deadlineInfo(t) {
  if (!t.deadline) return null
  const d = new Date(t.deadline), now = new Date()
  const expired = d < now
  const soon = !expired && (d - now) < 24 * 3600 * 1000
  return {
    cls: expired ? 'deadline-expired' : soon ? 'deadline-soon' : '',
    label: expired ? 'Plazo vencido' : `Plazo: ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
  }
}

function dismissBanner() {
  try { localStorage.setItem(BANNER_KEY, '1') } catch {}
  showBanner.value = false
}

function newTest() {
  appStore.editingId = null
  appStore.editingQuestions = [{
    id: appStore.genId(), type: 'single', text: '',
    options: [{ text: '', correct: true }, { text: '', correct: false }],
  }]
  router.push('/editor')
}

function editTest(id) {
  const t = appStore.tests.find(x => x.id === id)
  if (!t) return
  appStore.editingId = id
  appStore.editingQuestions = JSON.parse(JSON.stringify(t.questions))
  router.push('/editor')
}
</script>
