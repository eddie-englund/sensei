import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import WorkoutDetailPage from '../pages/workouts/[id].vue'
import { useWorkoutsStore } from '../stores/workouts'
import type { WorkoutDetail } from '../stores/workouts'

const body = new DOMWrapper(document.body)

afterEach(() => {
  document.body.innerHTML = ''
})

function detailFor(complete: boolean): WorkoutDetail {
  return {
    id: 'workout-1',
    mesocycleId: 'mesocycle-1',
    dayNumber: 1,
    name: 'Push',
    weekNumber: 1,
    isDeload: false,
    complete,
    exercises: [
      {
        id: 'exercise-1',
        exerciseId: 'ex-bench',
        name: 'Bench Press',
        targetSets: 2,
        sets: [1, 2].map((setNumber) => ({
          setNumber,
          weight: complete ? 100 : null,
          reps: complete ? 8 : null,
          completedAt: complete ? '2026-01-01T00:00:00Z' : null,
          weightPrefill: null,
          repsPlaceholder: null,
        })),
        note: null,
      },
    ],
  }
}

async function mountPage(detail: WorkoutDetail) {
  const pinia = createPinia()
  const workouts = useWorkoutsStore(pinia)
  vi.spyOn(workouts, 'fetchWorkoutDetail').mockResolvedValue(detail)
  const addSetSpy = vi.spyOn(workouts, 'addSet').mockResolvedValue({ targetSets: 3, error: null })
  const saveNoteSpy = vi.spyOn(workouts, 'saveExerciseNote').mockResolvedValue({ error: null })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/workouts/:id', name: '/workouts/[id]', component: WorkoutDetailPage }],
  })
  router.push('/workouts/workout-1')
  await router.isReady()

  const wrapper = mount(WorkoutDetailPage, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return { wrapper, workouts, addSetSpy, saveNoteSpy }
}

describe('workout detail page — add set', () => {
  it('adds a new blank set row when "+ Add set" is clicked', async () => {
    const { wrapper, addSetSpy } = await mountPage(detailFor(false))
    expect(wrapper.findAll('input[placeholder="Weight"]')).toHaveLength(2)

    const addButton = wrapper.findAll('button').find((b) => b.text() === '+ Add set')!
    await addButton.trigger('click')
    await flushPromises()

    expect(addSetSpy).toHaveBeenCalledWith('exercise-1', 2)
    expect(wrapper.findAll('input[placeholder="Weight"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Set 3')
  })

  it('hides the add-set button once the workout is complete', async () => {
    const { wrapper } = await mountPage(detailFor(true))
    const addButton = wrapper.findAll('button').find((b) => b.text() === '+ Add set')
    expect(addButton).toBeUndefined()
  })
})

describe('workout detail page — exercise notes', () => {
  it('shows "Add note" when there is no note, and opens the edit sheet', async () => {
    const { wrapper } = await mountPage(detailFor(false))

    const noteButton = wrapper.findAll('button').find((b) => b.text() === 'Add note')!
    expect(noteButton).toBeTruthy()

    await noteButton.trigger('click')
    expect(body.text()).toContain('Bench Press')
    expect(body.find('textarea').exists()).toBe(true)
  })

  it('shows existing note content, prefixed with a pin marker when pinned', async () => {
    const detail = detailFor(false)
    detail.exercises[0]!.note = { content: 'Keep elbows tucked', pinned: true }
    const { wrapper } = await mountPage(detail)

    const noteButton = wrapper.findAll('button').find((b) => b.text().includes('Keep elbows tucked'))!
    expect(noteButton.text()).toContain('📌')
  })

  it('saves a note and updates it locally without a full reload', async () => {
    const { wrapper, saveNoteSpy } = await mountPage(detailFor(false))

    const noteButton = wrapper.findAll('button').find((b) => b.text() === 'Add note')!
    await noteButton.trigger('click')

    await body.find('textarea').setValue('Go slow on the eccentric')
    const saveButton = body.findAll('button').find((b) => b.text() === 'Save')!
    await saveButton.trigger('click')
    await flushPromises()

    expect(saveNoteSpy).toHaveBeenCalledWith({
      mesocycleWorkoutExerciseId: 'exercise-1',
      mesocycleId: 'mesocycle-1',
      exerciseId: 'ex-bench',
      content: 'Go slow on the eccentric',
      pinned: false,
    })
    expect(wrapper.text()).toContain('Go slow on the eccentric')
  })
})

describe('workout detail page — mesocycle options', () => {
  it('opens the actions sheet with only "End mesocycle" (no edit-length option)', async () => {
    const { wrapper } = await mountPage(detailFor(false))
    await wrapper.find('[aria-label="Mesocycle options"]').trigger('click')

    expect(body.text()).toContain('Mesocycle options')
    expect(body.text()).toContain('End mesocycle')
    expect(body.text()).not.toContain('Edit mesocycle length')
  })
})
