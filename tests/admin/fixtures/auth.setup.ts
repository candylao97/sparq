/**
 * auth.setup.ts
 *
 * Runs ONCE before all browser tests.
 * Logs in as each role and saves the auth cookie to .auth/<role>.json
 * so every test worker can reuse authenticated sessions.
 *
 * Roles created in prisma/seed.ts:
 *   admin@sparq.com.au  / admin123456   → role: ADMIN
 *   ops@sparq.com.au    / ops123456     → role: OPS      (add to seed if missing)
 *   support@sparq.com.au/ support123456 → role: SUPPORT  (add to seed if missing)
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_DIR = path.resolve(__dirname, '../.auth')

const ROLES = [
  { name: 'admin',   email: 'admin@sparq.com.au',    password: 'admin123456' },
  { name: 'ops',     email: 'ops@sparq.com.au',       password: 'ops123456' },
  { name: 'support', email: 'support@sparq.com.au',   password: 'support123456' },
] as const

// Ensure .auth directory exists
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

for (const role of ROLES) {
  setup(`authenticate as ${role.name}`, async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill(role.email)
    await page.getByLabel(/password/i).fill(role.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for redirect away from /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })

    // Persist the authenticated session
    await page.context().storageState({
      path: path.join(AUTH_DIR, `${role.name}.json`),
    })
  })
}
