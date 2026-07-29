import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import AuthPanel from '@/components/AuthPanel.vue'

describe('AuthPanel', () => {
  let pinia, authStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
  })

  function mountPanel() {
    return mount(AuthPanel, { global: { plugins: [pinia] } })
  }

  it('monta sin errores', () => {
    expect(() => mountPanel()).not.toThrow()
  })

  it('muestra input de email en el paso inicial', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
  })

  it('muestra input de contraseña en el paso password', () => {
    authStore.authStep = 'password'
    const wrapper = mountPanel()
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
  })

  it('título "Bienvenido" en paso email', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('h2').text()).toBe('Bienvenido')
  })

  it('título "Acceso de profesor" en paso password', () => {
    authStore.authStep = 'password'
    const wrapper = mountPanel()
    expect(wrapper.find('h2').text()).toBe('Acceso de profesor')
  })

  it('muestra mensaje de error si hay authMsg', () => {
    authStore.authMsg = { text: 'Correo no registrado', type: 'error' }
    const wrapper = mountPanel()
    const msg = wrapper.find('.auth-msg')
    expect(msg.exists()).toBe(true)
    expect(msg.text()).toBe('Correo no registrado')
    expect(msg.classes()).toContain('error')
  })

  it('no muestra mensaje cuando authMsg está vacío', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.auth-msg').exists()).toBe(false)
  })

  it('botón "Continuar" en paso email', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('button[class*="btn"]').text()).toContain('Continuar')
  })

  it('botón "Entrar" en paso password', () => {
    authStore.authStep = 'password'
    const wrapper = mountPanel()
    expect(wrapper.find('button[class*="btn"]').text()).toContain('Entrar')
  })

  it('enlace "← Cambiar correo" solo aparece en paso password', () => {
    const emailWrapper = mountPanel()
    expect(emailWrapper.find('.auth-toggle').exists()).toBe(false)

    authStore.authStep = 'password'
    const passwordWrapper = mountPanel()
    expect(passwordWrapper.find('.auth-toggle').exists()).toBe(true)
  })
})
