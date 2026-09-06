import { test, expect } from '@playwright/test'

test('app shell redirects to settings', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/settings/)
})
