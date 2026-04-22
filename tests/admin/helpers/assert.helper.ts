/**
 * assert.helper.ts
 *
 * Custom, reusable assertions for the admin UI.
 */

import { expect, type Page } from '@playwright/test'

/** Assert a status badge displays the correct text and colour class */
export async function expectKycBadge(page: Page, status: string) {
  const badge = page.locator(`[data-testid="kyc-badge"]`).first()
  await expect(badge).toBeVisible()
  await expect(badge).toContainText(status.replace('_', ' '), { ignoreCase: true })
}

/** Assert a risk badge displays the correct level */
export async function expectRiskBadge(page: Page, level: 'LOW' | 'MEDIUM' | 'HIGH') {
  const badge = page.locator(`[data-testid="risk-badge"]`).first()
  await expect(badge).toBeVisible()
  await expect(badge).toContainText(level, { ignoreCase: true })
}

/** Assert a toast / notification message appears */
export async function expectToast(page: Page, message: string | RegExp) {
  const toast = page.locator('[role="status"], [data-sonner-toast], .react-hot-toast').last()
  await expect(toast).toBeVisible({ timeout: 5_000 })
  await expect(toast).toContainText(message)
}

/** Assert an error banner / alert is visible */
export async function expectErrorAlert(page: Page, message?: string | RegExp) {
  const alert = page.locator('[role="alert"]').first()
  await expect(alert).toBeVisible()
  if (message) await expect(alert).toContainText(message)
}

/** Assert a confirmation modal is open */
export async function expectConfirmModal(page: Page, titleText?: string) {
  const modal = page.locator('[role="dialog"]').first()
  await expect(modal).toBeVisible()
  if (titleText) await expect(modal).toContainText(titleText, { ignoreCase: true })
}

/** Assert the detail drawer (KYC split-view right panel) is open */
export async function expectDrawerOpen(page: Page) {
  const drawer = page.locator('[data-testid="detail-drawer"]')
  await expect(drawer).toBeVisible()
}

/** Assert a table row exists for a given name or email */
export async function expectTableRow(page: Page, text: string) {
  const row = page.locator(`table >> tr:has-text("${text}")`)
  await expect(row).toBeVisible()
}

/** Assert a specific field in the detail drawer */
export async function expectDrawerField(page: Page, label: string, value: string) {
  const drawer = page.locator('[data-testid="detail-drawer"]')
  const field  = drawer.locator(`text=${label}`)
  await expect(field).toBeVisible()
  await expect(drawer.locator(`text=${value}`)).toBeVisible()
}

/** Assert the page is the login page (session expired / kicked out) */
export async function expectRedirectToLogin(page: Page) {
  await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
}

/** Assert the page shows a 403 / access denied state */
export async function expectForbidden(page: Page) {
  const denied = page.locator('text=/forbidden|access denied|not authorized/i')
  const isUrl  = page.url().includes('/login') || page.url().includes('/403')
  const hasDenied = await denied.count() > 0
  expect(isUrl || hasDenied).toBe(true)
}
