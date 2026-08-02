import { describe, it, expect } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import HomeView from '../pages/index.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: '/', component: HomeView },
    { path: '/mesocycles/plan', name: '/mesocycles/plan', component: { template: '<div />' } },
    { path: '/workouts/:id', name: '/workouts/[id]', component: { template: '<div />' } },
  ],
})

describe('HomeView', () => {
  it('mounts renders properly', async () => {
    const wrapper = mount(HomeView, {
      global: {
        plugins: [createPinia(), router],
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('No mesocycles yet')
  })
})
