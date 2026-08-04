import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ExerciseSwapSheet from '../components/ExerciseSwapSheet.vue'
import { useExercisesStore } from '../stores/exercises'

vi.mock('@/utils/supabase', () => ({ supabase: { from: () => ({}) } }))

const body = new DOMWrapper(document.body)
let activeWrapper: VueWrapper | null = null

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  document.body.innerHTML = ''
})

function mountSheet(props: {
  open: boolean
  exerciseName?: string
  currentExerciseId?: string
  hasLoggedSets?: boolean
}) {
  const pinia = createPinia()
  const exercises = useExercisesStore(pinia)
  exercises.exercises = [
    { id: 'e-bench', name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
    { id: 'e-squat', name: 'Squat', muscle_group: 'Legs', equipment: 'Barbell' },
  ]
  exercises.loaded = true

  const wrapper = mount(ExerciseSwapSheet, {
    global: { plugins: [pinia] },
    props: {
      exerciseName: 'Bench Press',
      currentExerciseId: 'e-bench',
      hasLoggedSets: false,
      ...props,
    },
  })
  activeWrapper = wrapper
  return wrapper
}

async function pickExercise(name: string) {
  const trigger = body.findAll('button').find((b) => b.text() === 'Select exercise')!
  await trigger.trigger('click')
  const option = body.findAll('button').find((b) => b.text() === name)!
  await option.trigger('click')
}

describe('ExerciseSwapSheet', () => {
  it('renders nothing when closed', () => {
    mountSheet({ open: false })
    expect(body.find('section').exists()).toBe(false)
  })

  it('disables the swap button until a different exercise is picked', async () => {
    mountSheet({ open: true })
    const swapButton = body.findAll('button').find((b) => b.text() === 'Swap exercise')!
    expect(swapButton.attributes('disabled')).toBeDefined()

    await pickExercise('Squat')
    expect(swapButton.attributes('disabled')).toBeUndefined()
  })

  it('emits swap with the picked exercise and default week scope, then closes', async () => {
    const wrapper = mountSheet({ open: true })
    await pickExercise('Squat')

    const swapButton = body.findAll('button').find((b) => b.text() === 'Swap exercise')!
    await swapButton.trigger('click')

    expect(wrapper.emitted('swap')).toEqual([[{ newExerciseId: 'e-squat', scope: 'week' }]])
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('emits swap with mesocycle scope when that radio is selected', async () => {
    const wrapper = mountSheet({ open: true })
    await pickExercise('Squat')
    await body.find('input[value="mesocycle"]').setValue(true)

    const swapButton = body.findAll('button').find((b) => b.text() === 'Swap exercise')!
    await swapButton.trigger('click')

    expect(wrapper.emitted('swap')).toEqual([[{ newExerciseId: 'e-squat', scope: 'mesocycle' }]])
  })

  it('confirms before swapping when the exercise already has logged sets', async () => {
    const wrapper = mountSheet({ open: true, hasLoggedSets: true })
    await pickExercise('Squat')

    const swapButton = body.findAll('button').find((b) => b.text() === 'Swap exercise')!
    await swapButton.trigger('click')

    expect(wrapper.emitted('swap')).toBeUndefined()
    expect(body.text()).toContain('Swap exercise?')

    const confirmButtons = body.findAll('button').filter((b) => b.text() === 'Swap exercise')
    await confirmButtons[confirmButtons.length - 1]!.trigger('click')

    expect(wrapper.emitted('swap')).toEqual([[{ newExerciseId: 'e-squat', scope: 'week' }]])
  })

  it('closes on Escape without emitting swap', async () => {
    const wrapper = mountSheet({ open: true })
    await body.find('section').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('swap')).toBeUndefined()
  })
})
