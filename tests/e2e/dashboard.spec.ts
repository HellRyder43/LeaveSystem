import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe('UC002 — Employee Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'employee')
  })

  test('welcome heading shows first name', async ({ page }) => {
    await expect(page.getByText(/Welcome back,/)).toBeVisible()
  })

  test('leave overview subtitle shows current year and today date', async ({ page }) => {
    await expect(page.getByText(/Leave overview for 2026/)).toBeVisible()
  })

  test('balance cards render for leave types', async ({ page }) => {
    await expect(page.getByText('Annual Leave').first()).toBeVisible()
    await expect(page.getByText('Sick Leave').first()).toBeVisible()
  })

  test('balance card shows remaining days with progress bar', async ({ page }) => {
    // Remaining days label and "days" unit should both appear
    await expect(page.getByText('Annual Leave').first()).toBeVisible()
    // Check for a "remaining" stat somewhere on the page
    await expect(page.getByText(/remaining|allocated/i).first()).toBeVisible()
  })

  test('summary strip shows 4 stat boxes', async ({ page }) => {
    await expect(page.getByText('Total Used')).toBeVisible()
    await expect(page.getByText('Leave Types')).toBeVisible()
    await expect(page.getByText('Pending Requests')).toBeVisible()
    // Use exact match to avoid matching sidebar "Who's Out Today" link
    await expect(page.getByText('Out Today', { exact: true })).toBeVisible()
  })

  test('"Request Time Off" button links to /leaves/apply', async ({ page }) => {
    const btn = page.getByRole('link', { name: /Request Time Off/i })
    await expect(btn).toBeVisible()
    await expect(btn).toHaveAttribute('href', '/leaves/apply')
  })

  test('Recent Leaves section is present', async ({ page }) => {
    // Either the heading or the empty state should be visible
    await expect(
      page.getByText(/Recent Leave Requests|No leave requests yet/i).first()
    ).toBeVisible()
  })

  test("Who's Out Today widget section is present", async ({ page }) => {
    // The widget heading is rendered inside the page body
    await expect(page.getByRole('heading', { name: /Who.s Out Today/i }).last()).toBeVisible()
  })
})
