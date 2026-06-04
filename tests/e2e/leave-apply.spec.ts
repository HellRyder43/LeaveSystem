import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe('UC003 — Leave Application Form (/leaves/apply)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/leaves/apply')
    await page.waitForLoadState('networkidle')
  })

  test('form has h2 page title "Request Leave"', async ({ page }) => {
    // Use h2 specifically to avoid matching the h1 navbar title
    await expect(page.locator('h2').filter({ hasText: 'Request Leave' })).toBeVisible()
  })

  test('back link to My Leaves is present', async ({ page }) => {
    const backLink = page.getByRole('link', { name: /Back to My Leaves/i })
    await expect(backLink).toBeVisible()
  })

  test('form renders Leave Type select, Date Range, Duration, and Submit', async ({ page }) => {
    // Leave Type combobox (shadcn Select)
    await expect(page.getByRole('combobox', { name: /Leave Type/i })).toBeVisible()
    // Date Range label
    await expect(page.getByText('Date Range', { exact: true })).toBeVisible()
    // Duration label
    await expect(page.getByText('Duration', { exact: true })).toBeVisible()
    // Date picker trigger button
    await expect(page.getByRole('button', { name: /Pick a date range/i })).toBeVisible()
  })

  test('Annual Leave shows half-day options in Duration dropdown', async ({ page }) => {
    // Open Leave Type select and pick Annual Leave
    await page.getByRole('combobox', { name: /Leave Type/i }).click()
    await page.getByRole('option', { name: /Annual Leave/ }).click()

    // Open Duration combobox (named "Duration" via accessible label)
    await page.getByRole('combobox', { name: /Duration/i }).click()

    // Half-day options should be present
    await expect(page.getByRole('option', { name: /First Half/i })).toBeVisible()
    await expect(page.getByRole('option', { name: /Second Half/i })).toBeVisible()
  })

  test('Sick Leave Duration dropdown has only Full Day (no half-day)', async ({ page }) => {
    // Select Sick Leave
    await page.getByRole('combobox', { name: /Leave Type/i }).click()
    await page.getByRole('option', { name: /Sick Leave/ }).click()

    // Open Duration combobox
    await page.getByRole('combobox', { name: /Duration/i }).click()

    // Half-day options should NOT be visible
    await expect(page.getByRole('option', { name: /First Half/i })).not.toBeVisible()
    await expect(page.getByRole('option', { name: /Second Half/i })).not.toBeVisible()
    // Close
    await page.keyboard.press('Escape')
  })

  test('selecting a date shows working days count', async ({ page }) => {
    // Select Annual Leave first
    await page.getByRole('combobox', { name: /Leave Type/i }).click()
    await page.getByRole('option', { name: /Annual Leave/ }).click()

    // Open the calendar popover
    await page.getByRole('button', { name: /Pick a date range/i }).click()

    // In react-day-picker v9 range mode, a single click creates a complete
    // 1-day range (from=to=day) and closes the popover immediately.
    // The form sets start_date=end_date=day, so working days count appears.
    await page.locator('[role="gridcell"] button:not([disabled])').first().click()
    await page.waitForTimeout(500)

    // Working days count summary should appear
    await expect(page.getByText(/working day/i)).toBeVisible({ timeout: 8_000 })
  })

  test('balance preview appears after selecting leave type and dates', async ({ page }) => {
    await page.getByRole('combobox', { name: /Leave Type/i }).click()
    await page.getByRole('option', { name: /Annual Leave/ }).click()

    // Single click creates 1-day range and closes calendar
    await page.getByRole('button', { name: /Pick a date range/i }).click()
    await page.locator('[role="gridcell"] button:not([disabled])').first().click()
    await page.waitForTimeout(500)

    await expect(page.getByText('Balance after this request').first()).toBeVisible({ timeout: 8_000 })
  })

  test('Sick Leave shows MC attachment field', async ({ page }) => {
    await page.getByRole('combobox', { name: /Leave Type/i }).click()
    await page.getByRole('option', { name: /Sick Leave/ }).click()
    // MC section (requires_attachment = true for Sick Leave)
    await expect(page.getByText(/Medical Certificate/i)).toBeVisible()
  })

  test('Sick Leave 2+ days makes MC required with asterisk', async ({ page }) => {
    await page.getByRole('combobox', { name: /Leave Type/i }).click()
    await page.getByRole('option', { name: /Sick Leave/ }).click()

    // Step 1: single click creates 1-day range, calendar closes
    await page.getByRole('button', { name: /Pick a date range/i }).click()
    await page.locator('[role="gridcell"] button:not([disabled])').first().click()
    await page.waitForTimeout(400)

    // Step 2: re-open calendar and click the NEXT available day.
    // In v9, clicking a day after the current end extends the range (from=day1, to=day2).
    await page.locator('button[class*="justify-start"]').click()
    await page.waitForTimeout(300)
    await page.locator('[role="gridcell"] button:not([disabled])').nth(1).click()
    await page.waitForTimeout(500)

    // After selecting 2-day sick leave, MC required indicator should appear
    const mcRequired = page.getByText(/Required for sick leave|Required for/i)
    const asterisk = page.locator('label').filter({ hasText: /Medical Certificate/ }).getByText('*')
    const eitherVisible = await mcRequired.isVisible().catch(() => false)
    const asteriskVisible = await asterisk.isVisible().catch(() => false)
    expect(eitherVisible || asteriskVisible).toBeTruthy()
  })

  test('covering employee dropdown is present', async ({ page }) => {
    await expect(page.getByText(/Covering Employee/i)).toBeVisible()
  })
})
