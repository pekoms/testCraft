import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '@/stores/app'

describe('AppStore — Toast', () => {
  let appStore

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('showToast activa la notificación con el texto correcto', () => {
    appStore.showToast('Test guardado')
    expect(appStore.toast.show).toBe(true)
    expect(appStore.toast.text).toBe('Test guardado')
  })

  it('showToast oculta la notificación después de 2500 ms', () => {
    appStore.showToast('Mensaje')
    vi.advanceTimersByTime(2500)
    expect(appStore.toast.show).toBe(false)
    expect(appStore.toast.text).toBe('')
  })

  it('showToast consecutivo cancela el timer anterior', () => {
    appStore.showToast('Primero')
    vi.advanceTimersByTime(1000)
    appStore.showToast('Segundo')
    vi.advanceTimersByTime(1000) // sólo han pasado 1 s del segundo toast
    expect(appStore.toast.show).toBe(true)
    expect(appStore.toast.text).toBe('Segundo')
  })
})

describe('AppStore — Modal', () => {
  let appStore

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
  })

  it('modal empieza cerrado', () => {
    expect(appStore.modal.open).toBe(false)
  })

  it('showModal abre el modal con todos los campos', () => {
    const onConfirm = vi.fn()
    appStore.showModal('Eliminar test', '¿Estás seguro?', onConfirm, 'Eliminar', true)
    expect(appStore.modal.open).toBe(true)
    expect(appStore.modal.title).toBe('Eliminar test')
    expect(appStore.modal.body).toBe('¿Estás seguro?')
    expect(appStore.modal.confirmLabel).toBe('Eliminar')
    expect(appStore.modal.danger).toBe(true)
  })

  it('showModal usa valores por defecto correctos', () => {
    appStore.showModal('Título', 'Cuerpo', vi.fn())
    expect(appStore.modal.confirmLabel).toBe('Eliminar')
    expect(appStore.modal.danger).toBe(true)
  })

  it('showModal almacena el callback y es ejecutable', () => {
    const onConfirm = vi.fn()
    appStore.showModal('T', 'B', onConfirm)
    appStore.modal.onConfirm()
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('closeModal cierra el modal', () => {
    appStore.modal.open = true
    appStore.closeModal()
    expect(appStore.modal.open).toBe(false)
  })
})

describe('AppStore — genId', () => {
  let appStore

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
  })

  it('genId devuelve un string no vacío', () => {
    const id = appStore.genId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('genId devuelve IDs únicos en llamadas sucesivas', () => {
    const ids = Array.from({ length: 10 }, () => appStore.genId())
    const unique = new Set(ids)
    expect(unique.size).toBe(10)
  })
})

describe('AppStore — Tests locales (sin Supabase)', () => {
  let appStore

  beforeEach(() => {
    setActivePinia(createPinia())
    appStore = useAppStore()
    localStorage.clear()
  })

  it('fetchTests devuelve array vacío si no hay datos locales', async () => {
    const result = await appStore.fetchTests()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })

  it('persistTest guarda el test en localStorage', async () => {
    const test = { id: 'test-1', title: 'Mi test', questions: [], published: false }
    await appStore.persistTest(test)
    const stored = JSON.parse(localStorage.getItem('testcraft_tests_v1') || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('test-1')
  })

  it('persistTest actualiza un test existente', async () => {
    const test = { id: 'test-1', title: 'Original', questions: [], published: false }
    await appStore.persistTest(test)
    await appStore.persistTest({ ...test, title: 'Actualizado' })
    const stored = JSON.parse(localStorage.getItem('testcraft_tests_v1') || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].title).toBe('Actualizado')
  })
})
