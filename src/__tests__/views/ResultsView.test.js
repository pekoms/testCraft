import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ResultsView from '@/views/ResultsView.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/results', component: { template: '<div />' } },
    { path: '/player', component: { template: '<div />' } },
  ],
})

describe('ResultsView', () => {
  let pinia, appStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    appStore = useAppStore()
    appStore.resultData = {
      pct: 80,
      correct: 4,
      total: 5,
      reviewItems: [
        {
          q: { text: '¿Cuánto es 2+2?', type: 'single', options: [{ text: '4', correct: true }] },
          ans: [0], correctIndices: [0], isCorrect: true,
        },
      ],
      test: { id: 'test-1', title: 'Test', questions: [] },
    }
  })

  function mountView() {
    return mount(ResultsView, { global: { plugins: [pinia, router] } })
  }

  it('monta sin errores', () => {
    expect(() => mountView()).not.toThrow()
  })

  it('muestra la puntuación del test', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('80%')
  })

  it('NO tiene botón de Compartir', () => {
    const wrapper = mountView()
    const btns = wrapper.findAll('button')
    expect(btns.some(b => b.text().toLowerCase().includes('compartir'))).toBe(false)
  })

  it('tiene botón de Reintentar', () => {
    const wrapper = mountView()
    const btns = wrapper.findAll('button')
    expect(btns.some(b => b.text().toLowerCase().includes('reintentar'))).toBe(true)
  })

  it('tiene botón de Inicio', () => {
    const wrapper = mountView()
    const btns = wrapper.findAll('button')
    expect(btns.some(b => b.text().toLowerCase().includes('inicio'))).toBe(true)
  })

  it('muestra revisión de respuestas', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('¿Cuánto es 2+2?')
  })
})
