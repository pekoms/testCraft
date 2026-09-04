<template>
  <div id="pills">

    <!-- Header -->
    <div class="pills-header">
      <h1>
        Píldoras
        <span v-if="shuffled.length && !managing" class="pills-count-badge">{{ shuffled.length }}</span>
      </h1>
      <div class="pills-header-btns">
        <button v-if="!managing && shuffled.length > 1" class="btn sm" @click="reshuffle" title="Nuevo orden aleatorio">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
          </svg>
          Barajar
        </button>
        <button class="btn sm" :class="managing ? 'accent' : ''" @click="toggleManage">
          <svg v-if="!managing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          {{ managing ? 'Estudiar' : 'Gestionar' }}
        </button>
      </div>
    </div>

    <!-- MANAGE MODE -->
    <div v-if="managing" class="pills-manage-view">
      <div class="pills-manage-toolbar">
        <button class="btn accent pills-new-btn" @click="openCreate">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nueva píldora
        </button>
        <button class="btn pills-import-btn" @click="openImportModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Importar .md
        </button>
      </div>

      <div v-if="!store.pills.length" class="pills-empty-manage">
        No hay píldoras aún. Crea la primera con el botón de arriba.
      </div>

      <div v-else class="pills-manage-list">
        <div v-for="p in store.pills" :key="p.id" class="pill-manage-item">
          <div class="pill-manage-texts">
            <div class="pill-manage-front">{{ p.front }}</div>
            <div class="pill-manage-back">{{ p.back }}</div>
            <span v-if="p.topic" class="pill-manage-topic">{{ p.topic }}</span>
          </div>
          <div class="pill-manage-actions">
            <button class="btn sm" @click="openEdit(p)" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn sm danger" @click="requestDelete(p.id)" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- STUDY MODE -->
    <div v-else class="pills-study-view">

      <!-- Topic filter chips -->
      <div v-if="pillTopics.length >= 2" class="pills-topic-filter">
        <button
          v-for="t in pillTopics" :key="t"
          class="topic-chip" :class="{ active: selectedTopics.includes(t) }"
          @click="toggleTopic(t)"
        >{{ t }}</button>
      </div>

      <!-- Empty state -->
      <div v-if="!shuffled.length" class="pills-empty-study">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="color:var(--ink3)">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <rect x="5" y="2" width="14" height="14" rx="2"/>
          <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="12" x2="13" y2="12"/>
        </svg>
        <strong>{{ selectedTopics.length ? 'Sin resultados' : 'No hay píldoras' }}</strong>
        <p>{{ selectedTopics.length ? 'Ninguna píldora coincide con los temas seleccionados.' : 'Crea la primera desde «Gestionar».' }}</p>
        <button v-if="!selectedTopics.length" class="btn accent" @click="managing = true">Crear primera</button>
      </div>

      <!-- Card carousel -->
      <template v-else>

        <!-- Navigation row -->
        <div class="pills-nav-row">
          <button class="pill-nav-btn" @click="goPrev" aria-label="Anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <span class="pills-counter">{{ idx + 1 }} / {{ shuffled.length }}</span>
          <button class="pill-nav-btn" @click="goNext" aria-label="Siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <!-- Flip card area (wheel + touch + keys handled here) -->
        <div class="pills-card-area"
          @wheel.prevent="onWheel"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <Transition :name="'pill-slide-' + direction">
            <div :key="idx" class="pill-flip-outer" @click="flipped = !flipped">
              <div class="pill-flip" :class="{ flipped }">

                <!-- Front face -->
                <div class="pill-face pill-front">
                  <div class="pill-face-label">Pregunta</div>
                  <p class="pill-face-text">{{ current.front }}</p>
                  <div class="pill-face-hint">↻ Toca para ver la respuesta</div>
                </div>

                <!-- Back face -->
                <div class="pill-face pill-back">
                  <div class="pill-face-label">Respuesta</div>
                  <p class="pill-face-text">{{ current.back }}</p>
                </div>

              </div>
            </div>
          </Transition>
        </div>

        <!-- Progress dots (decks ≤ 15) -->
        <div v-if="shuffled.length <= 15" class="pills-dots">
          <button v-for="(_, i) in shuffled" :key="i"
            class="pill-dot" :class="{ active: i === idx }"
            @click="jumpTo(i)" :aria-label="`Ir a la píldora ${i + 1}`">
          </button>
        </div>

      </template>
    </div>

    <!-- Create / Edit modal -->
    <div v-if="editOpen" class="modal-overlay open" @click.self="editOpen = false">
      <div class="modal pill-modal">
        <h3>{{ editId ? 'Editar píldora' : 'Nueva píldora' }}</h3>
        <div class="field-group">
          <label>Anverso — pregunta o dato</label>
          <textarea v-model="editFront" rows="4"
            placeholder="Escribe la pregunta o el concepto clave..." maxlength="500"
            ref="editFrontEl"></textarea>
        </div>
        <div class="field-group" style="margin-top:14px">
          <label>Reverso — respuesta</label>
          <textarea v-model="editBack" rows="4"
            placeholder="Escribe la respuesta o la explicación..." maxlength="500">
          </textarea>
        </div>
        <div class="field-group" style="margin-top:14px">
          <label>Tema</label>
          <input type="text" v-model="editTopic"
            placeholder="Ej: Tema 01. La Función Pública" maxlength="80"
            list="pillEditTopicsList" autocomplete="off" class="pill-topic-input" />
          <datalist id="pillEditTopicsList">
            <option v-for="t in allTopics" :key="t" :value="t" />
          </datalist>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="editOpen = false">Cancelar</button>
          <button class="btn accent" @click="doSave" :disabled="!editFront.trim() || !editBack.trim()">
            Guardar
          </button>
        </div>
      </div>
    </div>

    <!-- Import .md modal -->
    <div v-if="importOpen" class="modal-overlay open" @click.self="importOpen = false">
      <div class="modal pill-import-modal">
        <h3>Importar píldoras desde texto</h3>

        <p class="pill-import-hint">
          Pega el texto con tus tarjetas. Formatos admitidos:
        </p>
        <div class="pill-import-formats">
          <pre class="pill-format-example">P: Pregunta o concepto
