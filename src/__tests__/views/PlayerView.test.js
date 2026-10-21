import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import PlayerView from '@/views/PlayerView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/player', component: { template: '<div />' } },
    { path: '/results', component: { template: '<div />' } },
  ],
})

function makeQuestion(text = 'Pregunta?') {
  return {
    type: 'single', text,
    options: [{ text: 'A', correct: true }, { text: 'B', correct: false }],
  }
}

describe('PlayerView — encabezado y navegación', () => {
  let pinia, appStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    appStore = useAppStore()
    appStore.playerState = {
      test: { id: 't1', title: 'Test de Historia' },
      questions: [makeQuestion('Q1'), makeQuestion('Q2'), makeQuestion('Q3')],
      current: 1,
      answers: {}, revealed: {}, timerInterval: null, timeLeft: 0,
    }
  })

  function mountView() {
    return mount(PlayerView, { global: { plugins: [pinia, router] } })
  }

  it('muestra el título del test', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Test de Historia')
  })

  it('muestra el número de pregunta actual', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Pregunta 2 de 3')
  })

  it('el botón Anterior está oculto en la primera pregunta', () => {
    appStore.playerState.current = 0
    const wrapper = mountView()
    const prevBtn = wrapper.findAll('.player-nav .btn')[0]
    expect(prevBtn.attributes('style')).toMatch(/visibility:\s*hidden/)
  })

  it('el botón Anterior es visible cuando no estamos en la primera pregunta', () => {
    appStore.playerState.current = 1
    const wrapper = mountView()
    const prevBtn = wrapper.findAll('.player-nav .btn')[0]
    expect(prevBtn.attributes('style') || '').not.toContain('visibility:hidden')
  })

  it('el botón derecho dice "Finalizar" en la última pregunta', () => {
    appStore.playerState.current = 2
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Finalizar')
  })

  it('el botón derecho dice "Siguiente" cuando hay más preguntas', () => {
    appStore.playerState.current = 0
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Siguiente')
  })

  it('hacer clic en Anterior retrocede la pregunta', async () => {
    appStore.playerState.current = 1
    const wrapper = mountView()
    const prevBtn = wrapper.findAll('.player-nav .btn')[0]
    await prevBtn.trigger('click')
    expect(appStore.playerState.current).toBe(0)
  })

  it('hacer clic en Siguiente avanza la pregunta', async () => {
    appStore.playerState.current = 0
    const wrapper = mountView()
    const nextBtn = wrapper.findAll('.player-nav .btn')[1]
    await nextBtn.trigger('click')
    expect(appStore.playerState.current).toBe(1)
  })
})

