<template>
  <div id="editor">
    <div class="editor-header">
      <h2>{{ appStore.editingId ? 'Editar test' : 'Nuevo test' }}</h2>
      <div class="actions">
        <button class="btn grammar-btn" :class="{ 'has-issues': grammar.suggestions.value.length }"
          :disabled="grammar.checking.value" @click="runGrammarCheck" title="Revisar ortografía y gramática de las preguntas">
          <svg v-if="grammar.checking.value" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.22-8.56"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
          </svg>
          {{ grammar.checking.value ? 'Revisando…' : 'Revisar gramática' }}
          <span v-if="grammar.suggestions.value.length" class="grammar-badge">{{ grammar.suggestions.value.length }}</span>
        </button>
        <button class="btn" @click="confirmBack">Cancelar</button>
        <button class="btn accent" @click="saveTest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Guardar
        </button>
      </div>
    </div>

    <!-- Grammar suggestions panel — purely advisory, saving works regardless -->
    <div v-if="grammar.ltError.value || grammar.suggestions.value.length" class="grammar-panel">
      <div v-if="grammar.ltError.value" class="grammar-panel-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ grammar.ltError.value }}
        <button class="btn sm" style="margin-left:auto" @click="grammar.clear()">Cerrar</button>
      </div>
      <template v-else>
        <div class="grammar-panel-header">
          <span class="grammar-panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            {{ grammar.suggestions.value.length }} sugerencia{{ grammar.suggestions.value.length !== 1 ? 's' : '' }}
          </span>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn sm accent" @click="grammar.applyAll(appStore.editingQuestions)">Aplicar todo</button>
            <button class="btn sm" @click="grammar.clear()">Cerrar</button>
          </div>
        </div>
        <div class="grammar-list">
          <div v-for="(s, i) in grammar.suggestions.value" :key="`${s.questionIdx}-${s.field}-${s.offset}`" class="grammar-item">
            <div class="grammar-item-meta">
              <span class="grammar-item-label">{{ s.label }}</span>
              <span class="grammar-item-msg">{{ s.message }}</span>
            </div>
            <div class="grammar-item-actions">
              <span class="grammar-original">{{ s.original }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="flex-shrink:0;color:var(--ink3)"><polyline points="9 18 15 12 9 6"/></svg>
              <button v-for="rep in s.replacements" :key="rep" class="btn sm grammar-apply-btn"
                @click="grammar.apply(i, appStore.editingQuestions)" :title="`Cambiar a «${rep}»`">
                {{ rep }}
              </button>
              <button class="btn sm" @click="grammar.dismiss(i)" title="Ignorar">✕</button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="field-group">
      <label>Título del test</label>
      <input type="text" v-model="title" placeholder="Ej: Historia de España Tema 4" maxlength="80">
    </div>
    <div class="field-group">
      <label>Tema</label>
      <input type="text" v-model="topic" placeholder="Ej: Historia, Matemáticas…" maxlength="60" list="topicsList" autocomplete="off">
    </div>
    <div class="field-group">
      <label>Descripción (opcional)</label>
      <input type="text" v-model="description" placeholder="Una breve descripción del test" maxlength="200">
    </div>

    <div class="settings-row">
      <div class="field-group">
        <label>Tiempo límite (minutos)</label>
        <input type="number" v-model.number="timeLimit" min="0" max="360" placeholder="0 = sin límite">
      </div>
      <div class="field-group">
        <label>Orden aleatorio</label>
        <select v-model="shuffle">
          <option :value="false">No — orden fijo</option>
          <option :value="true">Sí — aleatorio</option>
        </select>
      </div>
      <div class="field-group">
        <label>Visible para alumnos</label>
        <select v-model="published">
          <option :value="false">No — borrador (solo yo)</option>
          <option :value="true">Sí — publicado</option>
        </select>
      </div>
      <div class="field-group">
        <label>Máx. intentos</label>
        <input type="number" v-model.number="maxAttempts" min="0" placeholder="0 = ilimitados">
      </div>
      <div class="field-group">
        <label>Fecha límite</label>
        <input type="datetime-local" v-model="deadline">
      </div>
      <div v-if="authStore.isAdmin" class="field-group secret-field">
        <label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="flex-shrink:0"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Test secreto
        </label>
        <select v-model="secret">
          <option :value="false">No — visible para profesores</option>
          <option :value="true">Sí — solo tú lo ves</option>
        </select>
      </div>
    </div>

    <hr class="divider">
    <div class="section-title" style="margin-bottom:1rem">Preguntas</div>

    <div class="questions-list">
      <div v-for="(q, i) in appStore.editingQuestions" :key="q.id" class="question-card">
        <div class="question-header">
          <span class="question-num">P{{ i + 1 }}</span>
          <div class="type-toggle">
            <button :class="['type-btn', q.type === 'single' ? 'active' : '']" @click="changeType(i, 'single')">Una respuesta</button>
            <button :class="['type-btn', q.type === 'multiple' ? 'active' : '']" @click="changeType(i, 'multiple')">Múltiple</button>
            <button :class="['type-btn', q.type === 'open' ? 'active' : '']" @click="changeType(i, 'open')">Abierta</button>
          </div>
          <div class="question-actions">
            <button v-if="i > 0" class="btn sm" title="Subir" @click="moveQuestion(i, -1)">↑</button>
            <button v-if="i < appStore.editingQuestions.length - 1" class="btn sm" title="Bajar" @click="moveQuestion(i, 1)">↓</button>
            <button class="btn sm danger" @click="removeQuestion(i)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div class="field-group" :style="q.type !== 'open' ? 'margin-bottom:0.75rem' : ''">
          <input type="text" v-model="q.text" placeholder="Escribe la pregunta...">
        </div>

        <template v-if="q.type !== 'open'">
          <div class="options-list">
            <div v-for="(o, oi) in q.options" :key="oi" class="option-row">
              <input
                :type="q.type === 'multiple' ? 'checkbox' : 'radio'"
                class="correct-check"
                :name="`correct_${i}`"
                :checked="o.correct"
                @change="handleCorrectChange(i, oi, $event)"
              >
              <input type="text" v-model="o.text" :placeholder="`Opción ${oi + 1}`">
              <button v-if="q.options.length > 2" class="del-opt" @click="removeOption(i, oi)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <button class="btn sm" style="margin-top:8px" @click="addOption(i)">+ Añadir opción</button>
          <p style="font-size:11px;color:var(--ink3);margin-top:6px">
            {{ q.type === 'single' ? 'Selecciona la opción correcta (radio)' : 'Selecciona todas las opciones correctas (checkbox)' }}
          </p>
        </template>
        <template v-else>
          <p style="font-size:12px;color:var(--ink3);margin-top:4px">El usuario escribirá su respuesta libremente. Se revisará manualmente.</p>
        </template>
      </div>
    </div>

    <button class="add-question-btn" @click="addQuestion">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Añadir pregunta
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useGrammarCheck } from '@/composables/useGrammarCheck'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const secret = ref(false)
const grammar = useGrammarCheck()