R: Respuesta o explicación

P: Siguiente tarjeta
R: Su respuesta</pre>
          <pre class="pill-format-example">##
P: Pregunta o concepto
R: Respuesta o explicación

##
P: Siguiente tarjeta
R: Su respuesta</pre>
          <pre class="pill-format-example">## Pregunta o concepto

Respuesta o explicación

## Siguiente tarjeta

Su respuesta</pre>
        </div>

        <div class="field-group" style="margin-top:14px;margin-bottom:10px">
          <label>Asignar al tema</label>
          <input type="text" v-model="importTopic"
            placeholder="Ej: Tema 01. La Función Pública" maxlength="80"
            list="pillImportTopicsList" autocomplete="off" class="pill-topic-input" />
          <datalist id="pillImportTopicsList">
            <option v-for="t in allTopics" :key="t" :value="t" />
          </datalist>
        </div>
        <div class="field-group" style="position:relative">
          <textarea v-model="importText" rows="10" class="import-textarea"
            placeholder="Pega aquí el texto..."></textarea>
          <span v-if="importPreviewCount" class="import-count-badge">{{ importPreviewCount }} píldoras</span>
        </div>

        <p v-if="importError" class="import-error">{{ importError }}</p>

        <div class="modal-actions">
          <button class="btn" @click="importOpen = false">Cancelar</button>
          <button class="btn accent" @click="doImportPills" :disabled="!importText.trim()">
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { usePillsStore } from '@/stores/pills'
import { parseMDPills } from '@/utils/parseMDPills'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const store = usePillsStore()

onMounted(async () => {
  if (!authStore.isAdmin) { router.replace('/'); return }
  window.addEventListener('keydown', globalKeyHandler)
  await store.load()
  reshuffle()
})

onUnmounted(() => {
  window.removeEventListener('keydown', globalKeyHandler)
})

// ── Study state ──────────────────────────────────────────
const managing = ref(false)
const shuffled = ref([])
const idx = ref(0)
const flipped = ref(false)
const direction = ref('next')

const current = computed(() => shuffled.value[idx.value] || null)

// ── Topics ────────────────────────────────────────────────
// Selector: mismos temas que en los tests (tests + píldoras), para poder
// asignar píldoras a un tema que aún no tiene ninguna.
const allTopics = computed(() => {
  const set = new Set([
    ...appStore.tests.map(t => t.topic),
    ...store.pills.map(p => p.topic),
  ].filter(Boolean))
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
})

// Filtro de estudio: solo temas que tienen píldoras
const pillTopics = computed(() => {
  const set = new Set(store.pills.map(p => p.topic).filter(Boolean))
  return [...set].sort((a, b) => a.localeCompare(b, 'es'))
})
const selectedTopics = ref([]) // empty = show all

