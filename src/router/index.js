import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/editor', name: 'editor', component: () => import('@/views/EditorView.vue') },
  { path: '/player', name: 'player', component: () => import('@/views/PlayerView.vue') },
  { path: '/results', name: 'results', component: () => import('@/views/ResultsView.vue') },
  { path: '/users', name: 'users', component: () => import('@/views/UsersView.vue') },
  { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
  { path: '/pills', name: 'pills', component: () => import('@/views/PillsView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Chunk load failures (stale PWA cache) cause navigation to silently do nothing.
// Detect them and reload so the SW fetches the fresh chunk from the network.
router.onError((err, to) => {
  const isChunkError =
    err?.message?.includes('Failed to fetch dynamically imported module') ||
    err?.message?.includes('Importing a module script failed') ||
    err?.name === 'ChunkLoadError'
  if (isChunkError) {
    // Preserve the intended destination in the hash so after reload the router
    // navigates there automatically.
    window.location.hash = to.fullPath
    window.location.reload()
  }
})

export default router
