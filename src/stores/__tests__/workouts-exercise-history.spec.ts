import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkoutsStore } from '../workouts'
import { useAuthStore } from '../auth'

type Row = Record<string, unknown>

let mockData: Row[] = []
let filters: { column: string; value: unknown }[] = []

vi.mock('@/utils/supabase', () => {
  function createChain() {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        filters.push({ column, value })
        return chain
      },
      then: (resolve: (value: { data: unknown; error: null }) => void) => {
        resolve({ data: mockData, error: null })
      },
    }
    return chain
  }

  return { supabase: { from: () => createChain() } }
})

beforeEach(() => {
  setActivePinia(createPinia())
  mockData = []
  filters = []
})

function signIn(userId = 'user-1') {
  const auth = useAuthStore()
  auth.session = { user: { id: userId } } as never
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 'mwe-1',
    mesocycle_workouts: {
      name: 'Push',
      mesocycle_weeks: {
        week_number: 1,
        is_deload: false,
        mesocycles: { name: 'Summer Cut' },
      },
    },
    workout_sets: [
      { set_number: 1, weight: 100, reps: 8, completed_at: '2026-01-01T00:00:00Z' },
      { set_number: 2, weight: 100, reps: 8, completed_at: '2026-01-01T00:05:00Z' },
    ],
    ...overrides,
  }
}

describe('fetchExerciseHistory', () => {
  it('returns an empty list when signed out', async () => {
    const workouts = useWorkoutsStore()
    const result = await workouts.fetchExerciseHistory('exercise-1')
    expect(result).toEqual([])
  })

  it('drops entries with no completed sets', async () => {
    signIn()
    mockData = [
      row({
        id: 'mwe-1',
        workout_sets: [{ set_number: 1, weight: null, reps: null, completed_at: null }],
      }),
    ]

    const workouts = useWorkoutsStore()
    const result = await workouts.fetchExerciseHistory('exercise-1')
    expect(result).toEqual([])
  })

  it('sorts sets within an entry by set number and uses the latest completed_at', async () => {
    signIn()
    mockData = [
      row({
        workout_sets: [
          { set_number: 2, weight: 105, reps: 6, completed_at: '2026-01-01T00:05:00Z' },
          { set_number: 1, weight: 100, reps: 8, completed_at: '2026-01-01T00:00:00Z' },
        ],
      }),
    ]

    const workouts = useWorkoutsStore()
    const [entry] = await workouts.fetchExerciseHistory('exercise-1')
    expect(entry!.sets).toEqual([
      { setNumber: 1, weight: 100, reps: 8 },
      { setNumber: 2, weight: 105, reps: 6 },
    ])
    expect(entry!.loggedAt).toBe('2026-01-01T00:05:00Z')
  })

  it('sorts entries newest first', async () => {
    signIn()
    mockData = [
      row({
        id: 'mwe-old',
        workout_sets: [
          { set_number: 1, weight: 90, reps: 8, completed_at: '2026-01-01T00:00:00Z' },
        ],
      }),
      row({
        id: 'mwe-new',
        workout_sets: [
          { set_number: 1, weight: 95, reps: 8, completed_at: '2026-01-08T00:00:00Z' },
        ],
      }),
    ]

    const workouts = useWorkoutsStore()
    const result = await workouts.fetchExerciseHistory('exercise-1')
    expect(result.map((entry) => entry.mesocycleWorkoutExerciseId)).toEqual(['mwe-new', 'mwe-old'])
  })

  it('keeps entries from different mesocycles distinct even when week numbers collide', async () => {
    signIn()
    mockData = [
      row({
        id: 'mwe-a',
        mesocycle_workouts: {
          name: 'Push',
          mesocycle_weeks: {
            week_number: 1,
            is_deload: false,
            mesocycles: { name: 'Summer Cut' },
          },
        },
        workout_sets: [
          { set_number: 1, weight: 90, reps: 8, completed_at: '2026-01-01T00:00:00Z' },
        ],
      }),
      row({
        id: 'mwe-b',
        mesocycle_workouts: {
          name: 'Push',
          mesocycle_weeks: {
            week_number: 1,
            is_deload: false,
            mesocycles: { name: 'Winter Bulk' },
          },
        },
        workout_sets: [
          { set_number: 1, weight: 110, reps: 6, completed_at: '2026-03-01T00:00:00Z' },
        ],
      }),
    ]

    const workouts = useWorkoutsStore()
    const result = await workouts.fetchExerciseHistory('exercise-1')
    expect(
      result.map((entry) => ({ mesocycleName: entry.mesocycleName, weekNumber: entry.weekNumber })),
    ).toEqual([
      { mesocycleName: 'Winter Bulk', weekNumber: 1 },
      { mesocycleName: 'Summer Cut', weekNumber: 1 },
    ])
  })

  it('filters by the signed-in user via the mesocycle owner chain', async () => {
    signIn('user-42')
    mockData = [row()]

    const workouts = useWorkoutsStore()
    await workouts.fetchExerciseHistory('exercise-1')

    expect(filters).toContainEqual({
      column: 'mesocycle_workouts.mesocycle_weeks.mesocycles.created_by',
      value: 'user-42',
    })
    expect(filters).toContainEqual({ column: 'exercise_id', value: 'exercise-1' })
  })
})
