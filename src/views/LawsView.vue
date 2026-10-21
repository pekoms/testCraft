<template>
  <div id="laws">

    <!-- Header -->
    <div class="laws-header">
      <h1>
        Leyes
        <span v-if="totalVisible" class="pills-count-badge">{{ totalVisible }}</span>
      </h1>
      <div class="laws-header-btns">
        <button v-if="canManage" class="btn sm" @click="openImportModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Importar .md
        </button>
        <button v-if="canManage" class="btn accent sm" @click="openCreate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva ley
        </button>
      </div>
    </div>

    <!-- Breadcrumb -->
    <div v-if="openTopic !== null" class="topic-breadcrumb">
      <button class="btn sm" @click="backToTopics">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Todos los temas
      </button>
      <span v-if="reading" class="laws-crumb">{{ openTopic }}</span>
    </div>

    <!-- ── LEVEL 1: topics ───────────────────────────────── -->
    <template v-if="openTopic === null">
      <div v-if="!grouped.length" class="laws-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="46" height="46">
          <path d="M3 6l9-3 9 3v6c0 5-4 8-9 10-5-2-9-5-9-10z"/><path d="M9 11h6M9 15h4"/>
        </svg>
        <strong>Aún no hay leyes</strong>
        <p>{{ canManage ? 'Crea la primera con el botón de arriba.' : 'Cuando tu profesor añada alguna, aparecerá aquí.' }}</p>
      </div>

      <div v-else class="laws-topics">
        <button v-for="[topic, items] in grouped" :key="topic"
          class="law-topic-card" @click="openTopic = topic">
          <div class="law-topic-name">{{ topic }}</div>
          <div class="law-topic-count">
            {{ items.length }} {{ items.length === 1 ? 'ley' : 'leyes' }}
            <span v-if="canManage && items.some(l => l.secret)" class="badge secret-badge law-secret-tag">
              {{ items.filter(l => l.secret).length }} secreta{{ items.filter(l => l.secret).length !== 1 ? 's' : '' }}
            </span>
          </div>
        </button>
      </div>
    </template>

    <!-- ── LEVEL 2: laws inside a topic ──────────────────── -->
    <template v-else-if="!reading">
      <div class="section-title">{{ openTopic }}</div>
      <div class="laws-list">
        <div v-for="l in topicLaws" :key="l.id" class="law-item">
          <button class="law-item-open" @click="reading = l">
            <span class="law-item-title">{{ l.title }}</span>
            <span v-if="l.secret" class="badge secret-badge law-secret-tag">Secreta</span>
            <span class="law-item-size">{{ sizeLabel(l) }}</span>
          </button>
          <div v-if="canManage" class="law-item-actions">
            <button class="btn sm" @click="openEdit(l)" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn sm danger" @click="requestDelete(l)" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── LEVEL 3: reader ───────────────────────────────── -->
    <template v-else>
      <div class="law-reader">
        <div class="law-reader-head">
          <button class="btn sm" @click="reading = null">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Leyes del tema
          </button>
          <span class="law-reader-pos">{{ readingIdx + 1 }} / {{ topicLaws.length }}</span>
        </div>

        <h2 class="law-reader-title">{{ reading.title }}</h2>
        <!-- Scrolls on its own: a law's text can run very long -->
        <div class="law-reader-body">{{ reading.content }}</div>

        <div v-if="topicLaws.length > 1" class="law-reader-nav">
          <button class="btn sm" :disabled="readingIdx === 0" @click="step(-1)">Anterior</button>
          <button class="btn sm" :disabled="readingIdx === topicLaws.length - 1" @click="step(1)">Siguiente</button>
        </div>
      </div>
    </template>

    <!-- Create / edit modal -->
    <div v-if="editOpen" class="modal-overlay open" @click.self="editOpen = false">
      <div class="modal law-modal">
        <h3>{{ editId ? 'Editar ley' : 'Nueva ley' }}</h3>
        <div class="field-group">
          <label>Título</label>
          <input type="text" v-model="editTitle" maxlength="160" ref="titleEl"
            placeholder="Ej: Real Decreto 513/2017, de 22 de mayo">
        </div>
        <div class="field-group" style="margin-top:14px">
          <label>Tema</label>
          <input type="text" v-model="editTopic" maxlength="80" autocomplete="off"
            list="lawTopicsList" placeholder="Elige uno existente o escribe uno nuevo">
          <datalist id="lawTopicsList">
            <option v-for="t in allTopics" :key="t" :value="t" />
          </datalist>
        </div>
        <div class="field-group" style="margin-top:14px">
          <label>Contenido</label>
          <textarea v-model="editContent" rows="12" class="law-textarea"
            placeholder="Pega aquí el texto de la ley o del real decreto..."></textarea>
        </div>
        <label v-if="authStore.isAdmin" class="law-secret-toggle">
          <input type="checkbox" v-model="editSecret">
          Secreta — solo visible para el profesorado
        </label>
        <div class="modal-actions">
          <button class="btn" @click="editOpen = false">Cancelar</button>
          <button class="btn accent" @click="doSave"
            :disabled="saving || !editTitle.trim() || !editContent.trim() || !editTopic.trim()">
            Guardar
          </button>
        </div>
      </div>
    </div>

    <!-- Import .md modal -->
    <div v-if="importOpen" class="modal-overlay open" @click.self="importOpen = false">
      <div class="modal pill-import-modal">
        <h3>Importar leyes desde texto</h3>

        <p class="pill-import-hint">
          Pega el texto con tus leyes o reales decretos. Formatos admitidos:
        </p>
        <div class="pill-import-formats">
          <pre class="pill-format-example">## Real Decreto 513/2017, de 22 de mayo
