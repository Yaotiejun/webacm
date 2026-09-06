import { test, expect } from '@playwright/test'

test.describe('raster grip STL load', () => {
  test('loads grip baseline STL and shows vertex counts', async ({ page }) => {
    test.setTimeout(120_000)

    await page.goto('/raster')
    await page.getByRole('button', { name: /grip 基线 STL/i }).click()

    await expect(page.getByTestId('raster-terrain-vertex-count')).toHaveText('75586', {
      timeout: 90_000,
    })
    await expect(page.getByTestId('raster-tool-vertex-count')).toHaveText('960', {
      timeout: 90_000,
    })
  })
})
