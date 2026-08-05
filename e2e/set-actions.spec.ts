import { test, expect } from '@playwright/test'
import { mockAuthedSession, mockWorkoutsApi } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockAuthedSession(page)
  await mockWorkoutsApi(page)
  await page.route('**/rest/v1/workout_sets*', (route) => {
    const method = route.request().method()
    route.fulfill({ status: method === 'DELETE' ? 204 : 200, json: [] })
  })
})

test('skipping a set shows a Skipped label; unskipping restores the controls', async ({
  page,
}) => {
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByText('Set 1').click()
  await expect(page.getByRole('button', { name: 'Skip set' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip set' }).click()

  const setOneRow = page.getByText('Set 1').locator('..')
  await expect(setOneRow.getByText('Skipped')).toBeVisible()
  await expect(setOneRow.getByPlaceholder('Weight')).toBeHidden()

  await page.getByText('Set 1').click()
  await expect(page.getByRole('button', { name: 'Unskip set' })).toBeVisible()
  await page.getByRole('button', { name: 'Unskip set' }).click()

  await expect(setOneRow.getByText('Skipped')).toBeHidden()
  await expect(setOneRow.getByPlaceholder('Weight')).toBeVisible()
})

test('adding a set then removing it returns to the original set count', async ({ page }) => {
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByRole('button', { name: '+ Add set' }).click()
  await expect(page.getByText('Set 2')).toBeVisible()

  await page.getByText('Set 2').click()
  await expect(page.getByRole('button', { name: 'Remove set' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove set' }).click()

  await expect(page.getByText('Set 2')).toBeHidden()
})

test('"Remove set" is not offered for a non-trailing set', async ({ page }) => {
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByRole('button', { name: '+ Add set' }).click()
  await expect(page.getByText('Set 2')).toBeVisible()

  await page.getByText('Set 1').click()
  await expect(page.getByRole('button', { name: 'Skip set' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove set' })).toBeHidden()
})

test('a Myrep marker set in week 1 shows its badge in week 2 without any action there', async ({
  page,
}) => {
  await page.goto('/workouts/w1d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByText('Set 1').click()
  const markerSaved = page.waitForResponse(
    (res) => res.url().includes('exercise_set_markers') && res.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Myrep', exact: true }).click()
  await markerSaved

  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()
  await expect(page.getByText('M', { exact: true })).toBeVisible()
})

test('a Myrep match set prefills reps from the previous week\'s logged value', async ({
  page,
}) => {
  await page.goto('/workouts/w1d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByText('Set 1').click()
  const markerSaved = page.waitForResponse(
    (res) => res.url().includes('exercise_set_markers') && res.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Myrep match' }).click()
  await markerSaved

  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()
  await expect(page.getByPlaceholder('Reps')).toHaveValue('5')
})
