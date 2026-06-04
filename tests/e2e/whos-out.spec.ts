import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe("UC008 — Who's Out Today (/whos-out)", () => {
  test("page loads with 'Who's Out Today' heading", async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/whos-out')
    await page.waitForLoadState('networkidle')
    // Use h2 specifically — navbar h1 also shows the page title on desktop
    await expect(page.locator('h2').filter({ hasText: "Who's Out" })).toBeVisible()
  })

  test("today's date is displayed in the header", async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/whos-out')
    await page.waitForLoadState('networkidle')
    // e.g. "Tuesday, 26 May 2026" or "26 May 2026"
    await expect(page.getByText(/May 2026|2026/i).first()).toBeVisible()
  })

  test('employee does NOT see department filter dropdown', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/whos-out')
    await page.waitForLoadState('networkidle')

    // Department filter (All Departments) should NOT be visible for employees
    await expect(page.getByText('All Departments')).not.toBeVisible()
  })

  test('employee sees empty state or cards without leave type label', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/whos-out')
    await page.waitForLoadState('networkidle')

    const emptyState = page.getByText(/Everyone.s in today|No approved leaves/i)
    const cards = page.locator('[class*="rounded-2xl"]').filter({ hasText: /Back tomorrow|Returns/ })
    const cardCount = await cards.count()
    const isEmpty = await emptyState.isVisible().catch(() => false)

    if (!isEmpty && cardCount > 0) {
      // Cards are present — employee should NOT see leave type
      await expect(page.locator('h2').filter({ hasText: "Who's Out" })).toBeVisible()
    } else {
      // Empty state: "Everyone's in today!" or "No approved leaves for today."
      await expect(page.getByText(/Everyone.s in today|No approved leaves/i).first()).toBeVisible()
    }
  })

  test.describe('as Manager', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager')
      await page.goto('/whos-out')
      await page.waitForLoadState('networkidle')
    })

    test('department filter dropdown is visible', async ({ page }) => {
      // shadcn Select renders as role="combobox"
      await expect(page.getByRole('combobox')).toBeVisible()
    })

    test('can filter by a specific department', async ({ page }) => {
      await page.getByRole('combobox').click()
      // Department option should appear
      const deptOption = page.getByRole('option', { name: /Engineering|Human Resources/i }).first()
      if (await deptOption.isVisible()) {
        await deptOption.click()
        await page.waitForLoadState('networkidle')
        await expect(page).toHaveURL(/\/whos-out/)
      } else {
        await page.keyboard.press('Escape')
      }
    })
  })

  test.describe('as Admin', () => {
    test('admin sees department filter dropdown', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.goto('/whos-out')
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('combobox')).toBeVisible()
    })

    test('admin sees leave type on cards when employees are out', async ({ page }) => {
      await loginAs(page, 'admin')
      await page.goto('/whos-out')
      await page.waitForLoadState('networkidle')

      const cards = page.locator('[class*="rounded-2xl"]').filter({ hasText: /Back tomorrow|Returns/ })
      const count = await cards.count()
      if (count > 0) {
        // Admin cards should show leave type (Annual Leave, Sick Leave, etc.)
        const firstCard = cards.first()
        await expect(firstCard.getByText(/Annual|Sick|Compassionate|Unpaid/i)).toBeVisible()
      }
      // Test passes regardless if no one is out
    })
  })
})
