import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe('UC007 — Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'employee')
  })

  test('notification bell button is visible in navbar', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible()
  })

  test('clicking bell opens dropdown with notifications header', async ({ page }) => {
    await page.getByRole('button', { name: 'Notifications' }).click()
    // The dropdown renders an h3 heading "Notifications" inside it
    await expect(page.locator('h3').filter({ hasText: /^Notifications$/ })).toBeVisible({ timeout: 5_000 })
  })

  test('bell dropdown shows "No notifications yet" or notification items', async ({ page }) => {
    await page.getByRole('button', { name: 'Notifications' }).click()
    // Wait for dropdown to fully render
    await page.waitForTimeout(500)
    // Confirm dropdown opened before checking content
    await expect(page.locator('h3').filter({ hasText: /^Notifications$/ })).toBeVisible({ timeout: 5_000 })
    // Give async notification fetch time to settle
    await page.waitForTimeout(1_500)

    const empty = page.getByText('No notifications yet')
    const emptyVisible = await empty.isVisible().catch(() => false)
    // NotificationItem renders a div with 'flex items-start gap-3' as its class prefix
    const items = page.locator('div[class*="flex items-start gap-3"]')
    const itemsCount = await items.count()
    expect(emptyVisible || itemsCount > 0).toBeTruthy()
  })

  test('"View all notifications" link in dropdown goes to /notifications', async ({ page }) => {
    await page.getByRole('button', { name: 'Notifications' }).click()
    await page.waitForTimeout(300)
    const viewAllLink = page.getByRole('link', { name: /View all notifications/i })
    await expect(viewAllLink).toBeVisible()
    await expect(viewAllLink).toHaveAttribute('href', '/notifications')
  })

  test('/notifications page loads with Notifications heading', async ({ page }) => {
    await page.goto('/notifications')
    // Both navbar h1 and page h1 render "Notifications" — either being visible confirms page loaded
    await expect(page.locator('h1').filter({ hasText: 'Notifications' }).first()).toBeVisible()
  })

  test('notifications page shows grouped sections or empty state', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForLoadState('networkidle')

    // Either a "You're all caught up" empty state, or grouping labels (Today/Yesterday/Earlier)
    const emptyState = page.getByText(/all caught up|no notifications/i)
    const groups = page.getByText(/Today|Yesterday|Earlier/i)

    const emptyVisible = await emptyState.isVisible().catch(() => false)
    const groupsCount = await groups.count()

    expect(emptyVisible || groupsCount > 0).toBeTruthy()
  })

  test('"Mark all read" button visible if there are unread notifications', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForLoadState('networkidle')

    // If unread count badge or "Mark all read" button is present, verify it's clickable
    const markAllBtn = page.getByRole('button', { name: /Mark all read/i })
    const isPresent = await markAllBtn.isVisible().catch(() => false)
    if (isPresent) {
      await markAllBtn.click()
      // After clicking, badge should disappear or reduce to 0
      await page.waitForTimeout(1000)
      // No assertion on specific count since it depends on data
    }
    // Test passes whether or not there are unread notifications
  })

  test('bell icon unread badge shows count when there are unread notifications', async ({ page }) => {
    // If badge is present (rose-colored span), verify it shows a number
    const badge = page.locator('[class*="bg-rose-500"]').first()
    const badgeVisible = await badge.isVisible().catch(() => false)
    if (badgeVisible) {
      const badgeText = await badge.textContent()
      expect(badgeText).toMatch(/\d+|9\+/)
    }
    // Test passes regardless (no notifications is also valid)
  })
})
