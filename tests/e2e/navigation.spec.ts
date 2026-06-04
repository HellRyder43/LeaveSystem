import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe('Navigation — role-based sidebar', () => {
  test('employee sees common nav items, not management/admin', async ({ page }) => {
    await loginAs(page, 'employee')

    const sidebar = page.locator('aside').first()

    // Common items visible
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'My Leaves' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Team Calendar' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: "Who's Out Today" })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Notifications' })).toBeVisible()

    // Manager/Admin items not visible
    await expect(sidebar.getByRole('link', { name: 'Team Approvals' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Manage Employees' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Leave Types' })).not.toBeVisible()
  })

  test('manager sees common nav + Team Approvals, not admin items', async ({ page }) => {
    await loginAs(page, 'manager')

    const sidebar = page.locator('aside').first()

    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Team Approvals' })).toBeVisible()

    // Admin items not visible
    await expect(sidebar.getByRole('link', { name: 'Manage Employees' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Leave Types' })).not.toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Reports' })).not.toBeVisible()
  })

  test('admin sees common nav + management + all admin items', async ({ page }) => {
    await loginAs(page, 'admin')

    const sidebar = page.locator('aside').first()

    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Team Approvals' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Manage Employees' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Leave Types' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Holiday Calendar' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Leave Policies' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Reports' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Audit Log' })).toBeVisible()
  })

  test('notification bell is visible in navbar', async ({ page }) => {
    await loginAs(page, 'employee')
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible()
  })

  test('hamburger menu button visible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAs(page, 'employee')
    await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
  })

  test('sidebar nav links navigate to correct pages', async ({ page }) => {
    await loginAs(page, 'employee')

    const sidebar = page.locator('aside').first()
    await sidebar.getByRole('link', { name: 'My Leaves' }).click()
    await expect(page).toHaveURL(/\/leaves/)

    await sidebar.getByRole('link', { name: 'Team Calendar' }).click()
    await expect(page).toHaveURL(/\/calendar/)

    await sidebar.getByRole('link', { name: "Who's Out Today" }).click()
    await expect(page).toHaveURL(/\/whos-out/)
  })
})