function runGrammarCheck() {
  grammar.check(appStore.editingQuestions)
}

const title = ref('')
const topic = ref('')
const description = ref('')
const timeLimit = ref(0)
const shuffle = ref(false)
const published = ref(false)
const maxAttempts = ref(0)
const deadline = ref('')

onMounted(() => {
  const t = appStore.editingId ? appStore.tests.find(x => x.id === appStore.editingId) : null
  if (t) {
    title.value = t.title
    topic.value = t.topic || ''
    description.value = t.description || ''
    timeLimit.value = t.timeLimit || 0
    shuffle.value = !!t.shuffle
    published.value = !!t.published
    secret.value = !!t.secret
    maxAttempts.value = t.maxAttempts || 0
    deadline.value = t.deadline ? new Date(t.deadline).toISOString().slice(0, 16) : ''
  } else {
    const meta = appStore.importMeta
    title.value = meta?.title || ''
    topic.value = meta?.topic || appStore.currentTopic || ''
    description.value = meta?.description || ''
    timeLimit.value = meta?.timeLimit ?? 0
    shuffle.value = meta?.shuffle ?? false
    published.value = false
    maxAttempts.value = 0
    deadline.value = ''
    secret.value = authStore.isAdmin   // new tests always default to secret for admin
    appStore.importMeta = null
  }
})

