import { describe, it, expect, vi, afterEach } from 'vitest'

import { flushPromises, mount, DOMWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import BuildView from '../pages/mesocycles/build.vue'
import { useWorkoutsStore } from '../stores/workouts'
import { useExercisesStore } from '../stores/exercises'
import { useAuthStore } from '../stores/auth'

vi.mock('@/utils/supabase', () => {
  function createChain(table: string) {
    let insertedRows: Record<string, unknown>[] = []
    let hasSingle = false
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      in: () => chain,
      update: () => chain,
      delete: () => chain,
      maybeSingle: () => {
        hasSingle = true
        return chain
      },
      single: () => {
        hasSingle = true
        return chain
      },
      insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        insertedRows = Array.isArray(rows) ? rows : [rows]
        return chain
      },
      then: (resolve: (value: { data: unknown; error: null }) => void) => {
        if (hasSingle) {
          resolve({ data: { id: `${table}-id`, ...insertedRows[0] }, error: null })
          return
        }
        resolve({
          data: insertedRows.map((row, i) => ({ id: `${table}-${i}`, ...row })),
          error: null,
        })
      },
    }
    return chain
  }

  return { supabase: { from: (table: string) => createChain(table) } }
})

const body = new DOMWrapper(document.body)

afterEach(() => {
  document.body.innerHTML = ''
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: '/', component: { template: '<div />' } },
      { path: '/mesocycles/build', name: '/mesocycles/build', component: BuildView },
    ],
  })
}

type Scenario = 'none' | 'incomplete' | 'complete'

async function mountBuild(scenario: Scenario) {
  const pinia = createPinia()
  const router = createTestRouter()
  await router.push({ name: '/mesocycles/build' })
  await router.isReady()

  const auth = useAuthStore(pinia)
  // @ts-expect-error partial session is enough for auth.user.id in this test
  auth.session = { user: { id: 'user-1' } }

  const exercises = useExercisesStore(pinia)
  exercises.exercises = [{ id: 'e1', name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell' }]
  exercises.loaded = true

  const workouts = useWorkoutsStore(pinia)
  vi.spyOn(workouts, 'fetchActiveMesocycle').mockResolvedValue(undefined)
  vi.spyOn(workouts, 'fetchActiveMesocycleStructure').mockResolvedValue(undefined)

  if (scenario === 'incomplete') {
    workouts.activeMesocycle = { id: 'active-1', name: 'Current block', clonedFromId: null }
    workouts.structure = [
      {
        id: 'week-1',
        week_number: 1,
        is_deload: false,
        mesocycle_workouts: [
          {
            id: 'workout-1',
            day_number: 1,
            name: 'Day 1',
            mesocycle_workout_exercises: [
              { id: 'ex-1', order_index: 0, target_sets: 3, workout_sets: [] },
            ],
          },
        ],
      },
    ]
  } else if (scenario === 'complete') {
    workouts.activeMesocycle = { id: 'active-1', name: 'Current block', clonedFromId: null }
    workouts.structure = [
      {
        id: 'week-1',
        week_number: 1,
        is_deload: false,
        mesocycle_workouts: [
          {
            id: 'workout-1',
            day_number: 1,
            name: 'Day 1',
            mesocycle_workout_exercises: [
              {
                id: 'ex-1',
                order_index: 0,
                target_sets: 1,
                workout_sets: [
                  { set_number: 1, weight: 100, reps: 5, completed_at: '2026-01-01T00:00:00Z' },
                ],
              },
            ],
          },
        ],
      },
    ]
  }

  const wrapper = mount(BuildView, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { wrapper, router }
}

async function fillValidForm(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('#mesocycle-name').setValue('Test mesocycle')
  const pickerButton = wrapper.findAll('button').find((b) => b.text() === 'Select exercise')!
  await pickerButton.trigger('click')
  const exerciseOption = wrapper.findAll('button').find((b) => b.text() === 'Bench Press')!
  await exerciseOption.trigger('click')
}

describe('mesocycles/build.vue replace safeguard', () => {
  it('saves directly with no confirmation when there is no active mesocycle', async () => {
    const { wrapper, router } = await mountBuild('none')
    const pushSpy = vi.spyOn(router, 'push')

    await fillValidForm(wrapper)
    await wrapper.findAll('button').find((b) => b.text().includes('Save mesocycle'))!.trigger('click')
    await flushPromises()

    expect(body.find('[role="alertdialog"]').exists()).toBe(false)
    expect(pushSpy).toHaveBeenCalledWith({ name: '/' })
  })

  it('saves directly with no confirmation when the active mesocycle is already complete', async () => {
    const { wrapper, router } = await mountBuild('complete')
    const pushSpy = vi.spyOn(router, 'push')

    await fillValidForm(wrapper)
    await wrapper.findAll('button').find((b) => b.text().includes('Save mesocycle'))!.trigger('click')
    await flushPromises()

    expect(body.find('[role="alertdialog"]').exists()).toBe(false)
    expect(pushSpy).toHaveBeenCalledWith({ name: '/' })
  })

  it('shows a confirm dialog and blocks save until confirmed when the active mesocycle is incomplete', async () => {
    const { wrapper, router } = await mountBuild('incomplete')
    const pushSpy = vi.spyOn(router, 'push')

    await fillValidForm(wrapper)
    await wrapper.findAll('button').find((b) => b.text().includes('Save mesocycle'))!.trigger('click')
    await flushPromises()

    expect(body.find('[role="alertdialog"]').exists()).toBe(true)
    expect(pushSpy).not.toHaveBeenCalled()

    const continueButton = body.findAll('button').find((b) => b.text() === 'Continue')!
    await continueButton.trigger('click')
    await flushPromises()

    expect(pushSpy).toHaveBeenCalledWith({ name: '/' })
  })
})
