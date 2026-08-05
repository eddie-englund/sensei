import { test, expect } from '@playwright/test'
import { mockAuthedSession, mockWorkoutsApi } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockAuthedSession(page)
  await mockWorkoutsApi(page)
  await page.route('**/rest/v1/workout_sets*', (route) => route.fulfill({ json: [] }))
})

test('adding a set lets you log an extra set on the current workout', async ({ page }) => {
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await expect(page.getByText('Set 1')).toBeVisible()
  await expect(page.getByText('Set 2')).toBeHidden()

  await page.getByRole('button', { name: '+ Add set' }).click()
  await expect(page.getByText('Set 2')).toBeVisible()

  const setTwoRow = page.getByText('Set 2').locator('..')
  await setTwoRow.getByPlaceholder('Weight').fill('135')
  await setTwoRow.getByPlaceholder('Reps').fill('8')
  await setTwoRow.getByRole('button', { name: 'Log set' }).click()

  await expect(setTwoRow.getByRole('button', { name: 'Unlog set' })).toBeVisible()
})

test('logging a set accepts a comma as the decimal separator (mobile locale keyboards)', async ({
  page,
}) => {
  let loggedBody: { weight?: number; reps?: number } | null = null
  await page.route('**/rest/v1/workout_sets*', (route) => {
    loggedBody = route.request().postDataJSON()
    return route.fulfill({ json: [] })
  })

  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  const setOneRow = page.getByText('Set 1').locator('..')
  await setOneRow.getByPlaceholder('Weight').fill('62,5')
  await setOneRow.getByPlaceholder('Reps').fill('5')
  await setOneRow.getByRole('button', { name: 'Log set' }).click()

  // This fixture's only exercise has a single target set, so logging it
  // completes the whole workout and swaps the row to its read-only display.
  await expect(page.getByText('Workout complete')).toBeVisible()
  await expect(page.getByText('62.5 × 5')).toBeVisible()
  expect(loggedBody).toMatchObject({ weight: 62.5, reps: 5 })
})
