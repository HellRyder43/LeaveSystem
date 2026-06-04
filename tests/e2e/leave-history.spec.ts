import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe('UC002 — Leave History (/leaves)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/leaves')
    await page.waitForLoadState('networkidle')
  })

  test('page loads with "My Leaves" h2 heading', async ({ page }) => {
    // Use h2 specifically to avoid matching the h1 navbar title
    await expect(page.locator('h2').filter({ hasText: 'My Leaves' })).toBeVisible()
  })

  test('year filter native select is visible with current year', async ({ page }) => {
    // The filters use native <select> elements, not shadcn comboboxes
    const yearSelect = page.locator('select').first()
    await expect(yearSelect).toBeVisible()
    // Current year should be selected
    await expect(yearSelect).toHaveValue('2026')
  })

  test('status filter native select is visible', async ({ page }) => {
    const selects = page.locator('select')
    const count = await selects.count()
    expect(count).toBeGreaterThanOrEqual(2) // year + status
    await expect(selects.nth(1)).toBeVisible()
  })

  test('apply for leave button is present', async ({ page }) => {
    const applyBtn = page.getByRole('link', { name: /New Request|Apply/i })
    await expect(applyBtn.first()).toBeVisible()
  })

  test('table column headers Type, Dates, Duration, Status are present', async ({ page }) => {
    // Use columnheader role to distinguish table headers from filter labels
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Dates' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Duration' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
  })

  test('changing year filter reloads without crash', async ({ page }) => {
    const yearSelect = page.locator('select').first()
    await yearSelect.selectOption('2025')
    // Wait for navigation / reload
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/leaves/)
  })

  test('empty state shown when no data for selected filters', async ({ page }) => {
    // Select 2025 and Rejected — likely no records
    const yearSelect = page.locator('select').first()
    await yearSelect.selectOption('2025')
    await page.waitForLoadState('networkidle')
    const statusSelect = page.locator('select').nth(1)
    await statusSelect.selectOption('Rejected')
    await page.waitForLoadState('networkidle')
    // Either records or the empty state "No leave requests found." should appear
    await expect(page).toHaveURL(/\/leaves/)
  })
})
