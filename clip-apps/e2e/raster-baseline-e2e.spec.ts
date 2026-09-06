import { test, expect } from '@playwright/test'

const runBaseline = process.env.E2E_RASTER_BASELINE === '1'

test.describe('raster grip baseline (browser)', () => {
  test.skip(!runBaseline, 'set E2E_RASTER_BASELINE=1 to run slow planar baseline checksum')

  test('planar baseline one-click reaches grip checksum parity', async ({ page }) => {
    test.setTimeout(600_000)

    await page.goto('/raster')
    await expect(page.getByRole('button', { name: /基线一键（STL/ })).toBeVisible()

    await page.getByRole('button', { name: /基线一键（STL/ }).click()

    await expect
      .poll(
        async () => {
          return page.evaluate(() => {
            const s = (window as Window & { __shapeCamRasterParity?: { checksumMatch?: boolean } })
              .__shapeCamRasterParity
            return s?.checksumMatch === true
          })
        },
        { timeout: 540_000, intervals: [2000, 5000, 10000] },
      )
      .toBe(true)
  })
})
