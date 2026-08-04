import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkoutsStore } from '../workouts'

type Row = Record<string, unknown>

interface Call {
  table: string
  op: 'upsert' | 'delete'
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

const baseInput = {
  mesocycleWorkoutExerciseId: 'ex-row-1',
  mesocycleId: 'meso-1',
  exerciseId: 'exercise-bench',
}

describe('saveExerciseNote', () => {
  it('upserts a week-scoped note and clears any pinned note for the exercise', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.saveExerciseNote({
      ...baseInput,
      content: 'Go slow',
      pinned: false,
    })

    expect(error).toBeNull()
    expect(calls).toEqual([
      {
        table: 'exercise_week_notes',
        op: 'upsert',
        payload: { mesocycle_workout_exercise_id: 'ex-row-1', content: 'Go slow' },
        onConflict: 'mesocycle_workout_exercise_id',
        filters: [],
      },
      {
        table: 'exercise_pinned_notes',
        op: 'delete',
        payload: undefined,
        onConflict: undefined,
        filters: [
          { column: 'mesocycle_id', value: 'meso-1' },
          { column: 'exercise_id', value: 'exercise-bench' },
        ],
      },
    ])
  })

  it('upserts a pinned note and clears the week-scoped row for that slot', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.saveExerciseNote({
      ...baseInput,
      content: 'Use straps',
      pinned: true,
    })

    expect(error).toBeNull()
    expect(calls).toEqual([
      {
        table: 'exercise_pinned_notes',
        op: 'upsert',
        payload: { mesocycle_id: 'meso-1', exercise_id: 'exercise-bench', content: 'Use straps' },
        onConflict: 'mesocycle_id,exercise_id',
        filters: [],
      },
      {
        table: 'exercise_week_notes',
        op: 'delete',
        payload: undefined,
        onConflict: undefined,
        filters: [{ column: 'mesocycle_workout_exercise_id', value: 'ex-row-1' }],
      },
    ])
  })

  it('trims content and deletes from both tables when the note is emptied', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.saveExerciseNote({
      ...baseInput,
      content: '   ',
      pinned: true,
    })

    expect(error).toBeNull()
    expect(calls.map((c) => ({ table: c.table, op: c.op }))).toEqual([
      { table: 'exercise_week_notes', op: 'delete' },
      { table: 'exercise_pinned_notes', op: 'delete' },
    ])
  })

  it('returns the error and skips cleanup when the upsert fails', async () => {
    failTable = 'exercise_week_notes'
    const workouts = useWorkoutsStore()
    const { error } = await workouts.saveExerciseNote({
      ...baseInput,
      content: 'Go slow',
      pinned: false,
    })

    expect(error).toBeInstanceOf(Error)
    expect(calls).toHaveLength(1)
  })
})
