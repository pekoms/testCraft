import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useUsersStore } from '@/stores/users'
import UsersView from '@/views/UsersView.vue'

describe('UsersView', () => {
  let pinia

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    // Stub callManageUsers para evitar llamadas reales a Supabase
    const usersStore = useUsersStore()
    vi.spyOn(usersStore, 'callManageUsers').mockResolvedValue({ students: [] })
  })

  function mountView() {
    return mount(UsersView, { global: { plugins: [pinia] } })
  }

  it('monta sin errores', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })

  it('NO tiene botón "Copiar enlace" en las filas de alumnos', async () => {
    const usersStore = useUsersStore()
    usersStore.callManageUsers.mockResolvedValue({
      students: [
        { id: 'u1', email: 'a@b.com', is_blocked: false, last_sign_in_at: null, login_key: 'key123' },
      ],
    })
    const wrapper = mountView()
    await flushPromises()
    const buttons = wrapper.findAll('button')
    expect(buttons.some(b => b.text().toLowerCase().includes('copiar enlace'))).toBe(false)
  })

  it('muestra el botón de invitar alumno', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Invitar alumno')
  })

  it('muestra mensaje de carga mientras espera', () => {
    const wrapper = mountView()
    expect(wrapper.text()).toContain('Cargando')
  })

  it('muestra texto "Sin acceso aún" para alumnos sin último acceso', async () => {
    const usersStore = useUsersStore()
    usersStore.callManageUsers.mockResolvedValue({
      students: [
        { id: 'u1', email: 'nuevo@b.com', is_blocked: false, last_sign_in_at: null, login_key: 'k' },
      ],
    })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Sin acceso aún')
  })

  it('muestra estado Pendiente para alumno sin acceso', async () => {
    const usersStore = useUsersStore()
    usersStore.callManageUsers.mockResolvedValue({
      students: [
        { id: 'u1', email: 'nuevo@b.com', is_blocked: false, last_sign_in_at: null, login_key: 'k' },
      ],
    })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Pendiente')
  })

  it('muestra estado Bloqueado para alumno bloqueado', async () => {
    const usersStore = useUsersStore()
    usersStore.callManageUsers.mockResolvedValue({
      students: [
        { id: 'u1', email: 'blocked@b.com', is_blocked: true, last_sign_in_at: '2024-01-01', login_key: 'k' },
      ],
    })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Bloqueado')
  })
})
