import { describe, it, expect, vi, afterEach } from 'vitest'

import { mount, DOMWrapper } from '@vue/test-utils'
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

const body = new DOMWrapper(document.body)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AppNavDrawer', () => {
  it('renders nothing when closed', () => {
    mount(AppNavDrawer, {
      props: { open: false },
      global: { plugins: [createPinia(), createTestRouter()] },
    })
    expect(body.find('aside').exists()).toBe(false)
  })

  it('renders the menu items when open', () => {
    mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), createTestRouter()] },
    })
    expect(body.find('aside').exists()).toBe(true)
    expect(body.text()).toContain('Plan mesocycle')
    expect(body.text()).toContain('View workouts')
    expect(body.text()).toContain('Sign out')
  })

  it('closes on backdrop click', async () => {
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), createTestRouter()] },
    })
    await body.find('.fixed.inset-0').trigger('click')
    expect(wrapper.emitted('update:open')?.slice(-1)[0]).toEqual([false])
  })

  it('navigates to plan mesocycle and closes', async () => {
    const router = createTestRouter()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), router] },
    })
    await body.findAll('button').find((b) => b.text() === 'Plan mesocycle')!.trigger('click')
    expect(pushSpy).toHaveBeenCalledWith({ name: '/mesocycles/plan' })
    expect(wrapper.emitted('update:open')?.slice(-1)[0]).toEqual([false])
  })

  it('navigates to view workouts and closes', async () => {
    const router = createTestRouter()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [createPinia(), router] },
    })
    await body.findAll('button').find((b) => b.text() === 'View workouts')!.trigger('click')
    expect(pushSpy).toHaveBeenCalledWith({ name: '/workouts/list' })
    expect(wrapper.emitted('update:open')?.slice(-1)[0]).toEqual([false])
  })

  it('signs out and closes', async () => {
    const pinia = createPinia()
    const wrapper = mount(AppNavDrawer, {
      props: { open: true },
      global: { plugins: [pinia, createTestRouter()] },
    })
    const auth = useAuthStore(pinia)
    const signOutSpy = vi.spyOn(auth, 'signOut').mockResolvedValue()

    await body.findAll('button').find((b) => b.text() === 'Sign out')!.trigger('click')
    expect(signOutSpy).toHaveBeenCalled()
    expect(wrapper.emitted('update:open')?.slice(-1)[0]).toEqual([false])
  })
})
