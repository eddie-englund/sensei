import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import WorkoutDetailPage from '../pages/workouts/[id].vue'
import { useWorkoutsStore } from '../stores/workouts'
import { useExercisesStore } from '../stores/exercises'
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
          skippedAt: null,
          weightPrefill: null,
          repsPlaceholder: null,
          repsPrefill: null,
          marker: null,
        })),
        note: null,
      },
    ],
  }
}

function detailWithMixedSets(): WorkoutDetail {
  return {
    id: 'workout-1',
    mesocycleId: 'mesocycle-1',
    dayNumber: 1,
    name: 'Push',
    weekNumber: 1,
    isDeload: false,
    complete: false,
    exercises: [
      {
        id: 'exercise-1',
        exerciseId: 'ex-bench',
        name: 'Bench Press',
        targetSets: 2,
        sets: [
          {
            setNumber: 1,
            weight: 100,
            reps: 8,
            completedAt: '2026-01-01T00:00:00Z',
            skippedAt: null,
            weightPrefill: null,
            repsPlaceholder: null,
            repsPrefill: null,
            marker: null,
          },
          {
            setNumber: 2,
            weight: null,
            reps: null,
            completedAt: null,
            skippedAt: null,
            weightPrefill: null,
            repsPlaceholder: null,
            repsPrefill: null,
            marker: null,
          },
        ],
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
  const removeSetSpy = vi
    .spyOn(workouts, 'removeSet')
    .mockResolvedValue({ targetSets: 1, error: null })
  const saveNoteSpy = vi.spyOn(workouts, 'saveExerciseNote').mockResolvedValue({ error: null })
  const historySpy = vi.spyOn(workouts, 'fetchExerciseHistory').mockResolvedValue([])
  const swapSpy = vi.spyOn(workouts, 'swapExercise').mockResolvedValue({ error: null })
  const logSetSpy = vi.spyOn(workouts, 'logSet').mockResolvedValue({ error: null })
  const unlogSetSpy = vi.spyOn(workouts, 'unlogSet').mockResolvedValue({ error: null })
  const skipSetSpy = vi.spyOn(workouts, 'skipSet').mockResolvedValue({ error: null })
  const unskipSetSpy = vi.spyOn(workouts, 'unskipSet').mockResolvedValue({ error: null })
  const setSetMarkerSpy = vi.spyOn(workouts, 'setSetMarker').mockResolvedValue({ error: null })

  const exercises = useExercisesStore(pinia)
  exercises.exercises = [
    { id: 'ex-bench', name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
    { id: 'ex-squat', name: 'Squat', muscle_group: 'Legs', equipment: 'Barbell' },
  ]
  exercises.loaded = true

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/workouts/:id', name: '/workouts/[id]', component: WorkoutDetailPage }],
  })
  router.push('/workouts/workout-1')
  await router.isReady()

  const wrapper = mount(WorkoutDetailPage, { global: { plugins: [pinia, router] } })
  await flushPromises()

  return {
    wrapper,
    workouts,
    addSetSpy,
    removeSetSpy,
    saveNoteSpy,
    historySpy,
    swapSpy,
    logSetSpy,
    unlogSetSpy,
    skipSetSpy,
    unskipSetSpy,
    setSetMarkerSpy,
  }
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

    const noteButton = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Keep elbows tucked'))!
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

describe('workout detail page — exercise history', () => {
  it('opens the history sheet via the exercise options menu', async () => {
    const { wrapper, historySpy } = await mountPage(detailFor(false))

    await wrapper.find('[aria-label="Exercise options"]').trigger('click')
    const viewHistory = body.findAll('button').find((b) => b.text() === 'View history')!
    await viewHistory.trigger('click')
    await flushPromises()

    expect(historySpy).toHaveBeenCalledWith('ex-bench')
    expect(body.text()).toContain('Bench Press')
    expect(body.text()).toContain('No sets logged yet for this exercise.')
  })
})

describe('workout detail page — exercise swap', () => {
  it('opens the swap sheet via the exercise options menu and swaps for this week only', async () => {
    const { wrapper, swapSpy } = await mountPage(detailFor(false))

    await wrapper.find('[aria-label="Exercise options"]').trigger('click')
    const swapAction = body.findAll('button').find((b) => b.text() === 'Swap exercise')!
    await swapAction.trigger('click')

    const picker = body.findAll('button').find((b) => b.text() === 'Select exercise')!
    await picker.trigger('click')
    const squatOption = body.findAll('button').find((b) => b.text() === 'Squat')!
    await squatOption.trigger('click')

    const confirmSwap = body.findAll('button').find((b) => b.text() === 'Swap exercise')!
    await confirmSwap.trigger('click')
    await flushPromises()

    expect(swapSpy).toHaveBeenCalledWith({
      mesocycleWorkoutExerciseId: 'exercise-1',
      newExerciseId: 'ex-squat',
      scope: 'week',
    })
  })

  it('confirms before swapping an exercise that already has logged sets', async () => {
    const { wrapper, swapSpy } = await mountPage(detailFor(true))

    await wrapper.find('[aria-label="Exercise options"]').trigger('click')
    const swapAction = body.findAll('button').find((b) => b.text() === 'Swap exercise')!
    await swapAction.trigger('click')

    const picker = body.findAll('button').find((b) => b.text() === 'Select exercise')!
    await picker.trigger('click')
    const squatOption = body.findAll('button').find((b) => b.text() === 'Squat')!
    await squatOption.trigger('click')

    const swapButton = body.findAll('button').find((b) => b.text() === 'Swap exercise')!
    await swapButton.trigger('click')

    expect(swapSpy).not.toHaveBeenCalled()
    expect(body.text()).toContain('Swap exercise?')

    const confirmButtons = body.findAll('button').filter((b) => b.text() === 'Swap exercise')
    await confirmButtons[confirmButtons.length - 1]!.trigger('click')
    await flushPromises()

    expect(swapSpy).toHaveBeenCalledWith({
      mesocycleWorkoutExerciseId: 'exercise-1',
      newExerciseId: 'ex-squat',
      scope: 'week',
    })
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

describe('workout detail page — log toggle', () => {
  it('logs a set via the toggle button', async () => {
    const { wrapper, logSetSpy } = await mountPage(detailFor(false))

    await wrapper.findAll('input[placeholder="Weight"]')[0]!.setValue('100')
    await wrapper.findAll('input[placeholder="Reps"]')[0]!.setValue('8')

    const toggle = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Log set')!
    await toggle.trigger('click')
    await flushPromises()

    expect(logSetSpy).toHaveBeenCalledWith({
      mesocycleWorkoutExerciseId: 'exercise-1',
      setNumber: 1,
      weight: 100,
      reps: 8,
    })
    expect(wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'Unlog set')).toBe(
      true,
    )
  })

  it('unlogs a set via the toggle, keeping weight/reps for editing', async () => {
    const { wrapper, unlogSetSpy } = await mountPage(detailWithMixedSets())

    const toggle = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === 'Unlog set')!
    await toggle.trigger('click')
    await flushPromises()

    expect(unlogSetSpy).toHaveBeenCalledWith('exercise-1', 1)
    const weightInput = wrapper.findAll('input[placeholder="Weight"]')[0]!
    expect((weightInput.element as HTMLInputElement).value).toBe('100')
    expect(wrapper.findAll('button').some((b) => b.attributes('aria-label') === 'Log set')).toBe(
      true,
    )
  })

  it('prompts before editing a locked field directly, and unlocks on confirm', async () => {
    const { wrapper, unlogSetSpy } = await mountPage(detailWithMixedSets())

    await wrapper.findAll('input[placeholder="Weight"]')[0]!.trigger('focus')
    await flushPromises()

    expect(body.text()).toContain('Edit logged set?')
    const confirmButton = body.findAll('button').find((b) => b.text() === 'Edit anyway')!
    await confirmButton.trigger('click')
    await flushPromises()

    expect(unlogSetSpy).toHaveBeenCalledWith('exercise-1', 1)
  })
})

describe('workout detail page — skip and unskip', () => {
  it('skips a pending set via the sheet', async () => {
    const { wrapper, skipSetSpy } = await mountPage(detailFor(false))

    const setButton = wrapper.findAll('button').find((b) => b.text() === 'Set 1')!
    await setButton.trigger('click')

    const skipAction = body.findAll('button').find((b) => b.text() === 'Skip set')!
    await skipAction.trigger('click')
    await flushPromises()

    expect(skipSetSpy).toHaveBeenCalledWith('exercise-1', 1)
    expect(wrapper.text()).toContain('Skipped')
  })

  it('unskips a previously-skipped set, restoring the controls', async () => {
    const detail = detailFor(false)
    detail.exercises[0]!.sets[0]!.skippedAt = '2026-01-01T00:00:00Z'
    const { wrapper, unskipSetSpy } = await mountPage(detail)

    const setButton = wrapper.findAll('button').find((b) => b.text() === 'Set 1')!
    await setButton.trigger('click')

    const unskipAction = body.findAll('button').find((b) => b.text() === 'Unskip set')!
    await unskipAction.trigger('click')
    await flushPromises()

    expect(unskipSetSpy).toHaveBeenCalledWith('exercise-1', 1)
    expect(wrapper.text()).not.toContain('Skipped')
  })
})

describe('workout detail page — remove set', () => {
  it('removes the trailing unlogged set via the sheet', async () => {
    const { wrapper, removeSetSpy } = await mountPage(detailFor(false))

    const setButton = wrapper.findAll('button').find((b) => b.text() === 'Set 2')!
    await setButton.trigger('click')

    const removeAction = body.findAll('button').find((b) => b.text() === 'Remove set')!
    await removeAction.trigger('click')
    await flushPromises()

    expect(removeSetSpy).toHaveBeenCalledWith('exercise-1', 2)
    expect(wrapper.text()).not.toContain('Set 2')
  })

  it('does not offer "Remove set" for a non-trailing set', async () => {
    const { wrapper } = await mountPage(detailFor(false))

    const setButton = wrapper.findAll('button').find((b) => b.text() === 'Set 1')!
    await setButton.trigger('click')

    expect(body.findAll('button').some((b) => b.text() === 'Remove set')).toBe(false)
  })

  it('does not offer "Remove set" for an already-logged trailing set', async () => {
    const { wrapper } = await mountPage(detailFor(true))

    const setButton = wrapper.findAll('button').find((b) => b.text() === 'Set 2')!
    await setButton.trigger('click')

    expect(body.findAll('button').some((b) => b.text() === 'Remove set')).toBe(false)
  })
})

describe('workout detail page — myrep markers', () => {
  it('sets the Myrep marker, shows the M badge, and toggles it off when picked again', async () => {
    const { wrapper, setSetMarkerSpy } = await mountPage(detailFor(false))

    const setButton = wrapper.findAll('button').find((b) => b.text() === 'Set 1')!
    await setButton.trigger('click')

    const myrepAction = body.findAll('button').find((b) => b.text() === 'Myrep')!
    await myrepAction.trigger('click')
    await flushPromises()

    expect(setSetMarkerSpy).toHaveBeenCalledWith({
      mesocycleId: 'mesocycle-1',
      exerciseId: 'ex-bench',
      setNumber: 1,
      marker: 'myrep',
    })
    expect(wrapper.findAll('span').some((s) => s.text() === 'M')).toBe(true)

    await setButton.trigger('click')
    const myrepAgain = body.findAll('button').find((b) => b.text() === 'Myrep')!
    await myrepAgain.trigger('click')
    await flushPromises()

    expect(setSetMarkerSpy).toHaveBeenLastCalledWith({
      mesocycleId: 'mesocycle-1',
      exerciseId: 'ex-bench',
      setNumber: 1,
      marker: null,
    })
    expect(wrapper.findAll('span').some((s) => s.text() === 'M')).toBe(false)
  })

  it('switches from Myrep to Myrep match', async () => {
    const detail = detailFor(false)
    detail.exercises[0]!.sets[0]!.marker = 'myrep'
    const { wrapper, setSetMarkerSpy } = await mountPage(detail)

    const setButton = wrapper.findAll('button').find((b) => b.text() === 'Set 1')!
    await setButton.trigger('click')

    const myrepMatchAction = body.findAll('button').find((b) => b.text() === 'Myrep match')!
    await myrepMatchAction.trigger('click')
    await flushPromises()

    expect(setSetMarkerSpy).toHaveBeenCalledWith({
      mesocycleId: 'mesocycle-1',
      exerciseId: 'ex-bench',
      setNumber: 1,
      marker: 'myrep_match',
    })
  })
})
