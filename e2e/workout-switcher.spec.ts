import { test, expect } from '@playwright/test'
import { mockAuthedSession, mockWorkoutsApi } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockAuthedSession(page)
  await mockWorkoutsApi(page)
})

test('calendar icon opens the workout switcher and jumps to another workout', async ({ page }) => {
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByRole('button', { name: 'Jump to workout' }).click()
  await expect(page.getByText('Jump to workout')).toBeVisible()

  await expect(page.getByRole('button', { name: 'Week 1 Day 1 — complete' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Week 1 Day 2 — complete' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Week 2 Day 1 — complete' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Week 2 Day 2 — current' })).toBeVisible()

  await page.getByRole('button', { name: 'Week 1 Day 1 — complete' }).click()

  await expect(page).toHaveURL(/\/workouts\/w1d1$/)
  await expect(page.getByText('Jump to workout')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Push' })).toBeVisible()
})
