/**
 * Integration — "Volver al test" banner (App.vue)
 *
 * Covers the actual feature requested: mid-test, navigate away to check a
 * law, then come back to the exact same question without losing progress.
 * playerState already lives in the Pinia store (survives the route change on
 * its own); this banner is the visible way back, and it must track the
 * active test's state live and disappear the moment the test is no longer
 * resumable.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import App from '@/App.vue'

const Stub = { template: '<div class="stub" />' }

function makeRouter(initial = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/player', component: Stub },
      { path: '/laws', component: Stub },
    ],
  })
  router.push(initial)
  return router
}

function makeQuestion() {
  return { type: 'single', text: 'Q', options: [{ text: 'A', correct: true }] }
}

describe('Banner "Volver al test"', () => {
  let pinia, authStore, appStore

  beforeEach(async () => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    appStore = useAppStore()

    authStore.authLocked = false
    authStore.currentUser = { id: 'u1', email: 'u@test.com' }
    vi.spyOn(authStore, 'init').mockResolvedValue() // avoid real fetchTests/URL handling
  })

  async function mountAt(path) {
    const router = makeRouter(path)
    await router.isReady()
    const w = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return { w, router }
  }

  it('no aparece sin un test en curso', async () => {
    const { w } = await mountAt('/laws')
    expect(w.find('.resume-test-banner').exists()).toBe(false)
  })

  it('aparece en otra vista cuando hay un test en curso', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' }, questions: [makeQuestion(), makeQuestion()],
      answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    const { w } = await mountAt('/laws')
    expect(w.find('.resume-test-banner').exists()).toBe(true)
    expect(w.find('.resume-test-banner').text()).toContain('Mi test')
  })

  it('no aparece estando ya en /player — ahí está el propio test', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' }, questions: [makeQuestion()],
      answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    const { w } = await mountAt('/player')
    expect(w.find('.resume-test-banner').exists()).toBe(false)
  })

  it('muestra la pregunta actual, no siempre la primera', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' }, questions: [makeQuestion(), makeQuestion(), makeQuestion()],
      answers: {}, revealed: {}, current: 1, timerInterval: null, deadline: null,
    }
    const { w } = await mountAt('/laws')
    expect(w.find('.resume-test-banner').text()).toContain('Pregunta 2 de 3')
  })

  it('al pulsar "Volver al test" navega a /player', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' }, questions: [makeQuestion()],
      answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    const { w, router } = await mountAt('/laws')
    await w.find('.resume-test-banner button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/player')
  })

  it('desaparece en cuanto el test termina', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' },
      questions: [{ type: 'single', text: 'Q', options: [{ text: 'A', correct: true }] }],
      answers: { 0: [0] }, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    const { w } = await mountAt('/laws')
    expect(w.find('.resume-test-banner').exists()).toBe(true)

    appStore.finishTest()
    await flushPromises()
    expect(w.find('.resume-test-banner').exists()).toBe(false)
  })

  it('con tiempo límite, muestra el cronómetro', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Con reloj' }, questions: [makeQuestion()],
      answers: {}, revealed: {}, current: 0, timerInterval: null,
      deadline: Date.now() + 90_000,
    }
    const { w } = await mountAt('/laws')
    expect(w.find('.resume-test-banner').text()).toMatch(/⏱\s*\d+:\d{2}/)
  })

  it('no aparece mientras la sesión no está confirmada (AuthPanel activo)', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' }, questions: [makeQuestion()],
      answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    authStore.authLocked = true
    const { w } = await mountAt('/laws')
    expect(w.find('.resume-test-banner').exists()).toBe(false)
  })

  it('restaura un test guardado al arrancar, sin pasar antes por /player', async () => {
    appStore.playerState = { test: null, questions: [], current: 0, answers: {}, revealed: {}, timerInterval: null, deadline: null }
    localStorage.setItem('testcraft_player_v1', JSON.stringify({
      test: { id: 't1', title: 'Restaurado' },
      questions: [makeQuestion(), makeQuestion()],
      current: 1, answers: { 0: [0] }, revealed: {}, deadline: null,
    }))
    const { w } = await mountAt('/laws') // reload simulado directamente en /laws
    expect(w.find('.resume-test-banner').text()).toContain('Restaurado')
    expect(w.find('.resume-test-banner').text()).toContain('Pregunta 2 de 2')
  })

  it('sin tiempo límite, no muestra cronómetro', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Sin reloj' }, questions: [makeQuestion()],
      answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    const { w } = await mountAt('/laws')
    expect(w.find('.resume-test-banner').text()).not.toMatch(/⏱/)
  })

  // ── Finalizar sin pasar antes por /player ──────────────────────────────────

  function finishBtn(w) {
    return w.findAll('.resume-test-banner button').find(b => b.text().includes('Finalizar ahora'))
  }

  it('el banner ofrece "Finalizar ahora" junto a "Volver al test"', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' }, questions: [makeQuestion()],
      answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    const { w } = await mountAt('/laws')
    expect(finishBtn(w)).toBeDefined()
  })

  it('con preguntas sin responder, pide confirmación sin salir de Leyes', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' }, questions: [makeQuestion(), makeQuestion()],
      answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    const { w, router } = await mountAt('/laws')
    await finishBtn(w).trigger('click')
    await flushPromises()

    expect(appStore.modal.open).toBe(true)
    expect(router.currentRoute.value.path).toBe('/laws') // no navegó a /player
  })

  it('al confirmar, el test termina y el banner desaparece', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Mi test' },
      questions: [{ type: 'single', text: 'Q', options: [{ text: 'A', correct: true }] }],
      answers: {}, revealed: {}, current: 0, timerInterval: null, deadline: null,
    }
    const { w } = await mountAt('/laws')
    await finishBtn(w).trigger('click')
    appStore.modal.onConfirm()
    await flushPromises()

    expect(w.find('.resume-test-banner').exists()).toBe(false)
  })
})
