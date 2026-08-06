import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/editor', component: { template: '<div />' } },
    { path: '/player', component: { template: '<div />' } },
  ],
})

const SAMPLE_TEST = {
  id: 'test-1',
  title: 'Test de Historia',
  description: 'Tema 4',
  questions: [{ id: 'q1', type: 'single', text: '¿?', options: [{ text: 'A', correct: true }] }],
  published: true,
  topic: 'Historia',
  _ownerId: 'teacher-id',
}

describe('HomeView — acciones en tarjeta de test', () => {
  let pinia, authStore, appStore

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    appStore = useAppStore()
    vi.spyOn(appStore, 'startTest').mockResolvedValue()
    vi.spyOn(appStore, 'togglePublish').mockResolvedValue()
    vi.spyOn(appStore, 'deleteTest').mockImplementation(() => {})
    vi.spyOn(appStore, 'loadWrongAnswers').mockResolvedValue()
    vi.spyOn(appStore, 'startWrongAnswersTest').mockResolvedValue()
  })

  function mountView() {
    return mount(HomeView, { global: { plugins: [pinia, router] } })
  }

  it('monta sin errores', () => {
    expect(() => mountView()).not.toThrow()
  })

  it('botones de acción aparecen como .card-actions dentro de la tarjeta (no como .actions)', async () => {
    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.currentUser = { id: 'teacher-id', email: 'teacher@test.com' }
    appStore.tests = [SAMPLE_TEST]
    appStore.currentTopic = 'Historia'

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.card-actions').exists()).toBe(true)
    expect(wrapper.find('.actions').exists()).toBe(false)
  })

  it('.card-actions aparece DESPUÉS del h3 en el DOM', async () => {
    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.currentUser = { id: 'teacher-id', email: 'teacher@test.com' }
    appStore.tests = [SAMPLE_TEST]
    appStore.currentTopic = 'Historia'

    const wrapper = mountView()
    await flushPromises()

    const card = wrapper.find('.test-card')
    const children = card.element.children
    const h3Index = Array.from(children).findIndex(el => el.tagName === 'H3')
    const actionsIndex = Array.from(children).findIndex(el => el.classList.contains('card-actions'))
    expect(h3Index).toBeGreaterThanOrEqual(0)
    expect(actionsIndex).toBeGreaterThan(h3Index)
  })

  it('alumnos no ven .card-actions', async () => {
    authStore.authLocked = false
    authStore.isTeacher = false
    appStore.tests = [{ ...SAMPLE_TEST, published: true }]
    appStore.currentTopic = 'Historia'

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('.card-actions').exists()).toBe(false)
  })

  it('botón Editar está dentro de .card-actions', async () => {
    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.currentUser = { id: 'teacher-id', email: 'teacher@test.com' }
    appStore.tests = [SAMPLE_TEST]
    appStore.currentTopic = 'Historia'

    const wrapper = mountView()
    await flushPromises()

    const actionsDiv = wrapper.find('.card-actions')
    const btns = actionsDiv.findAll('button')
    expect(btns.some(b => b.attributes('title') === 'Editar')).toBe(true)
  })

  it('no existe botón Compartir en las acciones de la tarjeta', async () => {
    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.currentUser = { id: 'teacher-id', email: 'teacher@test.com' }
    appStore.tests = [SAMPLE_TEST]
    appStore.currentTopic = 'Historia'

    const wrapper = mountView()
    await flushPromises()

    const btns = wrapper.findAll('button')
    expect(btns.some(b => b.text().toLowerCase().includes('compartir'))).toBe(false)
  })
})

describe('HomeView — Repaso de errores', () => {
  let pinia, authStore, appStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    appStore = useAppStore()
    vi.spyOn(appStore, 'loadWrongAnswers').mockResolvedValue()
    vi.spyOn(appStore, 'startWrongAnswersTest').mockResolvedValue()
    authStore.authLocked = false
    authStore.isTeacher = false
  })

  function mountView() {
    return mount(HomeView, { global: { plugins: [pinia, router] } })
  }

  it('alumnos ven el botón Repaso de errores', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.findAll('button').some(b => b.text().toLowerCase().includes('repaso'))).toBe(true)
  })

  it('botón Repaso de errores deshabilitado cuando wrongAnswers está vacío', async () => {
    appStore.wrongAnswers = []
    const wrapper = mountView()
    await flushPromises()
    const btn = wrapper.findAll('button').find(b => b.text().toLowerCase().includes('repaso'))
    expect(btn.element.disabled).toBe(true)
  })

  it('botón Repaso de errores habilitado cuando hay wrongAnswers', async () => {
    appStore.wrongAnswers = [{ id: 'q1', type: 'single', text: '?', options: [] }]
    const wrapper = mountView()
    await flushPromises()
    const btn = wrapper.findAll('button').find(b => b.text().toLowerCase().includes('repaso'))
    expect(btn.element.disabled).toBe(false)
  })

  it('el botón muestra el número de preguntas erróneas', async () => {
    appStore.wrongAnswers = [
      { id: 'q1', type: 'single', text: 'Q1', options: [] },
      { id: 'q2', type: 'single', text: 'Q2', options: [] },
    ]
    const wrapper = mountView()
    await flushPromises()
    const btn = wrapper.findAll('button').find(b => b.text().toLowerCase().includes('repaso'))
    expect(btn.text()).toContain('2')
  })

  it('profesores NO ven el botón Repaso de errores', async () => {
    authStore.isTeacher = true
    authStore.currentUser = { id: 'teacher-id', email: 'teacher@test.com' }
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.findAll('button').some(b => b.text().toLowerCase().includes('repaso'))).toBe(false)
  })

  it('llama a loadWrongAnswers al montar para alumnos', async () => {
    mountView()
    await flushPromises()
    expect(appStore.loadWrongAnswers).toHaveBeenCalledOnce()
  })

  it('NO llama a loadWrongAnswers cuando el usuario es profesor', async () => {
    authStore.isTeacher = true
    authStore.currentUser = { id: 'teacher-id', email: 'teacher@test.com' }
    mountView()
    await flushPromises()
    expect(appStore.loadWrongAnswers).not.toHaveBeenCalled()
  })
})
