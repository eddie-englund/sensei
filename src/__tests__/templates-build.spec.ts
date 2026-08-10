import { describe, it, expect, vi, afterEach } from 'vitest'

import { flushPromises, mount, DOMWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import TemplatesBuildView from '../pages/mesocycles/templates/build.vue'
import { useExercisesStore } from '../stores/exercises'
import { useAuthStore } from '../stores/auth'

const { lastInsert, resetMock } = vi.hoisted(() => {
  const lastInsert: Record<string, Record<string, unknown>[]> = {}
  return {
    lastInsert,
    resetMock: () => {
      for (const key of Object.keys(lastInsert)) delete lastInsert[key]
    },
  }
})

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
        lastInsert[table] = insertedRows
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

  return {
    supabase: { from: (table: string) => createChain(table) },
  }
})

afterEach(() => {
  document.body.innerHTML = ''
  resetMock()
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/mesocycles/plan', name: '/mesocycles/plan', component: { template: '<div />' } },
      {
        path: '/mesocycles/templates/build',
        name: '/mesocycles/templates/build',
        component: TemplatesBuildView,
      },
    ],
  })
}

async function mountTemplatesBuild() {
  const pinia = createPinia()
  const router = createTestRouter()
  await router.push({ name: '/mesocycles/templates/build' })
  await router.isReady()

  const auth = useAuthStore(pinia)
  // @ts-expect-error partial session is enough for auth.user.id in this test
  auth.session = { user: { id: 'admin-1' } }

  const exercises = useExercisesStore(pinia)
  exercises.exercises = [
    { id: 'e1', name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
  ]
  exercises.loaded = true

  const wrapper = mount(TemplatesBuildView, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { wrapper, router }
}

async function pickExercise(wrapper: ReturnType<typeof mount>) {
  const pickerButton = wrapper.findAll('button').find((b) => b.text() === 'Select exercise')!
  await pickerButton.trigger('click')
  const body = new DOMWrapper(document.body)
  const exerciseOption = body.findAll('button').find((b) => b.text() === 'Bench Press')!
  await exerciseOption.trigger('click')
}

async function clickSave(wrapper: ReturnType<typeof mount>) {
  await wrapper
    .findAll('button')
    .find((b) => b.text().includes('Save template'))!
    .trigger('click')
  await flushPromises()
}

describe('mesocycles/templates/build.vue validation', () => {
  it('blocks save with no name', async () => {
    const { wrapper } = await mountTemplatesBuild()
    await pickExercise(wrapper)

    await clickSave(wrapper)

    expect(wrapper.text()).toContain('Name your template before saving.')
    expect(lastInsert['mesocycle_templates']).toBeUndefined()
  })

  it('blocks save with no exercise picked', async () => {
    const { wrapper } = await mountTemplatesBuild()
    await wrapper.find('#template-name').setValue('Coach block')

    await clickSave(wrapper)

    expect(wrapper.text()).toContain('Pick an exercise for every exercise row before saving.')
    expect(lastInsert['mesocycle_templates']).toBeUndefined()
  })
})

describe('mesocycles/templates/build.vue save flow', () => {
  it('persists the template, weeks duplicated per week count, and target_sets', async () => {
    const { wrapper, router } = await mountTemplatesBuild()
    const pushSpy = vi.spyOn(router, 'push')

    await wrapper.find('#template-name').setValue('Coach block')
    await wrapper.find('#template-description').setValue('For my clients')
    await wrapper.find('#week-count').setValue(2)
    await pickExercise(wrapper)
    await wrapper.find('input[aria-label="Target sets"]').setValue(4)

    await clickSave(wrapper)

    expect(lastInsert['mesocycle_templates']).toEqual([
      { name: 'Coach block', description: 'For my clients', created_by: 'admin-1' },
    ])

    const weekRows = lastInsert['mesocycle_template_weeks']!
    expect(weekRows).toHaveLength(2)
    expect(weekRows[0]!.is_deload).toBe(false)
    expect(weekRows[1]!.is_deload).toBe(true)

    const workoutRows = lastInsert['mesocycle_template_workouts']!
    expect(workoutRows).toHaveLength(2)

    const exerciseRows = lastInsert['mesocycle_template_workout_exercises']!
    expect(exerciseRows).toHaveLength(2)
    expect(exerciseRows[0]!.exercise_id).toBe('e1')
    expect(exerciseRows[0]!.target_sets).toBe(4)

    expect(pushSpy).toHaveBeenCalledWith({ name: '/mesocycles/plan' })
  })
})
