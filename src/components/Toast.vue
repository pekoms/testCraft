<template>
  <div class="toast" :class="{ show: appStore.toast.show }">
    {{ appStore.toast.text }}
  </div>
</template>

<script setup>
import { useAppStore } from '@/stores/app'
const appStore = useAppStore()
</script>
