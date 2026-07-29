<template>
  <div id="login">
    <div class="auth-card">
      <h2>{{ title }}</h2>
      <p class="sub">{{ subtitle }}</p>

      <div v-if="authStore.authMsg.text" class="auth-msg show" :class="authStore.authMsg.type">
        {{ authStore.authMsg.text }}
      </div>

      <!-- Email step -->
      <template v-if="authStore.authStep === 'email'">
        <div class="field-group">
          <input
            ref="emailInput"
            type="email"
            v-model="email"
            placeholder="Correo electrónico"
            autocomplete="email"
            @keydown.enter="submit"
          >
        </div>
      </template>

      <!-- Password step (teacher) -->
      <template v-else-if="authStore.authStep === 'password'">
        <div class="field-group">
          <input
            ref="passwordInput"
            type="password"
            v-model="password"
            placeholder="Contraseña"
            autocomplete="current-password"
            @keydown.enter="submit"
          >
        </div>
      </template>

      <button class="btn accent" :disabled="loading" @click="submit">
        {{ btnLabel }}
      </button>

      <div v-if="authStore.authStep === 'password'" class="auth-toggle">
        <a @click="back">← Cambiar correo</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const loading = ref(false)
const emailInput = ref(null)
const passwordInput = ref(null)

const title = computed(() => authStore.authStep === 'password' ? 'Acceso de profesor' : 'Bienvenido')
const subtitle = computed(() => authStore.authStep === 'password' ? 'Introduce tu contraseña para entrar.' : 'Introduce tu correo para continuar.')
const btnLabel = computed(() => {
  if (loading.value) return authStore.authStep === 'password' ? 'Entrando…' : 'Comprobando…'
  return authStore.authStep === 'password' ? 'Entrar' : 'Continuar'
})

watch(() => authStore.authStep, async (step) => {
  await nextTick()
  if (step === 'password') passwordInput.value?.focus()
  else emailInput.value?.focus()
})

async function submit() {
  if (loading.value) return
  loading.value = true
  try {
    if (authStore.authStep === 'password') {
      await authStore.signInTeacher(password.value)
    } else {
      await authStore.checkEmailRole(email.value.trim())
    }
  } finally {
    loading.value = false
  }
}

function back() {
  password.value = ''
  authStore.goBackToEmail()
}
</script>
