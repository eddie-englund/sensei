import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import WorkoutListPage from '../pages/workouts/list.vue'
import { useWorkoutsStore } from '../stores/workouts'

const body = new DOMWrapper(document.body)

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountPage() {
  const pinia = createPinia()
  const workouts = useWorkoutsStore(pinia)
  workouts.activeMesocycle = { id: 'meso-1', name: 'Block', clonedFromId: null }
  workouts.structure = [
    {
      id: 'week-1',
      week_number: 1,
      is_deload: false,
      mesocycle_workouts: [
        {
          id: 'workout-1',
          day_number: 1,
          name: 'Push',
          mesocycle_workout_exercises: [
            { id: 'ex-1', order_index: 0, target_sets: 1, workout_sets: [] },
          ],
        },
      ],
    },
  ]

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/workouts/list', name: '/workouts/list', component: WorkoutListPage },
      { path: '/workouts/:id', name: '/workouts/[id]', component: { template: '<div />' } },
    ],
  })
  router.push('/workouts/list')
  await router.isReady()

  const wrapper = mount(WorkoutListPage, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { wrapper, workouts }
}

describe('workout list page — mesocycle options', () => {
  it('opens the actions sheet showing both edit-length and end-mesocycle rows', async () => {
    const { wrapper } = await mountPage()
    await wrapper.find('[aria-label="Mesocycle options"]').trigger('click')

    expect(body.text()).toContain('Edit mesocycle length')
    expect(body.text()).toContain('End mesocycle')
    expect(body.text()).not.toContain('Mesocycle length')
  })

  it('choosing "Edit mesocycle length" closes the actions sheet and opens the length sheet', async () => {
    const { wrapper } = await mountPage()
    await wrapper.find('[aria-label="Mesocycle options"]').trigger('click')

    const editButton = body.findAll('button').find((b) => b.text() === 'Edit mesocycle length')!
    await editButton.trigger('click')
    await flushPromises()

    expect(body.text()).toContain('Mesocycle length')
    expect(body.text()).not.toContain('Mesocycle options')
  })

  it('hides the options icon when there is no active mesocycle', async () => {
    const pinia = createPinia()
    useWorkoutsStore(pinia)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/workouts/list', name: '/workouts/list', component: WorkoutListPage }],
    })
    router.push('/workouts/list')
    await router.isReady()

    const wrapper = mount(WorkoutListPage, { global: { plugins: [pinia, router] } })
    await flushPromises()

    expect(wrapper.find('[aria-label="Mesocycle options"]').exists()).toBe(false)
  })
})
