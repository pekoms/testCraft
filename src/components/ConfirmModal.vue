<template>
  <div class="modal-overlay" :class="{ open: appStore.modal.open }" @click.self="appStore.closeModal()">
    <div class="modal">
      <h3>{{ appStore.modal.title }}</h3>
      <p>{{ appStore.modal.body }}</p>
      <div class="modal-actions">
        <button class="btn" @click="appStore.closeModal()">Cancelar</button>
        <button
          class="btn"
          :class="appStore.modal.danger ? 'danger' : 'primary'"
          @click="confirm"
        >
          {{ appStore.modal.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStore } from '@/stores/app'
const appStore = useAppStore()

function confirm() {
  appStore.closeModal()
  appStore.modal.onConfirm?.()
}
</script>
