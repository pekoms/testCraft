<template>
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
      <div v-if="(!authStore.isTeacher || authStore.isAdmin) && appStore.completedTestIds.size" class="wrong-answers-group">
        <button class="btn" disabled style="cursor:default">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {{ appStore.completedTestIds.size }} test{{ appStore.completedTestIds.size !== 1 ? 's' : '' }} completado{{ appStore.completedTestIds.size !== 1 ? 's' : '' }}
        </button>
        <button class="btn sm danger reset-wrong-btn" @click="confirmResetCompleted" title="Borrar el registro de tests completados">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
        </button>
      </div>
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
          class="topic-card" @click="appStore.showTopic(topic)">
          <div class="topic-title">
            <span>{{ topic || 'Sin tema' }}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div class="topic-meta">
            {{ visibleCount(topicTests) }} test{{ visibleCount(topicTests) !== 1 ? 's' : '' }}{{ draftText(topicTests) }}
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
      <div v-for="t in visibleTopicTests" :key="t.id" class="test-card" @click="appStore.startTest(t.id)">
        <div v-if="(!authStore.isTeacher || authStore.isAdmin) && appStore.completedTestIds.has(t.id)"
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
    .forEach(t => t.questions.forEach(q => { if (q.type !== 'open') n++ }))
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
