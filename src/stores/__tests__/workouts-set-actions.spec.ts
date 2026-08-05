import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkoutsStore } from '../workouts'

type Row = Record<string, unknown>

interface Call {
  table: string
  op: 'update' | 'upsert' | 'delete'
  payload?: Row
  onConflict?: string
  filters: { column: string; value: unknown }[]
}

let calls: Call[] = []
let failTable: string | null = null

vi.mock('@/utils/supabase', () => {
  function createChain(table: string) {
    let op: Call['op'] | null = null
    let payload: Row | undefined
    let onConflict: string | undefined
    const filters: { column: string; value: unknown }[] = []

    const chain: Record<string, unknown> = {
      update: (p: Row) => {
        op = 'update'
        payload = p
        return chain
      },
      upsert: (p: Row, opts?: { onConflict: string }) => {
        op = 'upsert'
        payload = p
        onConflict = opts?.onConflict
        return chain
      },
      delete: () => {
        op = 'delete'
        return chain
      },
      eq: (column: string, value: unknown) => {
        filters.push({ column, value })
        return chain
      },
      then: (resolve: (value: { data: unknown; error: Error | null }) => void) => {
        if (op) {
          calls.push({ table, op, payload, onConflict, filters })
          if (failTable === table) {
            resolve({ data: null, error: new Error(`${table} failed`) })
            return
          }
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
})

describe('unlogSet', () => {
  it('clears completed_at for the given set', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.unlogSet('exercise-1', 2)

    expect(error).toBeNull()
    expect(calls).toEqual([
      {
        table: 'workout_sets',
        op: 'update',
        payload: { completed_at: null },
        onConflict: undefined,
        filters: [
          { column: 'mesocycle_workout_exercise_id', value: 'exercise-1' },
          { column: 'set_number', value: 2 },
        ],
      },
    ])
  })
})

describe('skipSet', () => {
  it('upserts a skipped row with weight/reps/completed_at cleared', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.skipSet('exercise-1', 3)

    expect(error).toBeNull()
    expect(calls).toHaveLength(1)
    expect(calls[0]!.table).toBe('workout_sets')
    expect(calls[0]!.op).toBe('upsert')
    expect(calls[0]!.onConflict).toBe('mesocycle_workout_exercise_id,set_number')
    expect(calls[0]!.payload).toMatchObject({
      mesocycle_workout_exercise_id: 'exercise-1',
      set_number: 3,
      weight: null,
      reps: null,
      completed_at: null,
    })
    expect(typeof calls[0]!.payload!.skipped_at).toBe('string')
  })
})

describe('unskipSet', () => {
  it('clears skipped_at for the given set', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.unskipSet('exercise-1', 3)

    expect(error).toBeNull()
    expect(calls).toEqual([
      {
        table: 'workout_sets',
        op: 'update',
        payload: { skipped_at: null },
        onConflict: undefined,
        filters: [
          { column: 'mesocycle_workout_exercise_id', value: 'exercise-1' },
          { column: 'set_number', value: 3 },
        ],
      },
    ])
  })
})

describe('removeSet', () => {
  it('decrements target_sets and deletes the trailing set row', async () => {
    const workouts = useWorkoutsStore()
    const { targetSets, error } = await workouts.removeSet('exercise-1', 4)

    expect(error).toBeNull()
    expect(targetSets).toBe(3)
    expect(calls).toEqual([
      {
        table: 'mesocycle_workout_exercises',
        op: 'update',
        payload: { target_sets: 3 },
        onConflict: undefined,
        filters: [{ column: 'id', value: 'exercise-1' }],
      },
      {
        table: 'workout_sets',
        op: 'delete',
        payload: undefined,
        onConflict: undefined,
        filters: [
          { column: 'mesocycle_workout_exercise_id', value: 'exercise-1' },
          { column: 'set_number', value: 4 },
        ],
      },
    ])
  })

  it('refuses to remove the only remaining set', async () => {
    const workouts = useWorkoutsStore()
    const { targetSets, error } = await workouts.removeSet('exercise-1', 1)

    expect(error).toBeInstanceOf(Error)
    expect(targetSets).toBeNull()
    expect(calls).toHaveLength(0)
  })

  it('returns the error and skips the delete when the target_sets update fails', async () => {
    failTable = 'mesocycle_workout_exercises'
    const workouts = useWorkoutsStore()
    const { targetSets, error } = await workouts.removeSet('exercise-1', 4)

    expect(error).toBeInstanceOf(Error)
    expect(targetSets).toBeNull()
    expect(calls).toHaveLength(1)
  })
})

describe('setSetMarker', () => {
  it('upserts a myrep marker', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.setSetMarker({
      mesocycleId: 'meso-1',
      exerciseId: 'exercise-bench',
      setNumber: 2,
      marker: 'myrep',
    })

    expect(error).toBeNull()
    expect(calls).toEqual([
      {
        table: 'exercise_set_markers',
        op: 'upsert',
        payload: {
          mesocycle_id: 'meso-1',
          exercise_id: 'exercise-bench',
          set_number: 2,
          marker_type: 'myrep',
        },
        onConflict: 'mesocycle_id,exercise_id,set_number',
        filters: [],
      },
    ])
  })

  it('upserts a myrep_match marker', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.setSetMarker({
      mesocycleId: 'meso-1',
      exerciseId: 'exercise-bench',
      setNumber: 2,
      marker: 'myrep_match',
    })

    expect(error).toBeNull()
    expect(calls[0]!.payload).toMatchObject({ marker_type: 'myrep_match' })
  })

  it('deletes the marker row when set to null', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.setSetMarker({
      mesocycleId: 'meso-1',
      exerciseId: 'exercise-bench',
      setNumber: 2,
      marker: null,
    })

    expect(error).toBeNull()
    expect(calls).toEqual([
      {
        table: 'exercise_set_markers',
        op: 'delete',
        payload: undefined,
        onConflict: undefined,
        filters: [
          { column: 'mesocycle_id', value: 'meso-1' },
          { column: 'exercise_id', value: 'exercise-bench' },
          { column: 'set_number', value: 2 },
        ],
      },
    ])
  })
})
