import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkoutsStore } from '../workouts'
import { useAuthStore } from '../auth'

type Row = Record<string, unknown>

function buildWeek(weekNumber: number, isDeload: boolean) {
  return {
    id: `week-${weekNumber}`,
    week_number: weekNumber,
    is_deload: isDeload,
    mesocycle_workouts: [
      {
        id: `workout-${weekNumber}`,
        day_number: 1,
        name: 'Day 1',
        mesocycle_workout_exercises: [
          { id: `ex-${weekNumber}`, order_index: 0, target_sets: 3, workout_sets: [] },
        ],
      },
    ],
  }
}

const inserts: Record<string, Row[]> = {}
const updates: Record<string, Row[]> = {}
const deletes: Record<string, { column: string; value: unknown }[]> = {}

vi.mock('@/utils/supabase', () => {
  function createChain(table: string) {
    let insertedRows: Row[] = []
    let hasSingle = false
    let updatePayload: Row | null = null
    let deletePending = false
    const filters: { column: string; value: unknown }[] = []

    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        filters.push({ column, value })
        return chain
      },
      gt: (column: string, value: unknown) => {
        filters.push({ column: `${column}:gt`, value })
        return chain
      },
      order: () => chain,
      in: () => chain,
      update: (payload: Row) => {
        updatePayload = payload
        return chain
      },
      delete: () => {
        deletePending = true
        return chain
      },
      maybeSingle: () => {
        hasSingle = true
        return chain
      },
      single: () => {
        hasSingle = true
        return chain
      },
      insert: (rows: Row | Row[]) => {
        insertedRows = Array.isArray(rows) ? rows : [rows]
        inserts[table] = [...(inserts[table] ?? []), ...insertedRows]
        return chain
      },
      then: (resolve: (value: { data: unknown; error: null }) => void) => {
        if (updatePayload) {
          updates[table] = [...(updates[table] ?? []), { ...updatePayload, filters: [...filters] }]
          resolve({ data: [updatePayload], error: null })
          return
        }
        if (deletePending) {
          deletes[table] = [...(deletes[table] ?? []), ...filters]
          resolve({ data: [], error: null })
          return
        }

        // template lookups
        if (
          table === 'mesocycle_weeks' &&
          hasSingle &&
          filters.some((f) => f.column === 'week_number')
        ) {
          resolve({ data: { id: 'week-1' }, error: null })
          return
        }
        if (table === 'mesocycle_workouts' && !insertedRows.length && filters.length) {
          resolve({
            data: [
              {
                day_number: 1,
                name: 'Day 1',
                mesocycle_workout_exercises: [
                  { exercise_id: 'exercise-1', order_index: 0, target_sets: 3 },
                ],
              },
            ],
            error: null,
          })
          return
        }

        if (hasSingle) {
          resolve({ data: { id: `${table}-id`, ...insertedRows[0] }, error: null })
          return
        }
        resolve({
          data: insertedRows.map((row, i) => ({ id: `${table}-new-${i}`, ...row })),
          error: null,
        })
      },
    }
    return chain
  }

  return { supabase: { from: (table: string) => createChain(table) } }
})

beforeEach(() => {
  setActivePinia(createPinia())
  Object.keys(inserts).forEach((key) => delete inserts[key])
  Object.keys(updates).forEach((key) => delete updates[key])
  Object.keys(deletes).forEach((key) => delete deletes[key])
})

function setupStore(weeks: ReturnType<typeof buildWeek>[]) {
  const auth = useAuthStore()
  // @ts-expect-error partial session is enough for auth.user.id in this test
  auth.session = { user: { id: 'user-1' } }

  const workouts = useWorkoutsStore()
  workouts.activeMesocycle = { id: 'meso-1', name: 'Block', clonedFromId: null }
  workouts.structure = weeks
  return workouts
}

describe('updateMesocycleLength', () => {
  it('is a no-op when the count is unchanged', async () => {
    const workouts = setupStore([buildWeek(1, false), buildWeek(2, true)])
    const { error } = await workouts.updateMesocycleLength(2)
    expect(error).toBeNull()
    expect(inserts['mesocycle_weeks']).toBeUndefined()
  })

  it('is a no-op when the count is below 1', async () => {
    const workouts = setupStore([buildWeek(1, true)])
    const { error } = await workouts.updateMesocycleLength(0)
    expect(error).toBeNull()
    expect(inserts['mesocycle_weeks']).toBeUndefined()
  })

  it('lengthening adds weeks, flips the old deload off, and marks the new last week as deload', async () => {
    const workouts = setupStore([buildWeek(1, false), buildWeek(2, true)])
    const { error } = await workouts.updateMesocycleLength(4)

    expect(error).toBeNull()

    const insertedWeeks = inserts['mesocycle_weeks']!
    expect(insertedWeeks).toEqual([
      { mesocycle_id: 'meso-1', week_number: 3, is_deload: false },
      { mesocycle_id: 'meso-1', week_number: 4, is_deload: true },
    ])

    const deloadFlip = updates['mesocycle_weeks']!.find((u) => u.is_deload === false)
    expect(deloadFlip).toBeTruthy()

    const insertedWorkouts = inserts['mesocycle_workouts']!
    expect(insertedWorkouts).toHaveLength(2)
    expect(insertedWorkouts.every((w) => w.day_number === 1 && w.name === 'Day 1')).toBe(true)

    const insertedExercises = inserts['mesocycle_workout_exercises']!
    expect(insertedExercises).toHaveLength(2)
    expect(insertedExercises.every((e) => e.exercise_id === 'exercise-1')).toBe(true)
  })

  it('shortening deletes trailing weeks and re-flags the new last week as deload', async () => {
    const workouts = setupStore([
      buildWeek(1, false),
      buildWeek(2, false),
      buildWeek(3, false),
      buildWeek(4, true),
    ])
    const { error } = await workouts.updateMesocycleLength(2)

    expect(error).toBeNull()

    expect(deletes['mesocycle_weeks']).toEqual([
      { column: 'mesocycle_id', value: 'meso-1' },
      { column: 'week_number:gt', value: 2 },
    ])

    const deloadFlag = updates['mesocycle_weeks']!.find((u) => u.is_deload === true)
    expect(deloadFlag).toBeTruthy()
  })
})
