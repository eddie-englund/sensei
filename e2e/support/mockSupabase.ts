import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

function readSupabaseUrl(): string {
  const contents = readFileSync('.env.local', 'utf-8')
  const match = contents.match(/^VITE_SUPABASE_URL=(.+)$/m)
  if (!match) throw new Error('VITE_SUPABASE_URL not found in .env.local')
  return match[1].trim()
}

const FAKE_USER_ID = '00000000-0000-0000-0000-000000000001'
export const MESOCYCLE_ID = 'meso-1'
export const EXERCISE_ID = 'exercise-bench'

interface FixtureWorkout {
  id: string
  dayNumber: number
  name: string
  weekId: string
  complete: boolean
}

interface FixtureWeek {
  id: string
  weekNumber: number
  isDeload: boolean
  workoutIds: string[]
}

export const WORKOUTS: Record<string, FixtureWorkout> = {
  w1d1: { id: 'w1d1', dayNumber: 1, name: 'Push', weekId: 'week-1', complete: true },
  w1d2: { id: 'w1d2', dayNumber: 2, name: 'Pull', weekId: 'week-1', complete: true },
  w2d1: { id: 'w2d1', dayNumber: 1, name: 'Push', weekId: 'week-2', complete: true },
  w2d2: { id: 'w2d2', dayNumber: 2, name: 'Pull', weekId: 'week-2', complete: false },
}

export const WEEKS: Record<string, FixtureWeek> = {
  'week-1': { id: 'week-1', weekNumber: 1, isDeload: false, workoutIds: ['w1d1', 'w1d2'] },
  'week-2': { id: 'week-2', weekNumber: 2, isDeload: false, workoutIds: ['w2d1', 'w2d2'] },
}

function stripFilterPrefix(value: string | null): string | null {
  return value?.replace(/^eq\./, '') ?? null
}

function stripComparatorPrefix(value: string | null): string | null {
  return value?.replace(/^(eq|gte|lte|gt|lt)\./, '') ?? null
}

function loggedSet(complete: boolean) {
  return {
    set_number: 1,
    weight: complete ? 100 : null,
    reps: complete ? 5 : null,
    completed_at: complete ? '2026-01-01T00:00:00Z' : null,
  }
}

function structureWorkoutRow(workout: FixtureWorkout) {
  return {
    id: workout.id,
    day_number: workout.dayNumber,
    name: workout.name,
    mesocycle_workout_exercises: [
      {
        id: `${workout.id}-ex1`,
        order_index: 0,
        target_sets: 1,
        workout_sets: [loggedSet(workout.complete)],
      },
    ],
  }
}