Artículo 1. Objeto.

Este reglamento tiene por objeto...

## Ley 31/1995, de 8 de noviembre
Artículo 1. Ámbito de aplicación.
...</pre>
          <pre class="pill-format-example">TÍTULO: Real Decreto 513/2017, de 22 de mayo
Artículo 1. Objeto.
...

TÍTULO: Ley 31/1995, de 8 de noviembre
Artículo 1. Ámbito de aplicación.
...</pre>
        </div>

        <div class="field-group" style="margin-top:14px;margin-bottom:10px">
          <label>Asignar al tema</label>
          <input type="text" v-model="importTopic"
            placeholder="Ej: Tema 07. CTE DB SI" maxlength="80"
            list="lawImportTopicsList" autocomplete="off" class="pill-topic-input" />
          <datalist id="lawImportTopicsList">
            <option v-for="t in allTopics" :key="t" :value="t" />
          </datalist>
        </div>
        <label v-if="authStore.isAdmin" class="law-secret-toggle" style="margin-bottom:10px">
          <input type="checkbox" v-model="importSecret">
          Importar como secretas — solo visibles para el profesorado
        </label>
        <div class="field-group" style="position:relative">
          <textarea v-model="importText" rows="10" class="import-textarea"
            placeholder="Pega aquí el texto..."></textarea>
          <span v-if="importPreviewCount" class="import-count-badge">{{ importPreviewCount }} leyes</span>
        </div>

        <p v-if="importError" class="import-error">{{ importError }}</p>

        <div class="modal-actions">
          <button class="btn" @click="importOpen = false">Cancelar</button>
          <button class="btn accent" @click="doImportLaws"
            :disabled="importing || !importText.trim() || !importTopic.trim()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Importar
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useLawsStore } from '@/stores/laws'
import { parseMDLaws } from '@/utils/parseMDLaws'

const authStore = useAuthStore()
const appStore = useAppStore()
const store = useLawsStore()

// Students read; only staff create, edit or delete
const canManage = computed(() => authStore.isTeacher || authStore.isAdmin)

const openTopic = ref(null)
const reading = ref(null)

onMounted(() => store.load())

const grouped = computed(() => store.byTopic(canManage.value))
const totalVisible = computed(() => grouped.value.reduce((n, [, items]) => n + items.length, 0))

const topicLaws = computed(() => {
  const entry = grouped.value.find(([t]) => t === openTopic.value)
  return entry ? entry[1] : []
})

