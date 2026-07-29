import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/editor', name: 'editor', component: () => import('@/views/EditorView.vue') },
  { path: '/player', name: 'player', component: () => import('@/views/PlayerView.vue') },
  { path: '/results', name: 'results', component: () => import('@/views/ResultsView.vue') },
  { path: '/users', name: 'users', component: () => import('@/views/UsersView.vue') },
  { path: '/stats', name: 'stats', component: () => import('@/views/StatsView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
