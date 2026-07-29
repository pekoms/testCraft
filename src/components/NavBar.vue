<template>
  <nav>
    <div class="logo">Test<span>Craft</span></div>

    <div v-if="!authStore.authLocked" class="nav-actions">
      <button class="btn" @click="goHome">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Inicio
      </button>

      <button v-if="authStore.isTeacher" class="btn" @click="router.push('/users')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Alumnos
      </button>

      <button class="btn" @click="router.push('/stats')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        Estadísticas
      </button>
    </div>

    <div v-if="!authStore.authLocked" class="user-badge">
      <span v-if="authStore.currentUser"
        style="background:var(--accent-light);color:var(--accent);padding:2px 8px;border-radius:99px;font-size:11px;font-weight:500">
        {{ authStore.isTeacher ? 'Profesor' : 'Alumno' }}
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
  </nav>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

function goHome() {
  appStore.backToTopics()
  router.push('/')
}
</script>
