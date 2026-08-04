import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkoutsStore } from '../workouts'

type Row = Record<string, unknown>

interface Call {
  table: string
  op: 'select' | 'delete' | 'update'
  payload?: Row
  filters: { column: string; value: unknown }[]
}

let calls: Call[] = []
let failTable: string | null = null
let currentRow: Row | null = null
let laterRows: Row[] = []

vi.mock('@/utils/supabase', () => {
  function createChain(table: string) {
    let op: Call['op'] = 'select'
    let payload: Row | undefined
    let isSingle = false
    const filters: { column: string; value: unknown }[] = []

    const chain: Record<string, unknown> = {
      select: () => chain,
      delete: () => {
        op = 'delete'
        return chain
      },
      update: (p: Row) => {
        op = 'update'
        payload = p
        return chain
      },
      eq: (column: string, value: unknown) => {
        filters.push({ column, value })
        return chain
      },
      gte: (column: string, value: unknown) => {
        filters.push({ column, value })
        return chain
      },
      in: (column: string, value: unknown) => {
        filters.push({ column, value })
        return chain
      },
      single: () => {
        isSingle = true
        return chain
      },
      then: (resolve: (value: { data: unknown; error: Error | null }) => void) => {
        calls.push({ table, op, payload, filters })

        if (failTable === table) {
          resolve({ data: null, error: new Error(`${table} failed`) })
          return
        }

        if (op === 'select' && table === 'mesocycle_workout_exercises') {
          resolve({ data: isSingle ? currentRow : laterRows, error: null })
          return
        }

        resolve({ data: null, error: null })
      },
    }
    return chain
  }

  return { supabase: { from: (table: string) => createChain(table) } }
})

beforeEach(() => {
  setActivePinia(createPinia())
  calls = []
  failTable = null
  currentRow = {
    id: 'ex-row-1',
    order_index: 2,
    mesocycle_workouts: {
      day_number: 1,
      mesocycle_weeks: { week_number: 2, mesocycle_id: 'meso-1' },
    },
  }
  laterRows = []
})

describe('swapExercise', () => {
  it('returns an error and does nothing else when the row is not found', async () => {
    currentRow = null
    const workouts = useWorkoutsStore()
    const { error } = await workouts.swapExercise({
      mesocycleWorkoutExerciseId: 'ex-row-1',
      newExerciseId: 'exercise-squat',
      scope: 'week',
    })

    expect(error).toBeInstanceOf(Error)
    expect(calls).toHaveLength(1)
  })

  it('week scope only touches the current row: clears its sets, then updates its exercise_id', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.swapExercise({
      mesocycleWorkoutExerciseId: 'ex-row-1',
      newExerciseId: 'exercise-squat',
      scope: 'week',
    })

    expect(error).toBeNull()
    expect(calls.map((c) => ({ table: c.table, op: c.op }))).toEqual([
      { table: 'mesocycle_workout_exercises', op: 'select' },
      { table: 'workout_sets', op: 'delete' },
      { table: 'mesocycle_workout_exercises', op: 'update' },
    ])

    const [, deleteCall, updateCall] = calls
    expect(deleteCall!.filters).toEqual([
      { column: 'mesocycle_workout_exercise_id', value: ['ex-row-1'] },
    ])
    expect(updateCall!.payload).toEqual({ exercise_id: 'exercise-squat' })
    expect(updateCall!.filters).toEqual([{ column: 'id', value: ['ex-row-1'] }])
  })

  it('mesocycle scope finds matching-slot rows in the current and later weeks by position', async () => {
    laterRows = [{ id: 'ex-row-1' }, { id: 'ex-row-2' }, { id: 'ex-row-3' }]

    const workouts = useWorkoutsStore()
    const { error } = await workouts.swapExercise({
      mesocycleWorkoutExerciseId: 'ex-row-1',
      newExerciseId: 'exercise-squat',
      scope: 'mesocycle',
    })

    expect(error).toBeNull()

    const bulkSelectCall = calls[1]!
    expect(bulkSelectCall.table).toBe('mesocycle_workout_exercises')
    expect(bulkSelectCall.op).toBe('select')
    expect(bulkSelectCall.filters).toEqual([
      { column: 'order_index', value: 2 },
      { column: 'mesocycle_workouts.day_number', value: 1 },
      { column: 'mesocycle_workouts.mesocycle_weeks.mesocycle_id', value: 'meso-1' },
      { column: 'mesocycle_workouts.mesocycle_weeks.week_number', value: 2 },
    ])

    const deleteCall = calls[2]!
    expect(deleteCall.filters).toEqual([
      { column: 'mesocycle_workout_exercise_id', value: ['ex-row-1', 'ex-row-2', 'ex-row-3'] },
    ])

    const updateCall = calls[3]!
    expect(updateCall.payload).toEqual({ exercise_id: 'exercise-squat' })
    expect(updateCall.filters).toEqual([
      { column: 'id', value: ['ex-row-1', 'ex-row-2', 'ex-row-3'] },
    ])
  })

  it('returns the error and skips the exercise_id update when clearing sets fails', async () => {
    failTable = 'workout_sets'
    const workouts = useWorkoutsStore()
    const { error } = await workouts.swapExercise({
      mesocycleWorkoutExerciseId: 'ex-row-1',
      newExerciseId: 'exercise-squat',
      scope: 'week',
    })

    expect(error).toBeInstanceOf(Error)
    expect(calls.map((c) => ({ table: c.table, op: c.op }))).toEqual([
      { table: 'mesocycle_workout_exercises', op: 'select' },
      { table: 'workout_sets', op: 'delete' },
    ])
  })
})
