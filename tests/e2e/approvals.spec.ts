import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe('UC005 — Approvals Dashboard', () => {
  test('employee cannot access /manager/approvals — gets redirected', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/manager/approvals')
    // Must not land on the approvals page
    await expect(page).not.toHaveURL(/\/manager\/approvals$/, { timeout: 10_000 })
  })

  test.describe('as Manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager')
      await page.goto('/manager/approvals')
      await page.waitForLoadState('networkidle')
    })

    test('approvals page loads with heading', async ({ page }) => {
      // Page title in the navbar
      await expect(page.getByText(/Team Approvals|Pending Approvals/i).first()).toBeVisible()
    })

    test('stats bar shows pending count', async ({ page }) => {
      await expect(page.getByText(/pending/i).first()).toBeVisible()
    })

    test('search input is present', async ({ page }) => {
      await expect(page.getByPlaceholder(/Search by name or leave type/i)).toBeVisible()
    })

    test('select-all button is visible', async ({ page }) => {
      await expect(page.getByText(/Select all/i)).toBeVisible()
    })

    test('empty state shows "All caught up!" when no requests', async ({ page }) => {
      // If no pending requests, the empty state is rendered
      const emptyState = page.getByText("All caught up!")
      const cards = page.locator('[class*="grid"] > div')
      const cardCount = await cards.count()
      if (cardCount === 0) {
        await expect(emptyState).toBeVisible()
      } else {
        // At least one card exists
        await expect(cards.first()).toBeVisible()
      }
    })

    test('approval card shows employee info when requests exist', async ({ page }) => {
      const cards = page.locator('[class*="grid"] > div')
      const count = await cards.count()
      if (count > 0) {
        // Each card should show leave dates
        await expect(cards.first().getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).toBeVisible()
      }
    })

    test('reject button opens dialog requiring a comment', async ({ page }) => {
      const cards = page.locator('[class*="grid"] > div')
      const count = await cards.count()
      if (count > 0) {
        const rejectBtn = cards.first().getByRole('button', { name: /Reject/i })
        if (await rejectBtn.isVisible()) {
          await rejectBtn.click()
          // RejectDialog should open with a textarea/input
          await expect(page.getByRole('dialog')).toBeVisible()
          await expect(page.getByRole('dialog').getByRole('textbox')).toBeVisible()
        }
      }
    })

    test('bulk approve button appears after selecting a card', async ({ page }) => {
      const checkboxes = page.locator('input[type="checkbox"]')
      const count = await checkboxes.count()
      if (count > 0) {
        await checkboxes.first().check()
        await expect(page.getByRole('button', { name: /Approve \d+/i })).toBeVisible()
      }
    })
  })

  test.describe('as Admin', () => {
    test('admin can access /manager/approvals', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.goto('/manager/approvals')
      await page.waitForLoadState('networkidle')
      await expect(page).toHaveURL(/\/manager\/approvals/)
      await expect(page.getByText(/Team Approvals|Pending Approvals/i).first()).toBeVisible()
    })
  })
})
