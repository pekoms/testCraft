<template>
  <NavBar />
  <AuthPanel v-if="authStore.authLocked" />
  <RouterView v-else />
  <Toast />
  <ConfirmModal />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/NavBar.vue'
import AuthPanel from '@/components/AuthPanel.vue'
import Toast from '@/components/Toast.vue'
import ConfirmModal from '@/components/ConfirmModal.vue'

const authStore = useAuthStore()
onMounted(() => authStore.init())
</script>
