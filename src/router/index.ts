import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  const isPublic = to.name === '/login' || to.name === '/auth/callback'

  if (!isPublic && !auth.isAuthenticated) {
    return { name: '/login' }
  }

  if (to.name === '/login' && auth.isAuthenticated) {
    return { name: '/' }
  }
})

if (import.meta.hot) {
  handleHotUpdate(router)
}

export default router
