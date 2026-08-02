import { describe, it, expect, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppNavDrawer from '../components/AppNavDrawer.vue'
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

describe('AppNavDrawer', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(AppNavDrawer, {
      props: { open: false },
      global: { plugins: [createPinia(), createTestRouter()] },
    })
    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('renders the menu items when open', () => {
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), createTestRouter()] },
    })
    expect(wrapper.find('aside').exists()).toBe(true)
    expect(wrapper.text()).toContain('Plan mesocycle')
    expect(wrapper.text()).toContain('View workouts')
    expect(wrapper.text()).toContain('Sign out')
  })

  it('closes on backdrop click', async () => {
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), createTestRouter()] },
    })
    await wrapper.find('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('navigates to plan mesocycle and closes', async () => {
    const router = createTestRouter()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), router] },
    })
    await wrapper.findAll('button').find((b) => b.text() === 'Plan mesocycle')!.trigger('click')
    expect(pushSpy).toHaveBeenCalledWith({ name: '/mesocycles/plan' })
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('navigates to view workouts and closes', async () => {
    const router = createTestRouter()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), router] },
    })
    await wrapper.findAll('button').find((b) => b.text() === 'View workouts')!.trigger('click')
    expect(pushSpy).toHaveBeenCalledWith({ name: '/workouts/list' })
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('signs out and closes', async () => {
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), createTestRouter()] },
    })
    const auth = useAuthStore()
    const signOutSpy = vi.spyOn(auth, 'signOut').mockResolvedValue()

    await wrapper.findAll('button').find((b) => b.text() === 'Sign out')!.trigger('click')
    expect(signOutSpy).toHaveBeenCalled()
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })
})
