/**
 * Integration — LawsView: the three levels (topics → laws → reader) and who
 * may edit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLawsStore } from '@/stores/laws'
import LawsView from '@/views/LawsView.vue'

const LAWS = [
  { id: 'l1', title: 'RD 513/2017', content: 'Contenido uno', topic: 'Tema 01', secret: false },
  { id: 'l2', title: 'Ley 31/1995', content: 'Contenido dos', topic: 'Tema 01', secret: false },
  { id: 'l3', title: 'RD 1215/1997', content: 'Contenido tres', topic: 'Tema 02', secret: false },
  { id: 'l4', title: 'Interna', content: 'Contenido cuatro', topic: 'Tema 03', secret: true },
]

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/laws', component: LawsView },
    ],
  })
}

describe('LawsView', () => {
  let pinia, authStore, lawsStore, router

  async function setup(role) {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    lawsStore = useLawsStore()

    authStore.authLocked = false
    authStore.currentUser = { id: 'u1', email: 'u@test.com' }
    authStore.isTeacher = role !== 'alumno'
    authStore.isAdmin = role === 'admin'

    lawsStore.laws = [...LAWS]
    vi.spyOn(lawsStore, 'load').mockImplementation(() => {
      lawsStore.laws = [...LAWS]
    })

    router = makeRouter()
    await router.push('/laws')
    await router.isReady()
  }

  async function mountAs(role) {
    await setup(role)
    const w = mount(LawsView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return w
  }

  // ── Level 1: topics ────────────────────────────────────────────────────────

  it('lista los temas sin tener que pinchar', async () => {
    const w = await mountAs('profesor')
    const cards = w.findAll('.law-topic-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].text()).toContain('Tema 01')
  })

  it('cada tema muestra cuántas leyes tiene', async () => {
    const w = await mountAs('profesor')
    expect(w.findAll('.law-topic-card')[0].text()).toContain('2 leyes')
    expect(w.findAll('.law-topic-card')[1].text()).toContain('1 ley')
  })

  it('el alumno no ve el tema que solo tiene leyes secretas', async () => {
    const w = await mountAs('alumno')
    const names = w.findAll('.law-topic-card').map(c => c.text())
    expect(names).toHaveLength(2)
    expect(names.join(' ')).not.toContain('Tema 03')
  })

  // ── Level 2: laws inside a topic ───────────────────────────────────────────

  it('al pinchar un tema se listan sus leyes', async () => {
    const w = await mountAs('profesor')
    await w.findAll('.law-topic-card')[0].trigger('click')

    const items = w.findAll('.law-item')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('RD 513/2017')
  })

  it('se puede volver a todos los temas', async () => {
    const w = await mountAs('profesor')
    await w.findAll('.law-topic-card')[0].trigger('click')
    await w.find('.topic-breadcrumb button').trigger('click')
    expect(w.findAll('.law-topic-card')).toHaveLength(3)
  })

  // ── Level 3: reader ────────────────────────────────────────────────────────

  it('al elegir una ley se muestra su contenido', async () => {
    const w = await mountAs('profesor')
    await w.findAll('.law-topic-card')[0].trigger('click')
    await w.findAll('.law-item-open')[0].trigger('click')

    expect(w.find('.law-reader-title').text()).toBe('RD 513/2017')
    expect(w.find('.law-reader-body').text()).toBe('Contenido uno')
  })

  it('el lector indica la posición dentro del tema', async () => {
    const w = await mountAs('profesor')
    await w.findAll('.law-topic-card')[0].trigger('click')
    await w.findAll('.law-item-open')[0].trigger('click')
    expect(w.find('.law-reader-pos').text()).toMatch(/1\s*\/\s*2/)
  })

  it('se puede pasar a la ley siguiente del tema', async () => {
    const w = await mountAs('profesor')
    await w.findAll('.law-topic-card')[0].trigger('click')
    await w.findAll('.law-item-open')[0].trigger('click')

    const next = w.findAll('.law-reader-nav button').find(b => b.text().includes('Siguiente'))
    await next.trigger('click')
    expect(w.find('.law-reader-title').text()).toBe('Ley 31/1995')
  })

  it('en la primera ley no se puede retroceder', async () => {
    const w = await mountAs('profesor')
    await w.findAll('.law-topic-card')[0].trigger('click')
    await w.findAll('.law-item-open')[0].trigger('click')

    const prev = w.findAll('.law-reader-nav button').find(b => b.text().includes('Anterior'))
    expect(prev.attributes('disabled')).toBeDefined()
  })

  // ── Permissions ────────────────────────────────────────────────────────────

  it('el alumno no ve el botón de crear', async () => {
    const w = await mountAs('alumno')
    expect(w.findAll('button').find(b => b.text().includes('Nueva ley'))).toBeUndefined()
  })

  it('el profesor sí ve el botón de crear', async () => {
    const w = await mountAs('profesor')
    expect(w.findAll('button').find(b => b.text().includes('Nueva ley'))).toBeDefined()
  })

  it('el alumno no ve acciones de editar ni borrar', async () => {
    const w = await mountAs('alumno')
    await w.findAll('.law-topic-card')[0].trigger('click')
    expect(w.find('.law-item-actions').exists()).toBe(false)
  })

  it('el profesor sí ve editar y borrar', async () => {
    const w = await mountAs('profesor')
    await w.findAll('.law-topic-card')[0].trigger('click')
    expect(w.find('.law-item-actions').exists()).toBe(true)
  })

  it('solo el admin puede marcar una ley como secreta', async () => {
    const w = await mountAs('profesor')
    await w.findAll('button').find(b => b.text().includes('Nueva ley')).trigger('click')
    expect(w.find('.law-secret-toggle').exists()).toBe(false)

    const wa = await mountAs('admin')
    await wa.findAll('button').find(b => b.text().includes('Nueva ley')).trigger('click')
    expect(wa.find('.law-secret-toggle').exists()).toBe(true)
  })

  // ── Create form ────────────────────────────────────────────────────────────

  it('guardar exige título, contenido y tema', async () => {
    const w = await mountAs('profesor')
    await w.findAll('button').find(b => b.text().includes('Nueva ley')).trigger('click')

    const save = w.findAll('.law-modal button').find(b => b.text().includes('Guardar'))
    expect(save.attributes('disabled')).toBeDefined()

    await w.find('.law-modal input[type="text"]').setValue('RD 1/2020')
    await w.find('.law-modal textarea').setValue('Texto de la ley')
    expect(save.attributes('disabled')).toBeDefined() // falta el tema

    await w.findAll('.law-modal input[type="text"]')[1].setValue('Tema 05')
    expect(save.attributes('disabled')).toBeUndefined()
  })

  it('crear una ley la añade al store', async () => {
    const w = await mountAs('profesor')
    vi.spyOn(lawsStore, 'save').mockResolvedValue({ id: 'new', title: 'RD 1/2020' })

    await w.findAll('button').find(b => b.text().includes('Nueva ley')).trigger('click')
    await w.findAll('.law-modal input[type="text"]')[0].setValue('RD 1/2020')
    await w.findAll('.law-modal input[type="text"]')[1].setValue('Tema 05')
    await w.find('.law-modal textarea').setValue('Texto')
    await w.findAll('.law-modal button').find(b => b.text().includes('Guardar')).trigger('click')
    await flushPromises()

    expect(lawsStore.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'RD 1/2020', topic: 'Tema 05', content: 'Texto' })
    )
  })
})
