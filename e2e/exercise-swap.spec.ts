import { test, expect } from '@playwright/test'
import { mockAuthedSession, mockExerciseSwapApi } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockAuthedSession(page)
  await mockExerciseSwapApi(page)
})

async function swapCurrentExercise(page: import('@playwright/test').Page, scopeLabel: string) {
  await page.getByRole('button', { name: 'Exercise options' }).click()
  await page.getByRole('button', { name: 'Swap exercise' }).click()
  await page.getByRole('button', { name: 'Select exercise' }).click()
  await page.getByRole('button', { name: 'Squat', exact: true }).click()
  await page.getByLabel(scopeLabel).check()
  await page.getByRole('button', { name: 'Swap exercise' }).click()
}

test('swapping for this week only leaves other weeks untouched', async ({ page }) => {
  await page.goto('/workouts/sw2d1')
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible()
  await expect(page.getByText('Bench Press')).toBeVisible()

  await swapCurrentExercise(page, 'This week only')

  await expect(page.getByText('Squat')).toBeVisible()
  await expect(page.getByText('Bench Press')).toBeHidden()

  await page.goto('/workouts/sw3d1')
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible()
  await expect(page.getByText('Bench Press')).toBeVisible()

  await page.goto('/workouts/sw1d1')
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible()
  await expect(page.getByText('Bench Press')).toBeVisible()
})

test('swapping for the rest of the mesocycle propagates forward but not to past weeks', async ({
  page,
}) => {
  await page.goto('/workouts/sw2d1')
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible()

  await swapCurrentExercise(page, 'This week and the rest of the mesocycle')

  await expect(page.getByText('Squat')).toBeVisible()

  await page.goto('/workouts/sw3d1')
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible()
  await expect(page.getByText('Squat')).toBeVisible()

  await page.goto('/workouts/sw1d1')
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible()
  await expect(page.getByText('Bench Press')).toBeVisible()
})
