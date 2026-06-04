import type { Page } from '@playwright/test'

export type Role = 'admin' | 'manager' | 'employee' | 'hrmanager'

const CREDENTIALS: Record<Role, { email: string; password: string }> = {
  admin:     { email: 'admin@leavesystem.com',     password: 'Admin1234!' },
  manager:   { email: 'manager@leavesystem.com',   password: 'Manager1234!' },
  employee:  { email: 'employee1@leavesystem.com', password: 'Employee1234!' },
  hrmanager: { email: 'hrmanager@leavesystem.com', password: 'Manager1234!' },
}

export const HOME: Record<Role, string> = {
  admin:     '/admin',
  manager:   '/manager',
  employee:  '/dashboard',
  hrmanager: '/manager',
}

export async function loginAs(page: Page, role: Role) {
  const { email, password } = CREDENTIALS[role]
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  // Use exact match to avoid matching the "Show password" toggle button
  await page.locator('input#password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(`**${HOME[role]}**`, { timeout: 30_000 })
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL('**/login**', { timeout: 10_000 })
}
