import { describe, it, expect } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'
import { resolveRedirect } from '../router/guard'

function routeNamed(name: string): RouteLocationNormalized {
  return { name } as unknown as RouteLocationNormalized
}

describe('resolveRedirect', () => {
  it('redirects unauthenticated users away from non-public routes', () => {
    const result = resolveRedirect(routeNamed('/mesocycles/plan'), {
      isAuthenticated: false,
      isAdmin: false,
    })
    expect(result).toEqual({ name: '/login' })
  })

  it('lets unauthenticated users reach public routes', () => {
    const result = resolveRedirect(routeNamed('/login'), {
      isAuthenticated: false,
      isAdmin: false,
    })
    expect(result).toBeUndefined()
  })

  it('redirects authenticated users away from /login', () => {
    const result = resolveRedirect(routeNamed('/login'), {
      isAuthenticated: true,
      isAdmin: false,
    })
    expect(result).toEqual({ name: '/' })
  })

  it('redirects non-admins away from the template builder', () => {
    const result = resolveRedirect(routeNamed('/mesocycles/templates/build'), {
      isAuthenticated: true,
      isAdmin: false,
    })
    expect(result).toEqual({ name: '/mesocycles/plan' })
  })

  it('lets admins reach the template builder', () => {
    const result = resolveRedirect(routeNamed('/mesocycles/templates/build'), {
      isAuthenticated: true,
      isAdmin: true,
    })
    expect(result).toBeUndefined()
  })

  it('does not redirect authenticated users on unrelated routes regardless of admin status', () => {
    const result = resolveRedirect(routeNamed('/mesocycles/plan'), {
      isAuthenticated: true,
      isAdmin: false,
    })
    expect(result).toBeUndefined()
  })
})
