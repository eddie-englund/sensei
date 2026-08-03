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

export async function mockWorkoutsApi(page: Page) {
  await page.route('**/rest/v1/mesocycles*', (route) => {
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
      route.fulfill({
        json: workout
          ? [
              {
                id: `${workout.id}-ex1`,
                order_index: 0,
                target_sets: 1,
                exercises: { name: 'Bench Press' },
                workout_sets: [loggedSet(workout.complete)],
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
}
