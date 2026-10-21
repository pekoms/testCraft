<template>
  <div v-if="offline" class="offline-banner">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
    Sin conexión — mostrando tests guardados
  </div>
  <a href="#contenido" class="skip-link">Saltar al contenido</a>
  <NavBar />
  <!-- Lets a test survive browsing away mid-attempt (e.g. to check a law) —
       playerState lives in the store regardless, this is just the way back. -->
  <div v-if="resumeTest" class="resume-test-banner">
    <span class="resume-test-info">
      <strong>{{ resumeTest.title }}</strong>
      Pregunta {{ appStore.playerState.current + 1 }} de {{ appStore.playerState.questions.length }}
      <span v-if="resumeTimerText">{{ resumeTimerText }}</span>
    </span>
    <span class="resume-test-actions">
      <button class="btn sm accent" @click="router.push('/player')">Volver al test</button>
      <button class="btn sm" @click="appStore.requestFinishTest()">Finalizar ahora</button>
    </span>
  </div>
  <main id="contenido">
    <AuthPanel v-if="authStore.authLocked" />
    <RouterView v-else />
  </main>
  <Toast />
  <ConfirmModal />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import NavBar from '@/components/NavBar.vue'
import AuthPanel from '@/components/AuthPanel.vue'
import Toast from '@/components/Toast.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
onMounted(() => authStore.init())

// Restores an in-progress test on app boot regardless of which route a reload
// happened to land on — PlayerView.onMounted does this too as a fallback, but
// doing it here means a reload on /laws (not just /player) still shows the
// "volver al test" banner right away instead of only after visiting /player.
// Idempotent: a no-op if playerState.test is already set.
onMounted(() => {
  if (!appStore.playerState.test) appStore.restorePlayer()
})

// Hidden on /player itself (that's the test, not a way back to it) and while
// AuthPanel is showing (no confirmed session yet — nothing to resume into)
const resumeTest = computed(() => {
  if (authStore.authLocked || route.path === '/player') return null
  return appStore.playerState.test
})

const resumeTimerText = computed(() => {
  appStore.clockTick // reactive dependency, ticks every second
  const d = appStore.playerState.deadline
  if (!d) return ''
  const left = Math.max(0, Math.round((d - Date.now()) / 1000))
  const m = Math.floor(left / 60)
  const s = left % 60
  return `⏱ ${m}:${String(s).padStart(2, '0')}`
})

const offline = ref(!navigator.onLine)
function handleOnline() { offline.value = false }
function handleOffline() { offline.value = true }
onMounted(() => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})
onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})
</script>