function addQuestion() {
  appStore.editingQuestions.push({
    id: appStore.genId(), type: 'single', text: '',
    options: [{ text: '', correct: true }, { text: '', correct: false }],
  })
  nextTick(() => {
    const list = document.querySelector('.questions-list')
    list?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function removeQuestion(i) {
  appStore.editingQuestions.splice(i, 1)
}

function moveQuestion(i, dir) {
  const j = i + dir
  if (j < 0 || j >= appStore.editingQuestions.length) return
  const qs = appStore.editingQuestions
  ;[qs[i], qs[j]] = [qs[j], qs[i]]
}

function changeType(i, type) {
  const q = appStore.editingQuestions[i]
  q.type = type
  if ((type === 'single' || type === 'multiple') && !q.options?.length) {
    q.options = [{ text: '', correct: true }, { text: '', correct: false }]
  }
}

function addOption(qi) {
  appStore.editingQuestions[qi].options.push({ text: '', correct: false })
}

function removeOption(qi, oi) {
  appStore.editingQuestions[qi].options.splice(oi, 1)
}

function handleCorrectChange(qi, oi, event) {
  const q = appStore.editingQuestions[qi]
  if (q.type === 'single') {
    q.options.forEach((o, i) => { o.correct = i === oi })
  } else {
    q.options[oi].correct = event.target.checked
  }
}

function confirmBack() {
  appStore.showModal('¿Salir sin guardar?', 'Los cambios no guardados se perderán.', () => router.push('/'), 'Salir', true)
}

async function saveTest() {
  const t = title.value.trim()
  if (!t) { appStore.showToast('El título es obligatorio'); return }
  if (!appStore.editingQuestions.length) { appStore.showToast('Añade al menos una pregunta'); return }

  const questions = []
  let valid = true
  for (let i = 0; i < appStore.editingQuestions.length; i++) {
    const q = appStore.editingQuestions[i]
    if (!q.text.trim()) { appStore.showToast(`La pregunta ${i + 1} no tiene texto`); valid = false; break }
    if (q.type !== 'open') {
      const filled = q.options.filter(o => o.text.trim())
      if (filled.length < 2) { appStore.showToast(`La pregunta ${i + 1} necesita al menos 2 opciones`); valid = false; break }
      if (!q.options.some(o => o.correct && o.text.trim())) { appStore.showToast(`Marca al menos una respuesta correcta en la pregunta ${i + 1}`); valid = false; break }
      q.options = q.options.filter(o => o.text.trim())
    }
    questions.push({ ...q })
  }
  if (!valid) return

  const existing = appStore.editingId ? appStore.tests.find(x => x.id === appStore.editingId) : null
  const test = {
    id: appStore.editingId || appStore.genId(),
    title: t,
    topic: topic.value.trim(),
    description: description.value.trim(),
    timeLimit: timeLimit.value || 0,
    shuffle: shuffle.value,
    published: secret.value ? false : published.value,
    secret: secret.value || false,
    maxAttempts: maxAttempts.value || 0,
    deadline: deadline.value ? new Date(deadline.value).toISOString() : null,
    questions,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
  }

  const ok = await appStore.persistTest(test)
  if (!ok) return

  const withOwner = { ...test, _ownerId: existing?._ownerId || authStore.currentUser?.id }
  if (appStore.editingId) {
    const idx = appStore.tests.findIndex(x => x.id === appStore.editingId)
    if (idx >= 0) appStore.tests[idx] = withOwner
  } else {
    appStore.tests.unshift(withOwner)
  }

  router.push('/')
  appStore.showToast('Test guardado ✓')
}
</script>