export async function mockAuthedSession(page: Page) {
  const supabaseUrl = readSupabaseUrl()
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const key = `sb-${projectRef}-auth-token`

  const session = {
    access_token: 'fake-access-token',
    token_type: 'bearer',
    expires_in: 31536000,
    expires_at: Math.floor(Date.now() / 1000) + 31536000,
    refresh_token: 'fake-refresh-token',
    user: {
      id: FAKE_USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  }

  await page.addInitScript(
    ({ key, session }) => {
      window.localStorage.setItem(key, JSON.stringify(session))
    },
    { key, session },
  )
}

export const mesocyclePatches: Record<string, unknown>[] = []
export const weekNotes: Record<string, string> = {}
export const pinnedNotes: Record<string, string> = {}

function parseInFilter(value: string | null): string[] {
  if (!value?.startsWith('in.(')) return []
  return value.slice(4, -1).split(',').filter(Boolean)
}

export async function mockWorkoutsApi(page: Page) {
  mesocyclePatches.length = 0
  for (const key of Object.keys(weekNotes)) delete weekNotes[key]
  for (const key of Object.keys(pinnedNotes)) delete pinnedNotes[key]

  await page.route('**/rest/v1/mesocycles*', (route) => {
    if (route.request().method() === 'PATCH') {
      mesocyclePatches.push(route.request().postDataJSON())
      route.fulfill({ status: 204 })
      return
    }
    route.fulfill({ json: { id: MESOCYCLE_ID, name: 'Test Meso', cloned_from_id: null } })
  })

  await page.route('**/rest/v1/mesocycle_weeks*', (route) => {
    const url = new URL(route.request().url())
    const select = url.searchParams.get('select') ?? ''

    if (select.includes('mesocycle_workouts')) {
      const weeks = Object.values(WEEKS).map((week) => ({
        id: week.id,
        week_number: week.weekNumber,
        is_deload: week.isDeload,
        mesocycle_workouts: week.workoutIds.map((id) => structureWorkoutRow(WORKOUTS[id]!)),
      }))
      route.fulfill({ json: weeks })
      return
    }

    // resolveReferenceWeekId: select=id, filtered by week_number
    const weekNumber = Number(stripFilterPrefix(url.searchParams.get('week_number')))
    const match = Object.values(WEEKS).find((week) => week.weekNumber === weekNumber)
    route.fulfill({ json: match ? { id: match.id } : null })
  })

  await page.route('**/rest/v1/mesocycle_workouts*', (route) => {
    const url = new URL(route.request().url())
    const select = url.searchParams.get('select') ?? ''

    if (select.includes('mesocycle_weeks')) {
      const id = stripFilterPrefix(url.searchParams.get('id'))
      const workout = id ? WORKOUTS[id] : undefined
      if (!workout) {
        route.fulfill({ status: 404, json: null })
        return
      }
      const week = WEEKS[workout.weekId]!
      route.fulfill({
        json: {
          id: workout.id,
          day_number: workout.dayNumber,
          name: workout.name,
          mesocycle_weeks: {
            id: week.id,
            week_number: week.weekNumber,
            is_deload: week.isDeload,
            mesocycle_id: MESOCYCLE_ID,
            mesocycles: { id: MESOCYCLE_ID, name: 'Test Meso', cloned_from_id: null },
          },
        },
      })
      return
    }

    // refWorkout lookup: filtered by mesocycle_week_id + day_number
    const weekId = stripFilterPrefix(url.searchParams.get('mesocycle_week_id'))
    const dayNumber = Number(stripFilterPrefix(url.searchParams.get('day_number')))
    const week = weekId ? WEEKS[weekId] : undefined
    const match = week?.workoutIds.map((id) => WORKOUTS[id]!).find((w) => w.dayNumber === dayNumber)
    route.fulfill({ json: match ? { id: match.id } : null })
  })

  await page.route('**/rest/v1/mesocycle_workout_exercises*', (route) => {
    const url = new URL(route.request().url())
    const select = url.searchParams.get('select') ?? ''
    const workoutId = stripFilterPrefix(url.searchParams.get('mesocycle_workout_id'))
    const workout = workoutId ? WORKOUTS[workoutId] : undefined

    if (select.includes('exercises')) {
      const rowId = workout ? `${workout.id}-ex1` : null
      route.fulfill({
        json: workout
          ? [
              {
                id: rowId,
                exercise_id: EXERCISE_ID,
                order_index: 0,
                target_sets: 1,
                exercises: { name: 'Bench Press' },
                workout_sets: [loggedSet(workout.complete)],
                exercise_week_notes:
                  rowId && weekNotes[rowId] !== undefined ? { content: weekNotes[rowId] } : null,
              },
            ]
          : [],
      })
      return
    }

    route.fulfill({
      json: workout ? [{ order_index: 0, workout_sets: [loggedSet(workout.complete)] }] : [],
    })
  })

  await page.route('**/rest/v1/exercise_week_notes*', (route) => {
    const req = route.request()
    const url = new URL(req.url())

    if (req.method() === 'POST') {
      const body = req.postDataJSON() as { mesocycle_workout_exercise_id: string; content: string }
      weekNotes[body.mesocycle_workout_exercise_id] = body.content
      route.fulfill({ status: 201, json: [body] })
      return
    }

    if (req.method() === 'DELETE') {
      const rowId = stripFilterPrefix(url.searchParams.get('mesocycle_workout_exercise_id'))
      if (rowId) delete weekNotes[rowId]
      route.fulfill({ status: 204 })
      return
    }

    route.fulfill({ json: [] })
  })

  await page.route('**/rest/v1/exercise_pinned_notes*', (route) => {
    const req = route.request()
    const url = new URL(req.url())

    if (req.method() === 'POST') {
      const body = req.postDataJSON() as { exercise_id: string; content: string }
      pinnedNotes[body.exercise_id] = body.content
      route.fulfill({ status: 201, json: [body] })
      return
    }

    if (req.method() === 'DELETE') {
      const exerciseId = stripFilterPrefix(url.searchParams.get('exercise_id'))
      if (exerciseId) delete pinnedNotes[exerciseId]
      route.fulfill({ status: 204 })
      return
    }

    const ids = parseInFilter(url.searchParams.get('exercise_id'))
    const rows = ids
      .filter((id) => pinnedNotes[id] !== undefined)
      .map((id) => ({ exercise_id: id, content: pinnedNotes[id] }))
    route.fulfill({ json: rows })
  })
}

// Dedicated fixture for the exercise-swap e2e spec: one exercise slot (day 1)
// repeated across three weeks, so scope ('week' vs 'mesocycle') has a past
// week and a future week to assert against. Kept separate from
// WORKOUTS/WEEKS above so it can't affect other specs that assert on the
// exact shape of that shared fixture (e.g. workout-switcher.spec.ts).
export const SWAP_MESOCYCLE_ID = 'meso-swap'
export const BENCH_EXERCISE_ID = 'exercise-bench-swap'
export const SQUAT_EXERCISE_ID = 'exercise-squat-swap'

interface SwapWorkout {
  id: string
  dayNumber: number
  name: string
  weekId: string
}

interface SwapWeek {
  id: string
  weekNumber: number
  workoutIds: string[]
}

const SWAP_WORKOUTS: Record<string, SwapWorkout> = {
  sw1d1: { id: 'sw1d1', dayNumber: 1, name: 'Push', weekId: 'sweek-1' },
  sw2d1: { id: 'sw2d1', dayNumber: 1, name: 'Push', weekId: 'sweek-2' },
  sw3d1: { id: 'sw3d1', dayNumber: 1, name: 'Push', weekId: 'sweek-3' },
}

const SWAP_WEEKS: Record<string, SwapWeek> = {
  'sweek-1': { id: 'sweek-1', weekNumber: 1, workoutIds: ['sw1d1'] },
  'sweek-2': { id: 'sweek-2', weekNumber: 2, workoutIds: ['sw2d1'] },
  'sweek-3': { id: 'sweek-3', weekNumber: 3, workoutIds: ['sw3d1'] },
}

const swapRowExerciseId: Record<string, string> = {}

function swapRowId(workoutId: string): string {
  return `${workoutId}-ex1`
}

export async function mockExerciseSwapApi(page: Page) {
  for (const workout of Object.values(SWAP_WORKOUTS)) {
    swapRowExerciseId[swapRowId(workout.id)] = BENCH_EXERCISE_ID
  }

  await page.route('**/rest/v1/exercises*', (route) => {
    route.fulfill({
      json: [
        { id: BENCH_EXERCISE_ID, name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
        { id: SQUAT_EXERCISE_ID, name: 'Squat', muscle_group: 'Legs', equipment: 'Barbell' },
      ],
    })
  })

  await page.route('**/rest/v1/mesocycles*', (route) => {
    route.fulfill({ json: { id: SWAP_MESOCYCLE_ID, name: 'Swap Test Meso', cloned_from_id: null } })
  })

  await page.route('**/rest/v1/mesocycle_weeks*', (route) => {
    const url = new URL(route.request().url())
    const weekNumber = Number(stripFilterPrefix(url.searchParams.get('week_number')))
    const match = Object.values(SWAP_WEEKS).find((week) => week.weekNumber === weekNumber)
    route.fulfill({ json: match ? { id: match.id } : null })
  })

  await page.route('**/rest/v1/mesocycle_workouts*', (route) => {
    const url = new URL(route.request().url())
    const select = url.searchParams.get('select') ?? ''

    if (select.includes('mesocycle_weeks')) {
      const id = stripFilterPrefix(url.searchParams.get('id'))
      const workout = id ? SWAP_WORKOUTS[id] : undefined
      if (!workout) {
        route.fulfill({ status: 404, json: null })
        return
      }
      const week = SWAP_WEEKS[workout.weekId]!
      route.fulfill({
        json: {
          id: workout.id,
          day_number: workout.dayNumber,
          name: workout.name,
          mesocycle_weeks: {
            id: week.id,
            week_number: week.weekNumber,
            is_deload: false,
            mesocycle_id: SWAP_MESOCYCLE_ID,
            mesocycles: { id: SWAP_MESOCYCLE_ID, name: 'Swap Test Meso', cloned_from_id: null },
          },
        },
      })
      return
    }

    // refWorkout lookup for prior-week prefill — no prior logged sets to
    // surface in this fixture, so there's nothing to resolve.
    route.fulfill({ json: null })
  })

  await page.route('**/rest/v1/mesocycle_workout_exercises*', (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const select = url.searchParams.get('select') ?? ''

    if (req.method() === 'PATCH') {
      const ids = parseInFilter(url.searchParams.get('id'))
      const body = req.postDataJSON() as { exercise_id: string }
      for (const id of ids) swapRowExerciseId[id] = body.exercise_id
      route.fulfill({ status: 204 })
      return
    }

    if (select.includes('mesocycle_workouts')) {
      // swapExercise's own lookups: the single current-row fetch (filtered
      // by id) vs. the bulk later-weeks fetch (filtered by position).
      const rowId = stripFilterPrefix(url.searchParams.get('id'))
      if (rowId) {
        const workoutId = rowId.replace(/-ex1$/, '')
        const workout = SWAP_WORKOUTS[workoutId]
        if (!workout) {
          route.fulfill({ json: null })
          return
        }
        const week = SWAP_WEEKS[workout.weekId]!
        route.fulfill({
          json: {
            id: rowId,
            order_index: 0,
            mesocycle_workouts: {
              day_number: workout.dayNumber,
              mesocycle_weeks: { week_number: week.weekNumber, mesocycle_id: SWAP_MESOCYCLE_ID },
            },
          },
        })
        return
      }

      const dayNumber = Number(
        stripComparatorPrefix(url.searchParams.get('mesocycle_workouts.day_number')),
      )
      const minWeekNumber = Number(
        stripComparatorPrefix(
          url.searchParams.get('mesocycle_workouts.mesocycle_weeks.week_number'),
        ),
      )
      const matches = Object.values(SWAP_WORKOUTS)
        .filter((workout) => workout.dayNumber === dayNumber)
        .filter((workout) => SWAP_WEEKS[workout.weekId]!.weekNumber >= minWeekNumber)
        .map((workout) => ({ id: swapRowId(workout.id) }))
      route.fulfill({ json: matches })
      return
    }

    // main workout-detail fetch: select includes exercises ( name )
    const workoutId = stripFilterPrefix(url.searchParams.get('mesocycle_workout_id'))
    const workout = workoutId ? SWAP_WORKOUTS[workoutId] : undefined
    if (!workout) {
      route.fulfill({ json: [] })
      return
    }
    const rowId = swapRowId(workout.id)
    const exerciseId = swapRowExerciseId[rowId] ?? BENCH_EXERCISE_ID
    const name = exerciseId === SQUAT_EXERCISE_ID ? 'Squat' : 'Bench Press'
    route.fulfill({
      json: [
        {
          id: rowId,
          exercise_id: exerciseId,
          order_index: 0,
          target_sets: 1,
          exercises: { name },
          workout_sets: [],
          exercise_week_notes: null,
        },
      ],
    })
  })

  await page.route('**/rest/v1/exercise_pinned_notes*', (route) => route.fulfill({ json: [] }))
  await page.route('**/rest/v1/exercise_week_notes*', (route) => route.fulfill({ json: [] }))
  await page.route('**/rest/v1/workout_sets*', (route) => {
    route.fulfill({ status: route.request().method() === 'DELETE' ? 204 : 200, json: [] })
  })
}
