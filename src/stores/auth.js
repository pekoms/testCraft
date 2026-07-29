import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'alejandropi301196@gmail.com'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const isTeacher = ref(false)
  const isAdmin = ref(false)
  const appReady = ref(false)
  const authLocked = ref(true)
  const authStep = ref('email') // 'email' | 'password'
  const resolvedEmail = ref('')
  const authMsg = ref({ text: '', type: '' })

  function showAuthMsg(text, type) {
    authMsg.value = { text, type }
  }

  function clearAuthMsg() {
    authMsg.value = { text: '', type: '' }
  }

  async function fetchRole() {
    if (!supabase || !currentUser.value) return true
    const { data } = await supabase
      .from('profiles').select('is_teacher').eq('id', currentUser.value.id).maybeSingle()
    return !!(data?.is_teacher)
  }

  async function onLogin(user) {
    currentUser.value = user
    isAdmin.value = user.email?.toLowerCase() === ADMIN_EMAIL
    if (!appReady.value) {
      appReady.value = true
      isTeacher.value = await fetchRole()

      if (!isTeacher.value) {
        const { data: profile } = await supabase
          .from('profiles').select('is_blocked').eq('id', user.id).maybeSingle()
        if (profile?.is_blocked) {
          appReady.value = false
          await supabase.auth.signOut()
          showAuthMsg('Tu cuenta está bloqueada. Contacta con tu profesor.', 'error')
          return
        }
      }

      // Lazy import to avoid circular dependency
      const { useAppStore } = await import('./app')
      const appStore = useAppStore()
      appStore.tests = await appStore.fetchTests()
      await appStore.checkImportFromUrl()
    }
    authLocked.value = false
  }

  function showLogin() {
    currentUser.value = null
    appReady.value = false
    isTeacher.value = false
    isAdmin.value = false
    authLocked.value = true
    authStep.value = 'email'
    resolvedEmail.value = ''
    clearAuthMsg()
    import('./app').then(({ useAppStore }) => {
      useAppStore().tests = []
    })
  }

  async function doSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  function goBackToEmail() {
    authStep.value = 'email'
    resolvedEmail.value = ''
    clearAuthMsg()
  }

  async function checkEmailRole(email) {
    if (!email) { showAuthMsg('Introduce tu correo electrónico', 'error'); return }
    clearAuthMsg()
    try {
      const { data: role, error } = await supabase.rpc('get_profile_role', { p_email: email })
      if (error) throw error
      if (role === 'teacher') {
        resolvedEmail.value = email
        authStep.value = 'password'
      } else if (role === 'student') {
        const { data: loginKey, error: keyErr } = await supabase.rpc('get_student_login_key', { p_email: email })
        if (keyErr || !loginKey) throw new Error('No se pudo obtener acceso. Contacta con tu profesor.')
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: loginKey })
        if (signInErr) throw new Error('Error al acceder. Contacta con tu profesor.')
      } else if (role === 'blocked') {
        showAuthMsg('Tu cuenta está bloqueada. Contacta con tu profesor.', 'error')
      } else {
        showAuthMsg('Este correo no está registrado en la plataforma.', 'error')
      }
    } catch (e) {
      showAuthMsg(e.message || 'Error de conexión. Inténtalo de nuevo.', 'error')
    }
  }

  async function signInTeacher(password) {
    if (!password) { showAuthMsg('Introduce tu contraseña', 'error'); return }
    clearAuthMsg()
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail.value, password })
      if (error) throw error
    } catch (e) {
      const m = (e.message || '').toLowerCase()
      let msg = e.message
      if (m.includes('invalid login') || m.includes('invalid credentials')) msg = 'Contraseña incorrecta.'
      else if (m.includes('rate limit') || m.includes('too many')) msg = 'Demasiados intentos. Espera un momento.'
      showAuthMsg(msg, 'error')
    }
  }

  async function init() {
    if (!supabase) {
      authLocked.value = false
      appReady.value = true
      isTeacher.value = true
      const { useAppStore } = await import('./app')
      const appStore = useAppStore()
      appStore.tests = await appStore.fetchTests()
      await appStore.checkImportFromUrl()
      return
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) onLogin(session.user)
      else showLogin()
    })

    // Auto-login de alumno por URL (?k=loginKey&e=email)
    const params = new URLSearchParams(window.location.search)
    const k = params.get('k'), e = params.get('e')
    if (k && e) {
      window.history.replaceState({}, '', location.pathname + location.hash)
      const { error } = await supabase.auth.signInWithPassword({
        email: decodeURIComponent(e), password: k,
      })
      if (error) {
        authLocked.value = true
        showAuthMsg('El enlace no es válido o ha expirado.', 'error')
      }
    } else {
      await supabase.auth.getSession()
    }
  }

  return {
    currentUser, isTeacher, isAdmin, appReady, authLocked, authStep, resolvedEmail, authMsg,
    showAuthMsg, clearAuthMsg, goBackToEmail, checkEmailRole, signInTeacher, doSignOut, init, onLogin, showLogin,
  }
})
