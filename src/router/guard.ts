import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

export function resolveRedirect(
  to: RouteLocationNormalized,
  auth: { isAuthenticated: boolean; isAdmin: boolean },
): RouteLocationRaw | undefined {
  const isPublic = to.name === '/login' || to.name === '/auth/callback'

  if (!isPublic && !auth.isAuthenticated) {
    return { name: '/login' }
  }

  if (to.name === '/login' && auth.isAuthenticated) {
    return { name: '/' }
  }

  if (to.name === '/mesocycles/templates/build' && !auth.isAdmin) {
    return { name: '/mesocycles/plan' }
  }
}
