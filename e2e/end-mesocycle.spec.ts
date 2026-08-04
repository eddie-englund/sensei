import { test, expect } from '@playwright/test'
import { mockAuthedSession, mockWorkoutsApi, mesocyclePatches } from './support/mockSupabase'

test.beforeEach(async ({ page }) => {
  await mockAuthedSession(page)
  await mockWorkoutsApi(page)
})

test('workout header menu ends the mesocycle after a double confirm', async ({ page }) => {
  await page.goto('/workouts/w2d2')
  await expect(page.getByRole('heading', { name: 'Pull' })).toBeVisible()

  await page.getByRole('button', { name: 'Mesocycle options' }).click()
  await expect(page.getByText('Mesocycle options')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit mesocycle length' })).toHaveCount(0)

  await page.getByRole('button', { name: 'End mesocycle' }).click()

  const firstDialog = page.getByRole('alertdialog')
  await expect(firstDialog.getByText('End mesocycle early?')).toBeVisible()
  await firstDialog.getByRole('button', { name: 'End mesocycle' }).click()

  const secondDialog = page.getByRole('alertdialog')
  await expect(secondDialog.getByText('Are you sure?')).toBeVisible()
  await secondDialog.getByRole('button', { name: 'Yes, end it' }).click()

  await expect(page).toHaveURL('/')
  expect(mesocyclePatches).toEqual([{ is_active: false }])
})

test('workout list settings menu offers both edit-length and end-mesocycle', async ({ page }) => {
  await page.goto('/workouts/list')
  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible()

  await page.getByRole('button', { name: 'Mesocycle options' }).click()
  await expect(page.getByRole('button', { name: 'Edit mesocycle length' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'End mesocycle' })).toBeVisible()

  await page.getByRole('button', { name: 'Edit mesocycle length' }).click()

  await expect(page.getByText('Mesocycle options')).toBeHidden()
  await expect(page.getByText('Mesocycle length')).toBeVisible()
  expect(mesocyclePatches).toHaveLength(0)
})
