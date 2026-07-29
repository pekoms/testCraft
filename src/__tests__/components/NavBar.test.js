import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/NavBar.vue'

// Router mínimo para satisfacer useRouter() dentro del componente
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/users', component: { template: '<div />' } },
    { path: '/stats', component: { template: '<div />' } },
  ],
})

describe('NavBar', () => {
  let pinia, authStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
  })

  function mountNav() {
    return mount(NavBar, { global: { plugins: [pinia, router] } })
  }

  it('monta sin errores', () => {
    expect(() => mountNav()).not.toThrow()
  })

  it('siempre muestra el logo TestCraft', () => {
    const wrapper = mountNav()
    expect(wrapper.find('.logo').text()).toContain('TestCraft')
  })

  it('oculta la navegación cuando authLocked es true', () => {
    authStore.authLocked = true
    const wrapper = mountNav()
    expect(wrapper.find('.nav-actions').exists()).toBe(false)
  })

  it('muestra la navegación cuando el usuario está autenticado', () => {
    authStore.authLocked = false
    const wrapper = mountNav()
    expect(wrapper.find('.nav-actions').exists()).toBe(true)
  })

  it('no muestra el botón Alumnos para estudiantes', () => {
    authStore.authLocked = false
    authStore.isTeacher = false
    const wrapper = mountNav()
    const btns = wrapper.findAll('button')
    expect(btns.some(b => b.text().includes('Alumnos'))).toBe(false)
  })

  it('muestra el botón Alumnos para profesores', () => {
    authStore.authLocked = false
    authStore.isTeacher = true
    const wrapper = mountNav()
    const btns = wrapper.findAll('button')
    expect(btns.some(b => b.text().includes('Alumnos'))).toBe(true)
  })

  it('muestra el botón de Estadísticas cuando hay sesión', () => {
    authStore.authLocked = false
    const wrapper = mountNav()
    const btns = wrapper.findAll('button')
    expect(btns.some(b => b.text().includes('Estadísticas'))).toBe(true)
  })

  it('muestra el badge de rol para el profesor', () => {
    authStore.authLocked = false
    authStore.currentUser = { email: 'teacher@school.com' }
    authStore.isTeacher = true
    const wrapper = mountNav()
    expect(wrapper.text()).toContain('Profesor')
  })

  it('muestra el badge de rol para el alumno', () => {
    authStore.authLocked = false
    authStore.currentUser = { email: 'student@school.com' }
    authStore.isTeacher = false
    const wrapper = mountNav()
    expect(wrapper.text()).toContain('Alumno')
  })
})
