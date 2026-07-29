import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'
import Toast from '@/components/Toast.vue'

describe('Toast', () => {
  let pinia, appStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    appStore = useAppStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function mountToast() {
    return mount(Toast, { global: { plugins: [pinia] } })
  }

  it('monta sin errores', () => {
    expect(() => mountToast()).not.toThrow()
  })

  it('no tiene clase .show cuando no hay mensaje', () => {
    const wrapper = mountToast()
    expect(wrapper.find('.toast').classes()).not.toContain('show')
  })

  it('muestra .show y el texto cuando hay toast activo', () => {
    appStore.toast = { text: 'Test guardado ✓', show: true }
    const wrapper = mountToast()
    expect(wrapper.find('.toast').classes()).toContain('show')
    expect(wrapper.find('.toast').text()).toBe('Test guardado ✓')
  })

  it('showToast activa el toast y lo oculta tras 2.5s', async () => {
    const wrapper = mountToast()
    appStore.showToast('Operación completada')

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.toast').classes()).toContain('show')

    vi.advanceTimersByTime(2500)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.toast').classes()).not.toContain('show')
  })
})