function toggleTopic(t) {
  if (selectedTopics.value.includes(t)) {
    selectedTopics.value = selectedTopics.value.filter(x => x !== t)
  } else {
    selectedTopics.value = [...selectedTopics.value, t]
  }
}

watch(selectedTopics, () => reshuffle())

function reshuffle() {
  const src = selectedTopics.value.length
    ? store.pills.filter(p => selectedTopics.value.includes(p.topic || ''))
    : [...store.pills]
  for (let i = src.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[src[i], src[j]] = [src[j], src[i]]
  }
  shuffled.value = src
  idx.value = 0
  flipped.value = false
}

function toggleManage() {
  managing.value = !managing.value
  if (!managing.value) reshuffle()
}

// ── Navigation ───────────────────────────────────────────
function goNext() {
  if (!shuffled.value.length) return
  direction.value = 'next'
  flipped.value = false
  idx.value = (idx.value + 1) % shuffled.value.length
}

function goPrev() {
  if (!shuffled.value.length) return
  direction.value = 'prev'
  flipped.value = false
  idx.value = (idx.value - 1 + shuffled.value.length) % shuffled.value.length
}

function jumpTo(i) {
  direction.value = i >= idx.value ? 'next' : 'prev'
  flipped.value = false
  idx.value = i
}

// Wheel — throttled
let wheelLock = false
function onWheel(e) {
  if (wheelLock || Math.abs(e.deltaY) < 15) return
  wheelLock = true
  if (e.deltaY > 0) goNext(); else goPrev()
  setTimeout(() => { wheelLock = false }, 480)
}

// Touch swipe (vertical)
let touchY0 = 0
function onTouchStart(e) { touchY0 = e.touches[0].clientY }
function onTouchEnd(e) {
  const dy = touchY0 - e.changedTouches[0].clientY
  if (dy > 45) goNext()
  else if (dy < -45) goPrev()
}

// Global keyboard: arrows navigate, space/enter flips
function globalKeyHandler(e) {
  if (editOpen.value || e.target.matches('input, textarea, select, button')) return
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goNext() }
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
  else if ((e.key === ' ' || e.key === 'Enter') && !managing.value && current.value) {
    e.preventDefault(); flipped.value = !flipped.value
  }
}

// ── CRUD ─────────────────────────────────────────────────
const editOpen = ref(false)
const editId = ref(null)
const editFront = ref('')
const editBack = ref('')
const editTopic = ref('')
const editFrontEl = ref(null)

function openCreate() {
  editId.value = null
  editFront.value = ''
  editBack.value = ''
  editTopic.value = ''
  editOpen.value = true
  nextTick(() => editFrontEl.value?.focus())
}

function openEdit(p) {
  editId.value = p.id
  editFront.value = p.front
  editBack.value = p.back
  editTopic.value = p.topic || ''
  editOpen.value = true
  nextTick(() => editFrontEl.value?.focus())
}

async function doSave() {
  if (!editFront.value.trim() || !editBack.value.trim()) return
  const wasEditing = !!editId.value
  editOpen.value = false
  await store.save({ id: editId.value, front: editFront.value, back: editBack.value, topic: editTopic.value })
  appStore.showToast(wasEditing ? 'Píldora actualizada ✓' : 'Píldora creada ✓')
}

function requestDelete(id) {
  appStore.showModal(
    'Eliminar píldora',
    '¿Seguro? Esta acción no se puede deshacer.',
    () => {
      store.remove(id)
      appStore.showToast('Píldora eliminada')
    },
    'Eliminar', true,
  )
}

// ── Import from .md ───────────────────────────────────────
const importOpen = ref(false)
const importText = ref('')
const importTopic = ref('')
const importError = ref('')

const importPreviewCount = computed(() => {
  if (!importText.value.trim()) return 0
  return parseMDPills(importText.value).length
})

function openImportModal() {
  importText.value = ''
  importError.value = ''
  importTopic.value = ''
  importOpen.value = true
}

async function doImportPills() {
  importError.value = ''
  const parsed = parseMDPills(importText.value)
  if (!parsed.length) {
    importError.value = 'No se encontraron píldoras. Usa el formato P:/R: o ## para cada tarjeta.'
    return
  }
  const topic = importTopic.value.trim() || 'Tema 01. La Función Pública'
  importOpen.value = false
  importText.value = ''
  await Promise.all(parsed.map(p => store.save({ id: null, front: p.front, back: p.back, topic })))
  appStore.showToast(`${parsed.length} píldora${parsed.length !== 1 ? 's' : ''} importada${parsed.length !== 1 ? 's' : ''} ✓`)
  reshuffle()
}
</script>
