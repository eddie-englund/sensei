import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { resolveRedirect } from './guard'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => resolveRedirect(to, useAuthStore()))

if (import.meta.hot) {
  handleHotUpdate(router)
}

export default router
