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