describe('PlayerView — navegar fuera y volver no pierde el progreso', () => {
  // Reproduce el escenario pedido: a mitad de un test, el usuario va a Leyes
  // (desmonta PlayerView) y vuelve (lo remonta). playerState vive en el store,
  // así que sobrevive por sí solo — lo que este bloque verifica es que el
  // componente, al remontarse, refleja fielmente ese estado y que el
  // cronómetro (que vive en el store, no en el componente) sigue corriendo.
  let pinia, appStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    appStore = useAppStore()
  })

  function mountView() {
    return mount(PlayerView, { global: { plugins: [pinia, router] } })
  }

  it('al remontar, se ve la misma pregunta en la que estaba', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Test' },
      questions: [makeQuestion('Q1'), makeQuestion('Q2'), makeQuestion('Q3')],
      current: 2, answers: {}, revealed: {}, timerInterval: null, deadline: null,
    }
    const first = mountView()
    expect(first.text()).toContain('Pregunta 3 de 3')
    first.unmount() // simula salir a /laws

    const second = mountView() // simula volver a /player
    expect(second.text()).toContain('Pregunta 3 de 3')
  })

  it('al remontar, la respuesta ya marcada sigue seleccionada', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Test' },
      questions: [makeQuestion('Q1')],
      current: 0, answers: { 0: [0] }, revealed: {}, timerInterval: null, deadline: null,
    }
    const first = mountView()
    expect(first.find('.option-play.selected').exists()).toBe(true)
    first.unmount()

    const second = mountView()
    expect(second.find('.option-play.selected').exists()).toBe(true)
  })

  it('el cronómetro sigue actualizándose tras un desmontaje y remontaje', async () => {
    vi.useFakeTimers()
    appStore.playerState = {
      test: { id: 't1', title: 'Test con tiempo' },
      questions: [makeQuestion('Q1')],
      current: 0, answers: {}, revealed: {}, timerInterval: null,
      deadline: Date.now() + 60_000,
    }
    const first = mountView() // onMounted arranca el cronómetro en el store
    vi.advanceTimersByTime(5000)
    await first.vm.$nextTick()
    expect(first.text()).toMatch(/0:5[0-5]/) // quedan ~55s

    first.unmount() // simula ir a /laws — el cronómetro del store sigue vivo
    vi.advanceTimersByTime(10_000) // pasan 10s mientras el componente no existe

    const second = mountView() // simula volver — antes de mi fix se congelaba
    await second.vm.$nextTick()
    expect(second.text()).toMatch(/0:4[0-5]/) // ~45s: el tiempo avanzó de verdad

    vi.advanceTimersByTime(5000)
    await second.vm.$nextTick()
    expect(second.text()).toMatch(/0:4[0-1]/) // sigue bajando en el componente nuevo

    vi.useRealTimers()
  })
})

describe('PlayerView — finalizar antes de llegar al final', () => {
  let pinia, appStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    appStore = useAppStore()
  })

  function mountView() {
    return mount(PlayerView, { global: { plugins: [pinia, router] } })
  }

  it('el botón "Finalizar ahora" está visible aunque no sea la última pregunta', () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Test' },
      questions: [makeQuestion('Q1'), makeQuestion('Q2'), makeQuestion('Q3')],
      current: 0, answers: {}, revealed: {}, timerInterval: null, deadline: null,
    }
    const w = mountView()
    const btn = w.findAll('button').find(b => b.text().includes('Finalizar ahora'))
    expect(btn).toBeDefined()
  })

  it('al pulsarlo con preguntas sin responder, pide confirmación en vez de terminar ya', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Test' },
      questions: [makeQuestion('Q1'), makeQuestion('Q2'), makeQuestion('Q3')],
      current: 0, answers: {}, revealed: {}, timerInterval: null, deadline: null,
    }
    const w = mountView()
    const btn = w.findAll('button').find(b => b.text().includes('Finalizar ahora'))
    await btn.trigger('click')

    expect(appStore.modal.open).toBe(true)
    expect(appStore.playerState.test).not.toBeNull() // sigue sin terminar
  })

  it('al confirmar desde la pregunta 1, el test termina', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Test' },
      questions: [makeQuestion('Q1'), makeQuestion('Q2')],
      current: 0, answers: {}, revealed: {}, timerInterval: null, deadline: null,
    }
    const w = mountView()
    const btn = w.findAll('button').find(b => b.text().includes('Finalizar ahora'))
    await btn.trigger('click')
    appStore.modal.onConfirm()

    expect(appStore.resultData).not.toBeNull()
    expect(appStore.playerState.test).toBeNull()
  })

  it('todo respondido, finaliza directamente sin preguntar', async () => {
    appStore.playerState = {
      test: { id: 't1', title: 'Test' },
      questions: [makeQuestion('Q1')],
      current: 0, answers: { 0: [0] }, revealed: {}, timerInterval: null, deadline: null,
    }
    const w = mountView()
    const btn = w.findAll('button').find(b => b.text().includes('Finalizar ahora'))
    await btn.trigger('click')

    expect(appStore.modal.open).toBe(false)
    expect(appStore.resultData).not.toBeNull()
  })
})
