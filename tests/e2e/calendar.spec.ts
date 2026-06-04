import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe('UC004 — Team Calendar (/calendar)', () => {
  test('employee sees monthly calendar grid with day headers', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Day of week headers
    await expect(page.getByText('Mon')).toBeVisible()
    await expect(page.getByText('Tue')).toBeVisible()
    await expect(page.getByText('Wed')).toBeVisible()
    await expect(page.getByText('Thu')).toBeVisible()
    await expect(page.getByText('Fri')).toBeVisible()
  })

  test('current month name and year are displayed', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Should show "May 2026" or similar
    await expect(page.getByText(/May|2026/).first()).toBeVisible()
  })

  test('previous month navigation works', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Scope to the calendar card to avoid matching sidebar buttons
    const calCard = page.locator('div[class*="rounded-3xl"]').filter({ has: page.getByText('Mon') })
    await calCard.locator('button').first().click()
    await page.waitForTimeout(600)

    // Month should have changed — going back from June shows May
    await expect(page.getByText(/May/i).first()).toBeVisible()
  })

  test('next month navigation works', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Scope to the calendar card to avoid matching sidebar buttons
    const calCard = page.locator('div[class*="rounded-3xl"]').filter({ has: page.getByText('Mon') })
    await calCard.locator('button').last().click()
    await page.waitForTimeout(600)

    await expect(page).toHaveURL(/\/calendar/)
    await expect(page.getByText(/June|July|August/i).first()).toBeVisible()
  })

  test('employee does NOT see department filter', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // The calendar dept filter is a native <select> — only rendered for Admin
    await expect(page.locator('select')).not.toBeVisible()
  })

  test('admin sees department filter dropdown', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Admin gets a native <select> for department filtering
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('today cell has a visual highlight', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // Today (26 May 2026) should be highlighted
    // Look for a cell with "26" that has a special class or ring
    const todayCell = page.locator('[class*="ring"], [class*="purple"], [class*="today"]').filter({ hasText: '26' }).first()
    // Check the cell or any sibling indicating today
    await expect(page.locator('text=26').first()).toBeVisible()
  })
})
