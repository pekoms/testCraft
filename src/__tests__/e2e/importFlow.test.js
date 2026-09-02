/**
 * E2E Integration Tests — Import Flow
 *
 * Tests the complete path:
 *   HomeView (open modal → fill → click Importar)
 *   → appStore.importMeta populated
 *   → EditorView mounted (onMounted reads importMeta.questions)
 *   → question cards rendered
 *   → saveTest calls persistTest successfully
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import HomeView from '@/views/HomeView.vue'
import EditorView from '@/views/EditorView.vue'

// ── Shared test data ──────────────────────────────────────────────────────────

const SAMPLE_MD = `
1. ¿Cuál es la capital de España? A) Barcelona B) Madrid C) Sevilla D) Valencia

2. ¿Cuántos planetas tiene el sistema solar? A) 7 B) 8 C) 9 D) 10

3. ¿En qué año llegó el hombre a la Luna? A) 1965 B) 1967 C) 1969 D) 1972

HOJA DE SOLUCIONES 1 B 2 B 3 C
`

const SAMPLE_TITLE = 'Test de Cultura General'
const SAMPLE_TOPIC = 'Cultura'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/editor', component: EditorView },
    ],
  })
}

// ── Suite 1: HomeView — import modal ─────────────────────────────────────────

describe('HomeView — modal de importación', () => {
  let pinia, authStore, appStore, router

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    appStore = useAppStore()

    // Configure as admin (can see "Importar .md" button)
    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.isAdmin = true
    authStore.currentUser = { id: 'admin-id', email: 'admin@test.com' }

    vi.spyOn(appStore, 'loadWrongAnswers').mockResolvedValue()

    router = makeRouter()
    await router.push('/')
    await router.isReady()
  })

  function mountHome() {
    return mount(HomeView, { global: { plugins: [pinia, router] } })
  }

  it('el botón "Importar .md" abre el modal', async () => {
    const wrapper = mountHome()
    await flushPromises()

    expect(wrapper.find('.import-md-modal').exists()).toBe(false)

    const btn = wrapper.findAll('button').find(b => b.text().includes('Importar .md'))
    await btn.trigger('click')

    expect(wrapper.find('.import-md-modal').exists()).toBe(true)
  })

  it('el campo de tema se pre-rellena con el tema activo', async () => {
    appStore.currentTopic = SAMPLE_TOPIC
    const wrapper = mountHome()
    await flushPromises()

    const btn = wrapper.findAll('button').find(b => b.text().includes('Importar .md'))
    await btn.trigger('click')

    // Topic input is identified by its datalist binding
    const topicInput = wrapper.find('input[list="importTopicsList"]')
    expect(topicInput.element.value).toBe(SAMPLE_TOPIC)
  })

  it('el botón Importar está deshabilitado cuando no hay título', async () => {
    const wrapper = mountHome()
    await flushPromises()

    const openBtn = wrapper.findAll('button').find(b => b.text().includes('Importar .md'))
    await openBtn.trigger('click')

    // Fill only the textarea, leave title empty
    await wrapper.find('textarea.import-textarea').setValue(SAMPLE_MD)

    const importBtn = wrapper.findAll('button').find(b =>
      b.text().trim() === 'Importar' && !b.text().includes('.md')
    )
    expect(importBtn.element.disabled).toBe(true)
  })

  it('muestra error cuando el texto no contiene preguntas válidas', async () => {
    const wrapper = mountHome()
    await flushPromises()

    const openBtn = wrapper.findAll('button').find(b => b.text().includes('Importar .md'))
    await openBtn.trigger('click')

    await wrapper.find('input[placeholder*="Simulacro"]').setValue(SAMPLE_TITLE)
    await wrapper.find('textarea.import-textarea').setValue('Texto sin preguntas ni opciones.')

    const importBtn = wrapper.findAll('button').find(b =>
      b.text().trim() === 'Importar' && !b.text().includes('.md')
    )
    await importBtn.trigger('click')

    expect(wrapper.text()).toContain('No se encontraron preguntas')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('importMeta queda poblado con title, topic, secret y questions tras un import exitoso', async () => {
    appStore.currentTopic = SAMPLE_TOPIC
    const wrapper = mountHome()
    await flushPromises()

    const openBtn = wrapper.findAll('button').find(b => b.text().includes('Importar .md'))
    await openBtn.trigger('click')

    await wrapper.find('input[placeholder*="Simulacro"]').setValue(SAMPLE_TITLE)
    await wrapper.find('textarea.import-textarea').setValue(SAMPLE_MD)

    const importBtn = wrapper.findAll('button').find(b =>
      b.text().trim() === 'Importar' && !b.text().includes('.md')
    )
    await importBtn.trigger('click')
    await flushPromises()

    expect(appStore.importMeta).not.toBeNull()
    expect(appStore.importMeta.title).toBe(SAMPLE_TITLE)
    expect(appStore.importMeta.topic).toBe(SAMPLE_TOPIC)
    expect(appStore.importMeta.secret).toBe(true)
    expect(appStore.importMeta.questions).toHaveLength(3)
  })

  it('navega a /editor tras un import exitoso', async () => {
    const wrapper = mountHome()
    await flushPromises()

    const openBtn = wrapper.findAll('button').find(b => b.text().includes('Importar .md'))
    await openBtn.trigger('click')

    await wrapper.find('input[placeholder*="Simulacro"]').setValue(SAMPLE_TITLE)
    await wrapper.find('textarea.import-textarea').setValue(SAMPLE_MD)

    const importBtn = wrapper.findAll('button').find(b =>
      b.text().trim() === 'Importar' && !b.text().includes('.md')
    )
    await importBtn.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/editor')
  })

  it('editingId queda a null tras importar (no edición de test existente)', async () => {
    appStore.editingId = 'prev-id'
    const wrapper = mountHome()
    await flushPromises()

    const openBtn = wrapper.findAll('button').find(b => b.text().includes('Importar .md'))
    await openBtn.trigger('click')

    await wrapper.find('input[placeholder*="Simulacro"]').setValue(SAMPLE_TITLE)
    await wrapper.find('textarea.import-textarea').setValue(SAMPLE_MD)

    const importBtn = wrapper.findAll('button').find(b =>
      b.text().trim() === 'Importar' && !b.text().includes('.md')
    )
    await importBtn.trigger('click')
    await flushPromises()

    expect(appStore.editingId).toBeNull()
  })
})

// ── Suite 2: EditorView — receives imported questions ─────────────────────────

describe('EditorView — recibe preguntas importadas', () => {
  let pinia, authStore, appStore, router

  const IMPORTED_QUESTIONS = [
    {
      id: 'q1',
      type: 'single',
      text: '¿Cuál es la capital de España?',
      options: [
        { text: 'Barcelona', correct: false },
        { text: 'Madrid', correct: true },
        { text: 'Sevilla', correct: false },
        { text: 'Valencia', correct: false },
      ],
    },
    {
      id: 'q2',
      type: 'single',
      text: '¿Cuántos planetas tiene el sistema solar?',
      options: [
        { text: '7', correct: false },
        { text: '8', correct: true },
        { text: '9', correct: false },
        { text: '10', correct: false },
      ],
    },
  ]

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    appStore = useAppStore()

    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.isAdmin = true
    authStore.currentUser = { id: 'admin-id', email: 'admin@test.com' }

    appStore.editingId = null
    appStore.editingQuestions = []
    appStore.importMeta = {
      title: SAMPLE_TITLE,
      topic: SAMPLE_TOPIC,
      description: 'Descripción de prueba',
      shuffle: false,
      timeLimit: 30,
      secret: true,
      questions: IMPORTED_QUESTIONS,
    }

    router = makeRouter()
    await router.push('/editor')
    await router.isReady()
  })

  function mountEditor() {
    return mount(EditorView, { global: { plugins: [pinia, router] } })
  }

  it('onMounted asigna las preguntas de importMeta a editingQuestions', async () => {
    mountEditor()
    await flushPromises()

    expect(appStore.editingQuestions).toHaveLength(2)
    expect(appStore.editingQuestions[0].text).toBe('¿Cuál es la capital de España?')
    expect(appStore.editingQuestions[1].text).toBe('¿Cuántos planetas tiene el sistema solar?')
  })

  it('el campo título refleja importMeta.title', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    const titleInput = wrapper.find('input[placeholder*="Historia"]')
    expect(titleInput.element.value).toBe(SAMPLE_TITLE)
  })

  it('el campo tema refleja importMeta.topic', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    const topicInput = wrapper.find('input[placeholder*="Matemáticas"]')
    expect(topicInput.element.value).toBe(SAMPLE_TOPIC)
  })

  it('importMeta queda a null tras el montaje (se consume)', async () => {
    mountEditor()
    await flushPromises()

    expect(appStore.importMeta).toBeNull()
  })

  it('renderiza una .question-card por cada pregunta importada', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    const cards = wrapper.findAll('.question-card')
    expect(cards).toHaveLength(2)
  })

  it('cada question-card muestra el texto de la pregunta en su input', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    const cards = wrapper.findAll('.question-card')
    // The question text lives in an <input> with placeholder "Escribe la pregunta..."
    const q1 = cards[0].find('input[placeholder*="Escribe"]')
    const q2 = cards[1].find('input[placeholder*="Escribe"]')
    expect(q1.element.value).toBe('¿Cuál es la capital de España?')
    expect(q2.element.value).toBe('¿Cuántos planetas tiene el sistema solar?')
  })

  it('cada question-card renderiza las opciones', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    const firstCard = wrapper.findAll('.question-card')[0]
    const optionInputs = firstCard.findAll('input[type="text"]')
    const texts = optionInputs.map(i => i.element.value)
    expect(texts).toContain('Madrid')
    expect(texts).toContain('Barcelona')
  })

  it('la opción correcta tiene el radio marcado', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    const firstCard = wrapper.findAll('.question-card')[0]
    const radios = firstCard.findAll('input.correct-check')
    const checkedIdx = radios.findIndex(r => r.element.checked)
    // Madrid is at index 1
    expect(checkedIdx).toBe(1)
  })

  it('secret se inicializa a true desde importMeta.secret', async () => {
    // secret=true is set from importMeta.secret, but the select is only visible for admin.
    // We verify via the select element value.
    const wrapper = mountEditor()
    await flushPromises()

    const secretSelect = wrapper.find('select[name]')
    // The secret field select renders when authStore.isAdmin
    const selects = wrapper.findAll('select')
    // Find the one that has "Sí — solo tú lo ves" option
    const secretSel = selects.find(s => s.text().includes('solo tú lo ves'))
    expect(secretSel).toBeDefined()
    expect(secretSel.element.value).toBe('true')
  })
})

// ── Suite 3: EditorView — saveTest after import ───────────────────────────────

describe('EditorView — guardar después de importar', () => {
  let pinia, authStore, appStore, router

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    appStore = useAppStore()

    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.isAdmin = true
    authStore.currentUser = { id: 'admin-id', email: 'admin@test.com' }

    appStore.editingId = null
    appStore.editingQuestions = []
    appStore.importMeta = {
      title: SAMPLE_TITLE,
      topic: SAMPLE_TOPIC,
      description: '',
      shuffle: false,
      timeLimit: 0,
      secret: true,
      questions: [
        {
          id: 'q1',
          type: 'single',
          text: 'Pregunta válida de prueba',
          options: [
            { text: 'Opción A', correct: true },
            { text: 'Opción B', correct: false },
          ],
        },
      ],
    }

    router = makeRouter()
    await router.push('/editor')
    await router.isReady()
  })

  function mountEditor() {
    return mount(EditorView, { global: { plugins: [pinia, router] } })
  }

  it('saveTest llama a persistTest con las preguntas importadas', async () => {
    const persistSpy = vi.spyOn(appStore, 'persistTest').mockResolvedValue(true)

    const wrapper = mountEditor()
    await flushPromises()

    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('Guardar'))
    await saveBtn.trigger('click')
    await flushPromises()

    expect(persistSpy).toHaveBeenCalledOnce()
    const savedTest = persistSpy.mock.calls[0][0]
    expect(savedTest.title).toBe(SAMPLE_TITLE)
    expect(savedTest.questions).toHaveLength(1)
    expect(savedTest.questions[0].text).toBe('Pregunta válida de prueba')
  })

  it('saveTest no muestra toast de error cuando las preguntas son válidas', async () => {
    vi.spyOn(appStore, 'persistTest').mockResolvedValue(true)
    const toastSpy = vi.spyOn(appStore, 'showToast')

    const wrapper = mountEditor()
    await flushPromises()

    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('Guardar'))
    await saveBtn.trigger('click')
    await flushPromises()

    const errorToasts = toastSpy.mock.calls.filter(([msg]) =>
      msg.includes('pregunta') || msg.includes('título') || msg.includes('opción')
    )
    expect(errorToasts).toHaveLength(0)
  })

  it('saveTest incluye secret=true en el objeto guardado', async () => {
    const persistSpy = vi.spyOn(appStore, 'persistTest').mockResolvedValue(true)

    const wrapper = mountEditor()
    await flushPromises()

    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('Guardar'))
    await saveBtn.trigger('click')
    await flushPromises()

    const savedTest = persistSpy.mock.calls[0][0]
    expect(savedTest.secret).toBe(true)
  })
})

// ── Suite 4: Full round-trip ──────────────────────────────────────────────────

describe('Flujo E2E completo — importar en HomeView, editar en EditorView', () => {
  let pinia, authStore, appStore, router

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    appStore = useAppStore()

    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.isAdmin = true
    authStore.currentUser = { id: 'admin-id', email: 'admin@test.com' }

    vi.spyOn(appStore, 'loadWrongAnswers').mockResolvedValue()

    router = makeRouter()
    await router.push('/')
    await router.isReady()
  })

  it('las preguntas del .md aparecen como question-cards en el editor', async () => {
    // Step 1: mount HomeView and trigger import
    const homeWrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    const openBtn = homeWrapper.findAll('button').find(b => b.text().includes('Importar .md'))
    await openBtn.trigger('click')

    await homeWrapper.find('input[placeholder*="Simulacro"]').setValue(SAMPLE_TITLE)
    await homeWrapper.find('textarea.import-textarea').setValue(SAMPLE_MD)

    const importBtn = homeWrapper.findAll('button').find(b =>
      b.text().trim() === 'Importar' && !b.text().includes('.md')
    )
    await importBtn.trigger('click')
    await flushPromises()

    // Router should have navigated to /editor
    expect(router.currentRoute.value.path).toBe('/editor')
    // importMeta should have 3 questions
    expect(appStore.importMeta?.questions).toHaveLength(3)

    homeWrapper.unmount()

    // Step 2: mount EditorView — simulates the navigation
    const editorWrapper = mount(EditorView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    // editingQuestions must now be populated
    expect(appStore.editingQuestions).toHaveLength(3)

    // Question cards should render
    const cards = editorWrapper.findAll('.question-card')
    expect(cards).toHaveLength(3)

    // Verify correct answer for first question (Madrid = B)
    const firstCard = cards[0]
    const radios = firstCard.findAll('input.correct-check')
    const checkedIdx = radios.findIndex(r => r.element.checked)
    // Use .option-row selector to exclude the question text input (which is outside .options-list)
    const optionInputs = firstCard.findAll('.option-row input[type="text"]')
    expect(optionInputs[checkedIdx].element.value).toBe('Madrid')
  })

  it('parsea correctamente las respuestas correctas del .md en el editor', async () => {
    // Bootstrap via importMeta directly (state already set by import)
    appStore.importMeta = null
    const parsed = (await import('@/utils/parseMDTest')).parseMDTest(SAMPLE_MD)
    appStore.importMeta = {
      title: SAMPLE_TITLE, topic: '', description: '',
      shuffle: false, timeLimit: 0, secret: true,
      questions: parsed,
    }

    await router.push('/editor')
    const wrapper = mount(EditorView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    // Q1: Madrid (B)
    const q1 = appStore.editingQuestions[0]
    expect(q1.options.find(o => o.correct).text).toBe('Madrid')

    // Q2: 8 planetas (B)
    const q2 = appStore.editingQuestions[1]
    expect(q2.options.find(o => o.correct).text).toBe('8')

    // Q3: 1969 (C)
    const q3 = appStore.editingQuestions[2]
    expect(q3.options.find(o => o.correct).text).toBe('1969')
  })
})
