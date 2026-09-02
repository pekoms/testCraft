<template>
  <nav>
    <div class="logo">Test<span>Craft</span></div>

    <!-- Desktop nav links (hidden on mobile) -->
    <div v-if="!authStore.authLocked" class="nav-actions">
      <button class="btn" @click="goHome">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Inicio
      </button>
      <button v-if="authStore.isTeacher" class="btn" @click="go('/users')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Alumnos
      </button>
      <button class="btn" @click="go('/stats')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Estadísticas
      </button>
      <button v-if="authStore.isAdmin" class="btn" @click="go('/pills')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <rect x="2" y="6" width="20" height="12" rx="6"/>
          <circle cx="9" cy="12" r="4" fill="currentColor" stroke="none" opacity="0.35"/>
          <circle cx="9" cy="12" r="2.5"/>
        </svg>
        Píldoras
      </button>
    </div>

    <div class="nav-right">
      <!-- Theme switcher — always visible -->
      <div class="theme-switcher">
        <button
          v-for="t in themes" :key="t.id"
          class="theme-btn" :class="{ active: theme === t.id }"
          :title="t.label"
          @click="setTheme(t.id)"
        >
          <svg v-if="t.id === 'light'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          <svg v-else-if="t.id === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      </div>

      <!-- Desktop user info (hidden on mobile) -->
      <template v-if="!authStore.authLocked">
        <div class="user-badge">
          <span
            v-if="authStore.currentUser"
            class="role-pill"
            :class="authStore.isAdmin ? 'admin' : ''"
          >
            {{ roleLabel }}
          </span>
          <span class="email">{{ authStore.currentUser?.email }}</span>
          <button class="btn sm" @click="authStore.doSignOut()" title="Cerrar sesión">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </template>

      <!-- Hamburger button (shown on mobile only) -->
      <button
        v-if="!authStore.authLocked"
        class="hamburger"
        :class="{ open: menuOpen }"
        @click="menuOpen = !menuOpen"
        :aria-label="menuOpen ? 'Cerrar menú' : 'Abrir menú'"
        :aria-expanded="menuOpen"
      >
        <svg v-if="menuOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>
  </nav>

  <!-- Mobile menu dropdown (teleported outside nav to avoid clipping) -->
  <Teleport to="body">
    <Transition name="slide-down">
      <div v-if="menuOpen && !authStore.authLocked" class="mobile-menu">
        <!-- User info header -->
        <div class="mobile-menu-user">
          <span class="role-pill" :class="authStore.isAdmin ? 'admin' : ''">{{ roleLabel }}</span>
          <span class="mobile-user-email">{{ authStore.currentUser?.email }}</span>
        </div>

        <div class="mobile-menu-divider"></div>

        <!-- Nav links -->
        <button class="mobile-link" @click="goHome(); menuOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Inicio
        </button>
        <button v-if="authStore.isTeacher" class="mobile-link" @click="go('/users'); menuOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Alumnos
        </button>
        <button class="mobile-link" @click="go('/stats'); menuOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Estadísticas
        </button>
        <button v-if="authStore.isAdmin" class="mobile-link" @click="go('/pills'); menuOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <rect x="2" y="6" width="20" height="12" rx="6"/>
            <circle cx="9" cy="12" r="4" fill="currentColor" stroke="none" opacity="0.35"/>
            <circle cx="9" cy="12" r="2.5"/>
          </svg>
          Píldoras
        </button>

        <div class="mobile-menu-divider"></div>

        <button class="mobile-link danger" @click="authStore.doSignOut(); menuOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </div>
    </Transition>

    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="menuOpen && !authStore.authLocked" class="mobile-menu-backdrop" @click="menuOpen = false"></div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const { theme, themes, setTheme } = useTheme()
const menuOpen = ref(false)

const roleLabel = computed(() =>
  authStore.isAdmin ? 'Admin' : authStore.isTeacher ? 'Profesor' : 'Alumno'
)

// Wraps router.push so that duplicate-navigation errors are suppressed
// (those are benign) while real errors surface to the console.
function go(path) {
  router.push(path).catch(err => {
    if (err?.name !== 'NavigationDuplicated' && !err?.message?.includes('Avoided redundant navigation')) {
      console.error('[NavBar] navigation error:', err)
    }
  })
}

function goHome() {
  appStore.backToTopics()
  go('/')
}
</script>
