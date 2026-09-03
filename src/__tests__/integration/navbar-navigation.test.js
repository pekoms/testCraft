/**
 * Integration — NavBar navigation
 * Mounts NavBar with a real router and verifies that clicking the nav
 * buttons changes the route. This is the component-level equivalent of
 * the E2E navigation tests and covers the exact bug that was fixed:
 * the Alumnos / Estadísticas buttons silently did nothing.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import NavBar from '@/components/NavBar.vue'

const Stub = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/users', component: Stub },
      { path: '/stats', component: Stub },
      { path: '/pills', component: Stub },
    ],
  })
}

describe('NavBar — integración de navegación', () => {
  let pinia, authStore, appStore, router

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    appStore = useAppStore()

    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.isAdmin = true
    authStore.currentUser = { id: 'u1', email: 'teacher@test.com' }

    router = makeRouter()
    await router.push('/')
    await router.isReady()
  })

  function mountNav() {
    return mount(NavBar, { global: { plugins: [pinia, router] } })
  }

  // ── Desktop nav buttons ─────────────────────────────────────────────────────

  it('Estadísticas navega a /stats', async () => {
    const w = mountNav()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Estadísticas'))
    await btn.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/stats')
  })

  it('Alumnos navega a /users', async () => {
    const w = mountNav()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Alumnos'))
    await btn.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/users')
  })

  it('Píldoras navega a /pills', async () => {
    const w = mountNav()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Píldoras'))
    await btn.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/pills')
  })

  it('Inicio regresa a / desde /stats', async () => {
    await router.push('/stats')
    const w = mountNav()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Inicio'))
    await btn.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/')
  })

  it('hacer clic dos veces en Estadísticas no lanza error', async () => {
    const w = mountNav()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Estadísticas'))

    // First click navigates; second click is a duplicate — go() must suppress it silently
    await btn.trigger('click')
    await flushPromises()
    await expect(btn.trigger('click')).resolves.not.toThrow()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/stats')
  })

  // ── Teacher vs student visibility ───────────────────────────────────────────

  it('Alumnos solo aparece para isTeacher=true', async () => {
    authStore.isTeacher = false
    const w = mountNav()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Alumnos'))
    expect(btn).toBeUndefined()
  })

  it('Píldoras solo aparece para isAdmin=true', async () => {
    authStore.isAdmin = false
    const w = mountNav()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Píldoras'))
    expect(btn).toBeUndefined()
  })

  it('Estadísticas siempre aparece cuando authLocked=false', async () => {
    authStore.isTeacher = false
    authStore.isAdmin = false
    const w = mountNav()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Estadísticas'))
    expect(btn).toBeDefined()
  })

  // ── Full navigation sequence ─────────────────────────────────────────────────

  it('secuencia Stats → Alumnos → Inicio → Stats funciona sin errores', async () => {
    const w = mountNav()
    await flushPromises()

    const statsBtn = w.findAll('button').find(b => b.text().includes('Estadísticas'))
    const usersBtn = w.findAll('button').find(b => b.text().includes('Alumnos'))
    const homeBtn  = w.findAll('button').find(b => b.text().includes('Inicio'))

    await statsBtn.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/stats')

    await usersBtn.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/users')

    await homeBtn.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')

    await statsBtn.trigger('click'); await flushPromises()
    expect(router.currentRoute.value.path).toBe('/stats')
  })
})
