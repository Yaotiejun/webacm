import { test, expect } from '@playwright/test'

test.describe('migration workspaces smoke', () => {
  test('raster workspace loads baseline controls', async ({ page }) => {
    await page.goto('/raster')
    await expect(page.getByRole('button', { name: /生成栅格刀路/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /grip 基线 STL/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /radial 基线一键/ })).toBeVisible()
  })

  test('cam workspace loads legacy run control', async ({ page }) => {
    await page.goto('/cam')
    await expect(page.getByRole('button', { name: /生成 CAM 刀路/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /对比金样 motion/ })).toBeVisible()
  })

  test('texturizer workspace loads run control', async ({ page }) => {
    await page.goto('/texturizer')
    await expect(page.getByRole('button', { name: /导入 STL/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /grip 默认参数/i })).toBeVisible()
  })

  test('gridbot workspace loads g-code import', async ({ page }) => {
    await page.goto('/gridbot')
    await expect(page.getByRole('button', { name: /导入 G-code/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'G28' })).toBeVisible()
    await expect(page.getByRole('button', { name: /发送当前 G-code/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'M112' })).toBeVisible()
  })

  test('carvera workspace loads g-code import', async ({ page }) => {
    await page.goto('/carvera')
    await expect(page.getByRole('button', { name: /导入 G-code/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /暂停发送/ })).toBeVisible()
  })

  test('fdm workspace loads slice control', async ({ page }) => {
    await page.goto('/fdm')
    await expect(page.getByRole('button', { name: '切片' })).toBeVisible()
  })

  test('laser workspace loads import and slice controls', async ({ page }) => {
    await page.goto('/laser')
    await expect(page.getByRole('button', { name: /导入 SVG\/DXF/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'slice' })).toBeVisible()
  })

  test('sla workspace loads import and slice controls', async ({ page }) => {
    await page.goto('/sla')
    await expect(page.getByRole('button', { name: /Import STL\/OBJ/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'slice' })).toBeVisible()
  })
})
