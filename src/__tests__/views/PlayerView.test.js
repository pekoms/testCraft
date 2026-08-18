import { describe, it, expect, beforeEach } from 'vitest'
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

describe('PlayerView — botones flotantes de navegación', () => {
  let pinia, appStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    appStore = useAppStore()
  })

  function setupPlayer(questions, current = 0) {
    appStore.playerState = {
      test: { id: 't1', title: 'Test' },
      questions,
      current,
      answers: {}, revealed: {}, timerInterval: null, timeLeft: 0,
    }
  }

  function mountView() {
    return mount(PlayerView, { global: { plugins: [pinia, router] } })
  }

  it('muestra el botón flotante derecho (siguiente)', () => {
    setupPlayer([makeQuestion(), makeQuestion()])
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.right')
    expect(btn.exists()).toBe(true)
  })

  it('muestra el botón flotante izquierdo (anterior)', () => {
    setupPlayer([makeQuestion(), makeQuestion()])
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.left')
    expect(btn.exists()).toBe(true)
  })

  it('el botón izquierdo tiene clase invisible en la primera pregunta', () => {
    setupPlayer([makeQuestion(), makeQuestion()], 0)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.left')
    expect(btn.classes()).toContain('invisible')
  })

  it('el botón izquierdo NO tiene clase invisible cuando no estamos en la primera pregunta', () => {
    setupPlayer([makeQuestion(), makeQuestion()], 1)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.left')
    expect(btn.classes()).not.toContain('invisible')
  })

  it('el botón derecho muestra icono de check en la última pregunta', () => {
    setupPlayer([makeQuestion()], 0)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.right')
    expect(btn.classes()).toContain('finish')
  })

  it('el botón derecho NO tiene clase finish cuando hay más preguntas', () => {
    setupPlayer([makeQuestion(), makeQuestion()], 0)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.right')
    expect(btn.classes()).not.toContain('finish')
  })

  it('el aria-label del botón derecho es "Finalizar test" en la última pregunta', () => {
    setupPlayer([makeQuestion()], 0)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.right')
    expect(btn.attributes('aria-label')).toBe('Finalizar test')
  })

  it('el aria-label del botón derecho es "Siguiente pregunta" cuando hay más', () => {
    setupPlayer([makeQuestion(), makeQuestion()], 0)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.right')
    expect(btn.attributes('aria-label')).toBe('Siguiente pregunta')
  })

  it('el aria-label del botón izquierdo es siempre "Pregunta anterior"', () => {
    setupPlayer([makeQuestion(), makeQuestion()], 1)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.left')
    expect(btn.attributes('aria-label')).toBe('Pregunta anterior')
  })

  it('hacer clic en el botón izquierdo llama a prevQuestion', async () => {
    setupPlayer([makeQuestion(), makeQuestion()], 1)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.left')
    await btn.trigger('click')
    expect(appStore.playerState.current).toBe(0)
  })

  it('hacer clic en el botón derecho avanza a la siguiente pregunta', async () => {
    setupPlayer([makeQuestion(), makeQuestion()], 0)
    const wrapper = mountView()
    const btn = wrapper.find('.player-float-btn.right')
    await btn.trigger('click')
    expect(appStore.playerState.current).toBe(1)
  })
})

describe('PlayerView — barra de progreso y encabezado', () => {
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
})
