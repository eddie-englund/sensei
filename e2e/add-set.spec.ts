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
  await expect(page.getByText('Set 2')).not.toBeVisible()

  await page.getByRole('button', { name: '+ Add set' }).click()
  await expect(page.getByText('Set 2')).toBeVisible()

  const setTwoRow = page.getByText('Set 2').locator('..')
  await setTwoRow.getByPlaceholder('Weight').fill('135')
  await setTwoRow.getByPlaceholder('Reps').fill('8')
  await setTwoRow.getByRole('button', { name: 'Log' }).click()

  await expect(setTwoRow.getByRole('button', { name: 'Update' })).toBeVisible()
})
