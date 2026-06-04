import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth.helpers'

test.describe('UC001 — Authentication', () => {
  test('login page renders all expected elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('invalid credentials show error banner', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email address').fill('wrong@example.com')
    await page.locator('input#password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.locator('.bg-rose-50').first()).toBeVisible({ timeout: 10_000 })
  })

  test('employee login redirects to /dashboard', async ({ page }) => {
    await loginAs(page, 'employee')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText(/Welcome back/)).toBeVisible()
  })

  test('manager login redirects to /manager', async ({ page }) => {
    await loginAs(page, 'manager')
    await expect(page).toHaveURL(/\/manager/)
  })

  test('admin login redirects to /admin', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL(/\/admin/)
  })

  test('sign out redirects to /login', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('forgot password page loads at /reset-password', async ({ page }) => {
    await page.goto('/reset-password')
    // Should not redirect to login (it's a public page)
    await expect(page).toHaveURL(/reset-password/)
  })

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('employee cannot access /manager/approvals', async ({ page }) => {
    await loginAs(page, 'employee')
    await page.goto('/manager/approvals')
    // Should redirect away — back to dashboard or login
    await expect(page).not.toHaveURL(/\/manager\/approvals/, { timeout: 10_000 })
  })
})
