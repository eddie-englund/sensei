import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppNavLinks from '../components/AppNavLinks.vue'
import { useAuthStore } from '../stores/auth'

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: '/', component: { template: '<div />' } },
      { path: '/mesocycles/plan', name: '/mesocycles/plan', component: { template: '<div />' } },
      { path: '/workouts/list', name: '/workouts/list', component: { template: '<div />' } },
    ],
  })
}

describe('AppNavLinks', () => {
  it('renders the three nav actions', () => {
    const wrapper = mount(AppNavLinks, {
      global: { plugins: [createPinia(), createTestRouter()] },
    })
    expect(wrapper.text()).toContain('Plan mesocycle')
    expect(wrapper.text()).toContain('View workouts')
    expect(wrapper.text()).toContain('Sign out')
  })

  it('navigates to plan mesocycle and emits navigate', async () => {
    const router = createTestRouter()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(AppNavLinks, { global: { plugins: [createPinia(), router] } })

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Plan mesocycle')!
      .trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: '/mesocycles/plan' })
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })

  it('navigates to view workouts and emits navigate', async () => {
    const router = createTestRouter()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(AppNavLinks, { global: { plugins: [createPinia(), router] } })

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'View workouts')!
      .trigger('click')

    expect(pushSpy).toHaveBeenCalledWith({ name: '/workouts/list' })
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })

  it('signs out and emits navigate', async () => {
    const pinia = createPinia()
    const wrapper = mount(AppNavLinks, { global: { plugins: [pinia, createTestRouter()] } })
    const auth = useAuthStore(pinia)
    const signOutSpy = vi.spyOn(auth, 'signOut').mockResolvedValue()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Sign out')!
      .trigger('click')

    expect(signOutSpy).toHaveBeenCalled()
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })
})
