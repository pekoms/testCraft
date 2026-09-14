/**
 * Integration — PillsView
 * Mounts the real component with a real Pinia + in-memory router.
 * Tests the full flip interaction and card navigation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePillsStore } from '@/stores/pills'
import PillsView from '@/views/PillsView.vue'

const PILLS = [
  { id: '1', front: '¿Cuál es la capital de España?', back: 'Madrid', topic: 'Tema 01. La Función Pública' },
  { id: '2', front: '¿Cuántos planetas hay en el sistema solar?', back: 'Ocho', topic: 'Tema 01. La Función Pública' },
  { id: '3', front: '¿En qué año llegó el hombre a la Luna?', back: '1969', topic: 'Tema 2' },
]

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/pills', component: PillsView },
    ],
  })
}

describe('PillsView — integración', () => {
  let pinia, authStore, pillsStore, router

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    pillsStore = usePillsStore()

    authStore.authLocked = false
    authStore.isTeacher = true
    authStore.isAdmin = true
    authStore.currentUser = { id: 'admin-1', email: 'admin@test.com' }

    // Seed pills directly and stub load() so onMounted doesn't overwrite them
    pillsStore.pills = [...PILLS]
    vi.spyOn(pillsStore, 'load').mockImplementation(() => {
      pillsStore.pills = [...PILLS]
    })

    router = makeRouter()
    await router.push('/pills')
    await router.isReady()
  })

  function mount$() {
    return mount(PillsView, { global: { plugins: [pinia, router] } })
  }

  // ── Flip behavior ────────────────────────────────────────────────────────────

  it('la tarjeta NO está volteada al cargar', async () => {
    const w = mount$()
    await flushPromises()
    expect(w.find('.pill-flip').classes()).not.toContain('flipped')
  })

  it('un clic añade la clase flipped', async () => {
    const w = mount$()
    await flushPromises()

    await w.find('.pill-flip-outer').trigger('click')
    expect(w.find('.pill-flip').classes()).toContain('flipped')
  })

  it('dos clics devuelven la tarjeta al anverso', async () => {
    const w = mount$()
    await flushPromises()

    await w.find('.pill-flip-outer').trigger('click')
    await w.find('.pill-flip-outer').trigger('click')
    expect(w.find('.pill-flip').classes()).not.toContain('flipped')
  })

  it('la cara frontal muestra la etiqueta Pregunta', async () => {
    const w = mount$()
    await flushPromises()

    const labels = w.findAll('.pill-face-label')
    expect(labels[0].text()).toBe('Pregunta')
  })

  it('la cara trasera muestra la etiqueta Respuesta', async () => {
    const w = mount$()
    await flushPromises()

    const labels = w.findAll('.pill-face-label')
    expect(labels[1].text()).toBe('Respuesta')
  })

  it('ambas caras tienen texto no vacío (front y back cargadas desde store)', async () => {
    const w = mount$()
    await flushPromises()

    expect(w.find('.pill-front .pill-face-text').text()).toBeTruthy()
    expect(w.find('.pill-back .pill-face-text').text()).toBeTruthy()
  })

  // ── Card navigation resets flip ──────────────────────────────────────────────

  it('pasar al siguiente naipe resetea el volteo', async () => {
    const w = mount$()
    await flushPromises()

    await w.find('.pill-flip-outer').trigger('click')
    expect(w.find('.pill-flip').classes()).toContain('flipped')

    const [, nextBtn] = w.findAll('.pill-nav-btn')
    await nextBtn.trigger('click')

    expect(w.find('.pill-flip').classes()).not.toContain('flipped')
  })

  it('pasar al naipe anterior resetea el volteo', async () => {
    const w = mount$()
    await flushPromises()

    // Go to card 2 first
    const [, nextBtn] = w.findAll('.pill-nav-btn')
    await nextBtn.trigger('click')

    await w.find('.pill-flip-outer').trigger('click')
    expect(w.find('.pill-flip').classes()).toContain('flipped')

    const [prevBtn] = w.findAll('.pill-nav-btn')
    await prevBtn.trigger('click')

    expect(w.find('.pill-flip').classes()).not.toContain('flipped')
  })

  // ── Counter ──────────────────────────────────────────────────────────────────

  it('el contador muestra 1 / 3 al cargar', async () => {
    const w = mount$()
    await flushPromises()
    expect(w.find('.pills-counter').text()).toMatch(/1\s*\/\s*3/)
  })

  it('el contador avanza al navegar al siguiente', async () => {
    const w = mount$()
    await flushPromises()

    const [, nextBtn] = w.findAll('.pill-nav-btn')
    await nextBtn.trigger('click')
    expect(w.find('.pills-counter').text()).toMatch(/2\s*\/\s*3/)
  })

  // ── Auth guard ───────────────────────────────────────────────────────────────

  it('redirige a / si el usuario no es admin', async () => {
    authStore.isAdmin = false
    const replaceSpy = vi.spyOn(router, 'replace')

    mount$()
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith('/')
  })

  // ── Manage mode ──────────────────────────────────────────────────────────────

  it('el botón Gestionar muestra el modo gestión', async () => {
    const w = mount$()
    await flushPromises()

    const btn = w.findAll('button').find(b => b.text().includes('Gestionar'))
    await btn.trigger('click')

    expect(w.find('.pills-manage-view').exists()).toBe(true)
    expect(w.find('.pills-study-view').exists()).toBe(false)
  })

  it('el botón Estudiar (en modo gestión) vuelve al modo estudio', async () => {
    const w = mount$()
    await flushPromises()

    const manageBtn = w.findAll('button').find(b => b.text().includes('Gestionar'))
    await manageBtn.trigger('click')

    const studyBtn = w.findAll('button').find(b => b.text().includes('Estudiar'))
    await studyBtn.trigger('click')

    expect(w.find('.pills-study-view').exists()).toBe(true)
  })

  it('el modo gestión lista las píldoras cargadas', async () => {
    const w = mount$()
    await flushPromises()

    const manageBtn = w.findAll('button').find(b => b.text().includes('Gestionar'))
    await manageBtn.trigger('click')

    const items = w.findAll('.pill-manage-item')
    expect(items).toHaveLength(3)
  })

  it('el modo gestión muestra la etiqueta de tema en cada píldora', async () => {
    const w = mount$()
    await flushPromises()

    const manageBtn = w.findAll('button').find(b => b.text().includes('Gestionar'))
    await manageBtn.trigger('click')

    const badges = w.findAll('.pill-manage-topic')
    expect(badges.length).toBeGreaterThan(0)
    expect(badges[0].text()).toBe('Tema 01. La Función Pública')
  })

  // ── Topic filter ─────────────────────────────────────────────────────────────

  // Opens the topic dropdown and returns its items (skipping "Todos los temas")
  async function openTopicMenu(w) {
    await w.find('.topic-filter-trigger').trigger('click')
    const items = w.findAll('.topic-menu-item')
    return { all: items[0], topics: items.slice(1) }
  }

  it('el filtro se muestra plegado, sin ocupar una fila por tema', async () => {
    const w = mount$()
    await flushPromises()

    expect(w.find('.pills-topic-filter').exists()).toBe(true)
    expect(w.find('.topic-filter-trigger').exists()).toBe(true)
    // Collapsed: no topic list rendered until it is opened
    expect(w.findAll('.topic-menu-item')).toHaveLength(0)
  })

  it('el desplegable lista todos los temas al abrirlo', async () => {
    const w = mount$()
    await flushPromises()

    const { topics } = await openTopicMenu(w)
    expect(topics).toHaveLength(2)
    expect(topics[0].text()).toContain('Tema 01. La Función Pública')
    expect(topics[1].text()).toContain('Tema 2')
  })

  it('sin filtro el botón muestra "Todos los temas"', async () => {
    const w = mount$()
    await flushPromises()
    expect(w.find('.topic-filter-label').text()).toBe('Todos los temas')
  })

  it('al elegir un tema solo se muestran sus píldoras', async () => {
    const w = mount$()
    await flushPromises()

    const { topics } = await openTopicMenu(w)
    await topics[1].trigger('click') // Tema 2 → 1 pill

    expect(w.find('.pills-counter').text()).toMatch(/1\s*\/\s*1/)
  })

  it('el botón refleja el tema elegido', async () => {
    const w = mount$()
    await flushPromises()

    const { topics } = await openTopicMenu(w)
    await topics[1].trigger('click')

    expect(w.find('.topic-filter-label').text()).toBe('Tema 2')
    expect(w.find('.topic-filter-trigger').classes()).toContain('filtered')
  })

  it('con varios temas elegidos el botón resume cuántos son', async () => {
    const w = mount$()
    await flushPromises()

    const { topics } = await openTopicMenu(w)
    await topics[0].trigger('click')
    await topics[1].trigger('click')

    expect(w.find('.topic-filter-label').text()).toBe('2 temas')
    expect(w.find('.pills-counter').text()).toMatch(/1\s*\/\s*3/)
  })

  it('el tema elegido se marca en el desplegable', async () => {
    const w = mount$()
    await flushPromises()

    let { topics } = await openTopicMenu(w)
    expect(topics[0].classes()).not.toContain('active')

    await topics[0].trigger('click')
    expect(w.findAll('.topic-menu-item')[1].classes()).toContain('active')
  })

  it('"Todos los temas" limpia el filtro', async () => {
    const w = mount$()
    await flushPromises()

    const { all, topics } = await openTopicMenu(w)
    await topics[1].trigger('click') // Tema 2 → 1 pill
    await all.trigger('click')

    expect(w.find('.pills-counter').text()).toMatch(/1\s*\/\s*3/)
    expect(w.find('.topic-filter-label').text()).toBe('Todos los temas')
  })

  it('el clic en el fondo cierra el desplegable', async () => {
    const w = mount$()
    await flushPromises()

    await openTopicMenu(w)
    expect(w.findAll('.topic-menu-item').length).toBeGreaterThan(0)

    await w.find('.topic-menu-backdrop').trigger('click')
    expect(w.findAll('.topic-menu-item')).toHaveLength(0)
  })
})
