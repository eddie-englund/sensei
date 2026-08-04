import { test, expect } from '@playwright/test'
import { mockAuthedSession, mockWorkoutsApi } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockAuthedSession(page)
  await mockWorkoutsApi(page)
  await page.route('**/rest/v1/workout_sets*', (route) => route.fulfill({ json: [] }))
})

test('adding a week-only note shows it truncated on the exercise and lets you edit it', async ({
  page,
}) => {
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.locator('section').getByText('Bench Press')).toBeVisible()

  await page.getByPlaceholder('Note for this exercise…').fill('Elbows tucked, slow eccentric')
  await page.getByRole('button', { name: 'Save' }).click()

  const noteButton = page.getByRole('button', { name: 'Elbows tucked, slow eccentric' })
  await expect(noteButton).toBeVisible()

  await noteButton.click()
  await expect(page.getByPlaceholder('Note for this exercise…')).toHaveValue(
    'Elbows tucked, slow eccentric',
  )
})

test('pinning a note makes it show on every week; unpinning removes it elsewhere', async ({
  page,
}) => {
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByPlaceholder('Note for this exercise…').fill('Use straps')
  await page.getByLabel('Pin to exercise — show every week').check()
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByRole('button', { name: /📌 Use straps/ })).toBeVisible()

  // Same exercise, different week — the pinned note should follow it there.
  await page.goto('/workouts/w1d1')
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible()
  await expect(page.getByRole('button', { name: /📌 Use straps/ })).toBeVisible()

  await page.getByRole('button', { name: /📌 Use straps/ }).click()
  await expect(page.getByLabel('Pin to exercise — show every week')).toBeChecked()
  await page.getByLabel('Pin to exercise — show every week').uncheck()
  await page.getByRole('button', { name: 'Save' }).click()

  // Un-pinning from week 1 converts it into week 1's own note...
  await expect(page.getByRole('button', { name: 'Use straps', exact: true })).toBeVisible()

  // ...and it disappears from week 2, which no longer has any note.
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible()
})
