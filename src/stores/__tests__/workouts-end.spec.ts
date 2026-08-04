import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkoutsStore } from '../workouts'

type Row = Record<string, unknown>

let nextError: Error | null = null
const updates: { table: string; payload: Row; filters: { column: string; value: unknown }[] }[] = []

vi.mock('@/utils/supabase', () => {
  function createChain(table: string) {
    const filters: { column: string; value: unknown }[] = []
    let updatePayload: Row | null = null

    const chain: Record<string, unknown> = {
      eq: (column: string, value: unknown) => {
        filters.push({ column, value })
        return chain
      },
      update: (payload: Row) => {
        updatePayload = payload
        return chain
      },
      then: (resolve: (value: { error: Error | null }) => void) => {
        if (updatePayload) {
          updates.push({ table, payload: updatePayload, filters: [...filters] })
        }
        resolve({ error: nextError })
      },
    }
    return chain
  }

  return { supabase: { from: (table: string) => createChain(table) } }
})

beforeEach(() => {
  setActivePinia(createPinia())
  nextError = null
  updates.length = 0
})

function setupStore() {
  const workouts = useWorkoutsStore()
  workouts.activeMesocycle = { id: 'meso-1', name: 'Block', clonedFromId: null }
  workouts.structure = [{ id: 'week-1', week_number: 1, is_deload: false, mesocycle_workouts: [] }]
  return workouts
}

describe('endMesocycle', () => {
  it('errors without calling update when there is no active mesocycle', async () => {
    const workouts = useWorkoutsStore()
    const { error } = await workouts.endMesocycle()

    expect(error?.message).toBe('No active mesocycle.')
    expect(updates).toHaveLength(0)
  })

  it('flips is_active off and clears local state on success', async () => {
    const workouts = setupStore()
    const { error } = await workouts.endMesocycle()

    expect(error).toBeNull()
    expect(updates).toEqual([
      {
        table: 'mesocycles',
        payload: { is_active: false },
        filters: [{ column: 'id', value: 'meso-1' }],
      },
    ])
    expect(workouts.activeMesocycle).toBeNull()
    expect(workouts.structure).toEqual([])
  })

  it('returns the error and leaves state intact on failure', async () => {
    const workouts = setupStore()
    nextError = new Error('network down')

    const { error } = await workouts.endMesocycle()

    expect(error?.message).toBe('network down')
    expect(workouts.activeMesocycle).toEqual({ id: 'meso-1', name: 'Block', clonedFromId: null })
    expect(workouts.structure).toHaveLength(1)
  })
})
