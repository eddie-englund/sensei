import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkoutsStore } from '../workouts'

type Row = Record<string, unknown>

const updates: Record<string, { payload: Row; filters: { column: string; value: unknown }[] }[]> =
  {}
let failNextUpdate = false

vi.mock('@/utils/supabase', () => {
  function createChain(table: string) {
    let updatePayload: Row | null = null
    const filters: { column: string; value: unknown }[] = []

    const chain: Record<string, unknown> = {
      update: (payload: Row) => {
        updatePayload = payload
        return chain
      },
      eq: (column: string, value: unknown) => {
        filters.push({ column, value })
        return chain
      },
      then: (resolve: (value: { data: unknown; error: Error | null }) => void) => {
        if (updatePayload) {
          updates[table] = [...(updates[table] ?? []), { payload: updatePayload, filters }]
          if (failNextUpdate) {
            resolve({ data: null, error: new Error('update failed') })
            return
          }
          resolve({ data: [updatePayload], error: null })
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
  Object.keys(updates).forEach((key) => delete updates[key])
  failNextUpdate = false
})

describe('addSet', () => {
  it('increments target_sets on the workout-instance exercise row', async () => {
    const workouts = useWorkoutsStore()
    const { targetSets, error } = await workouts.addSet('exercise-1', 3)

    expect(error).toBeNull()
    expect(targetSets).toBe(4)
    expect(updates['mesocycle_workout_exercises']).toEqual([
      { payload: { target_sets: 4 }, filters: [{ column: 'id', value: 'exercise-1' }] },
    ])
  })

  it('returns the error and a null target count when the update fails', async () => {
    failNextUpdate = true
    const workouts = useWorkoutsStore()
    const { targetSets, error } = await workouts.addSet('exercise-1', 3)

    expect(error).toBeInstanceOf(Error)
    expect(targetSets).toBeNull()
  })
})
