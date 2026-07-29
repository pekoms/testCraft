<template>
  <div id="users">
    <div class="home-header">
      <h1>Gestión de <span style="color:var(--accent)">alumnos</span></h1>
      <p>Invita alumnos y gestiona su acceso a la plataforma.</p>
      <button class="btn accent" @click="invitePanelOpen = !invitePanelOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Invitar alumno
      </button>
    </div>

    <div v-if="invitePanelOpen" class="invite-panel">
      <div class="field-group">
        <label>Correo electrónico del alumno</label>
        <input type="email" v-model="inviteEmail" placeholder="alumno@correo.com" autocomplete="off" @keydown.enter="inviteStudent">
      </div>
      <div class="invite-panel-actions">
        <button class="btn" @click="invitePanelOpen = false">Cancelar</button>
        <button class="btn accent" :disabled="inviting" @click="inviteStudent">
          {{ inviting ? 'Enviando…' : 'Enviar invitación' }}
        </button>
      </div>
      <div v-if="inviteMsg.html" class="auth-msg show" :class="inviteMsg.type" style="width:100%;margin-top:0.5rem" v-html="inviteMsg.html"></div>
      <div v-else-if="inviteMsg.text" class="auth-msg show" :class="inviteMsg.type" style="width:100%;margin-top:0.5rem">{{ inviteMsg.text }}</div>
    </div>

    <div class="section-title">Alumnos registrados</div>

    <div v-if="loading" class="students-empty">Cargando alumnos…</div>
    <div v-else-if="loadError" class="students-empty">Error al cargar alumnos: {{ loadError }}</div>
    <div v-else-if="!students.length" class="students-empty">No hay alumnos todavía. Invita al primero.</div>

    <div v-else class="students-list">
      <div v-for="s in students" :key="s.id" class="student-row" :class="{ blocked: s.is_blocked }">
        <div class="student-email" :title="s.email">{{ s.email }}</div>
        <span class="student-status" :class="statusClass(s)">{{ statusLabel(s) }}</span>
        <div class="student-meta">{{ s.last_sign_in_at ? 'Último acceso: ' + new Date(s.last_sign_in_at).toLocaleDateString('es-ES') : 'Sin acceso aún' }}</div>
        <div class="student-actions">
          <button class="btn sm" @click="toggleBlock(s)" :title="s.is_blocked ? 'Desbloquear' : 'Bloquear'">
            <svg v-if="s.is_blocked" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {{ s.is_blocked ? 'Desbloquear' : 'Bloquear' }}
          </button>
          <button class="btn sm danger" @click="deleteStudent(s)" title="Eliminar alumno">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useUsersStore } from '@/stores/users'

const appStore = useAppStore()
const usersStore = useUsersStore()

const students = ref([])
const loading = ref(true)
const loadError = ref('')
const invitePanelOpen = ref(false)
const inviteEmail = ref('')
const inviting = ref(false)
const inviteMsg = ref({ text: '', type: '', html: '' })

onMounted(loadStudents)

async function loadStudents() {
  loading.value = true
  loadError.value = ''
  try {
    const { students: list } = await usersStore.callManageUsers('list')
    students.value = list
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

function statusLabel(s) {
  if (s.is_blocked) return 'Bloqueado'
  if (!s.last_sign_in_at) return 'Pendiente'
  return 'Activo'
}

function statusClass(s) {
  if (s.is_blocked) return 'blocked'
  if (!s.last_sign_in_at) return 'pending'
  return 'active'
}

async function inviteStudent() {
  const email = inviteEmail.value.trim()
  inviteMsg.value = { text: '', type: '', html: '' }
  if (!email) { inviteMsg.value = { text: 'Introduce un correo.', type: 'error', html: '' }; return }
  inviting.value = true
  try {
    const { email: confirmedEmail } = await usersStore.callManageUsers('invite', { email })
    inviteMsg.value = {
      text: `Alumno añadido. ${confirmedEmail} puede acceder usando su correo electrónico.`,
      type: 'info',
      html: '',
    }
    inviteEmail.value = ''
    loadStudents()
  } catch (e) {
    const msg = e.message || ''
    const text = (msg.toLowerCase().includes('rate') || msg.includes('429') || msg.includes('limit'))
      ? 'Límite alcanzado. Espera unos minutos e inténtalo de nuevo.'
      : msg
    inviteMsg.value = { text, type: 'error', html: '' }
  } finally {
    inviting.value = false
  }
}

function toggleBlock(s) {
  const action = s.is_blocked ? 'Desbloquear' : 'Bloquear'
  appStore.showModal(
    `${action} alumno`,
    s.is_blocked ? 'El alumno podrá volver a iniciar sesión.' : 'El alumno no podrá iniciar sesión hasta que lo desbloquees.',
    async () => {
      try {
        await usersStore.callManageUsers('block', { userId: s.id, block: !s.is_blocked })
        appStore.showToast(`Alumno ${s.is_blocked ? 'desbloqueado' : 'bloqueado'}.`)
        loadStudents()
      } catch (e) { appStore.showToast('Error: ' + e.message) }
    },
    action,
    !s.is_blocked,
  )
}

function deleteStudent(s) {
  appStore.showModal(
    'Eliminar alumno',
    `¿Eliminar la cuenta de ${s.email}? Esta acción no se puede deshacer.`,
    async () => {
      try {
        await usersStore.callManageUsers('delete', { userId: s.id })
        appStore.showToast('Alumno eliminado.')
        loadStudents()
      } catch (e) { appStore.showToast('Error: ' + e.message) }
    },
    'Eliminar',
    true,
  )
}
</script>