const readingIdx = computed(() => topicLaws.value.findIndex(l => l.id === reading.value?.id))

// Topics offered when filing a law: those already used by laws plus the ones
// from the tests, so a law can be filed under a topic that has none yet.
const allTopics = computed(() => {
  const set = new Set([
    ...appStore.tests.map(t => t.topic),
    ...store.laws.map(l => l.topic),
  ].filter(Boolean))
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
})

function backToTopics() {
  openTopic.value = null
  reading.value = null
}

function step(delta) {
  const next = topicLaws.value[readingIdx.value + delta]
  if (next) reading.value = next
}

function sizeLabel(l) {
  const words = l.content.trim().split(/\s+/).filter(Boolean).length
  return words > 999 ? `${Math.round(words / 1000)}k palabras` : `${words} palabras`
}

// ── CRUD ─────────────────────────────────────────────────
const editOpen = ref(false)
const editId = ref(null)
const editTitle = ref('')
const editContent = ref('')
const editTopic = ref('')
const editSecret = ref(false)
const titleEl = ref(null)
const saving = ref(false)

function openCreate() {
  editId.value = null
  editTitle.value = ''
  editContent.value = ''
  editTopic.value = openTopic.value && openTopic.value !== 'Sin tema' ? openTopic.value : ''
  editSecret.value = false
  editOpen.value = true
  nextTick(() => titleEl.value?.focus())
}

function openEdit(l) {
  editId.value = l.id
  editTitle.value = l.title
  editContent.value = l.content
  editTopic.value = l.topic || ''
  editSecret.value = !!l.secret
  editOpen.value = true
  nextTick(() => titleEl.value?.focus())
}

async function doSave() {
  if (!editTitle.value.trim() || !editContent.value.trim() || !editTopic.value.trim()) return
  const wasEditing = !!editId.value
  saving.value = true
  try {
    const saved = await store.save({
      id: editId.value,
      title: editTitle.value,
      content: editContent.value,
      topic: editTopic.value,
      secret: editSecret.value,
    })
    if (reading.value?.id === saved.id) reading.value = saved
  } finally { saving.value = false }
  editOpen.value = false
  appStore.showToast(wasEditing ? 'Ley actualizada ✓' : 'Ley creada ✓')
}

// ── Import from .md ───────────────────────────────────────
const importOpen = ref(false)
const importText = ref('')
const importTopic = ref('')
const importSecret = ref(false)
const importError = ref('')
const importing = ref(false)

const importPreviewCount = computed(() => {
  if (!importText.value.trim()) return 0
  return parseMDLaws(importText.value).length
})

function openImportModal() {
  importText.value = ''
  importTopic.value = openTopic.value && openTopic.value !== 'Sin tema' ? openTopic.value : ''
  importSecret.value = false
  importError.value = ''
  importOpen.value = true
}

async function doImportLaws() {
  importError.value = ''
  const parsed = parseMDLaws(importText.value)
  if (!parsed.length) {
    importError.value = 'No se encontraron leyes. Usa el formato ## Título o TÍTULO: para cada una.'
    return
  }
  const topic = importTopic.value.trim()
  if (!topic) { importError.value = 'Elige un tema para las leyes importadas.'; return }

  const secret = importSecret.value
  importing.value = true
  try {
    await Promise.all(parsed.map(l => store.save({ id: null, title: l.title, content: l.content, topic, secret })))
  } finally { importing.value = false }

  importOpen.value = false
  importText.value = ''
  appStore.showToast(`${parsed.length} ley${parsed.length !== 1 ? 'es' : ''} importada${parsed.length !== 1 ? 's' : ''} ✓`)
}

function requestDelete(l) {
  appStore.showModal(
    'Eliminar ley',
    `Se eliminará «${l.title}». Esta acción no se puede deshacer.`,
    async () => {
      await store.remove(l.id)
      if (reading.value?.id === l.id) reading.value = null
      appStore.showToast('Ley eliminada')
    },
    'Eliminar', true,
  )
}
</script>
