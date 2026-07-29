import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

describe('auth store — estado inicial', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
  })

  it('empieza bloqueado con paso email', () => {
    expect(store.authLocked).toBe(true)
    expect(store.authStep).toBe('email')
  })

  it('usuario y rol comienzan sin asignar', () => {
    expect(store.currentUser).toBeNull()
    expect(store.isTeacher).toBe(false)
  })

  it('mensaje de error empieza vacío', () => {
    expect(store.authMsg.text).toBe('')
    expect(store.authMsg.type).toBe('')
  })
})

describe('auth store — transiciones de estado', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
  })

  it('showLogin resetea todo el estado de autenticación', () => {
    // Simula estado de sesión activa
    store.currentUser = { id: '123', email: 'teacher@school.com' }
    store.isTeacher = true
    store.authLocked = false
    store.appReady = true
    store.authStep = 'password'
    store.resolvedEmail = 'teacher@school.com'

    store.showLogin()

    expect(store.authLocked).toBe(true)
    expect(store.currentUser).toBeNull()
    expect(store.isTeacher).toBe(false)
    expect(store.appReady).toBe(false)
    expect(store.authStep).toBe('email')
    expect(store.resolvedEmail).toBe('')
  })

  it('goBackToEmail resetea el paso y el email resuelto', () => {
    store.authStep = 'password'
    store.resolvedEmail = 'teacher@school.com'
    store.authMsg = { text: 'Contraseña incorrecta', type: 'error' }

    store.goBackToEmail()

    expect(store.authStep).toBe('email')
    expect(store.resolvedEmail).toBe('')
    expect(store.authMsg.text).toBe('') // también limpia el mensaje
  })

  it('showAuthMsg guarda texto y tipo', () => {
    store.showAuthMsg('Este correo no está registrado', 'error')
    expect(store.authMsg.text).toBe('Este correo no está registrado')
    expect(store.authMsg.type).toBe('error')
  })

  it('clearAuthMsg borra el mensaje', () => {
    store.authMsg = { text: 'Algún error', type: 'error' }
    store.clearAuthMsg()
    expect(store.authMsg.text).toBe('')
    expect(store.authMsg.type).toBe('')
  })

  it('showAuthMsg con tipo info funciona igual', () => {
    store.showAuthMsg('Enlace enviado a tu correo', 'info')
    expect(store.authMsg.text).toBe('Enlace enviado a tu correo')
    expect(store.authMsg.type).toBe('info')
  })
})

describe('auth store — init sin supabase', () => {
  let store
  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
  })

  it('con supabase null, init desbloquea sin necesitar sesión', async () => {
    // supabase es null (mocked en setup.js), debe desbloquear
    await store.init()
    expect(store.authLocked).toBe(false)
    expect(store.appReady).toBe(true)
    expect(store.isTeacher).toBe(true) // modo sin supabase: profesor por defecto
  })
})
