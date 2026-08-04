import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises, DOMWrapper, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import ExerciseHistorySheet from '../components/ExerciseHistorySheet.vue'
import { useWorkoutsStore } from '../stores/workouts'
import type { ExerciseHistoryEntry } from '../stores/workouts'

const body = new DOMWrapper(document.body)
let activeWrapper: VueWrapper | null = null

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  document.body.innerHTML = ''
})

function mountSheet(props: { open: boolean }, entries: ExerciseHistoryEntry[] = []) {
  const pinia = createPinia()
  const workouts = useWorkoutsStore(pinia)
  const fetchSpy = vi.spyOn(workouts, 'fetchExerciseHistory').mockResolvedValue(entries)

  const wrapper = mount(ExerciseHistorySheet, {
    props: { exerciseId: 'ex-bench', exerciseName: 'Bench Press', ...props },
    global: { plugins: [pinia] },
  })
  activeWrapper = wrapper
  return { wrapper, fetchSpy }
}

const sampleEntry: ExerciseHistoryEntry = {
  mesocycleWorkoutExerciseId: 'mwe-1',
  mesocycleName: 'Summer Cut',
  weekNumber: 3,
  isDeload: false,
  workoutName: 'Push',
  loggedAt: '2026-01-08T00:00:00Z',
  sets: [
    { setNumber: 1, weight: 100, reps: 8 },
    { setNumber: 2, weight: 100, reps: 8 },
  ],
}

describe('ExerciseHistorySheet', () => {
  it('renders nothing when closed and does not fetch', () => {
    const { fetchSpy } = mountSheet({ open: false })
    expect(body.text()).not.toContain('Bench Press')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('fetches and renders grouped history entries when opened', async () => {
    const { fetchSpy } = mountSheet({ open: true }, [sampleEntry])
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledWith('ex-bench')
    expect(body.text()).toContain('Bench Press')
    expect(body.text()).toContain('Summer Cut · Week 3')
    expect(body.text()).toContain('100 × 8')
  })

  it('shows the empty state when there is no history', async () => {
    mountSheet({ open: true }, [])
    await flushPromises()

    expect(body.text()).toContain('No sets logged yet for this exercise.')
  })

  it('closes on Escape', async () => {
    const { wrapper } = mountSheet({ open: true }, [sampleEntry])
    await flushPromises()

    await body.find('section').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
