import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import { routes } from './routes'

function mainLayoutChildren(): RouteRecordRaw[] {
  expect(routes).toHaveLength(1)
  const root = routes[0]!
  expect(root.path).toBe('/')
  expect(root.children?.length).toBeGreaterThan(0)
  return (root.children ?? []).filter((c): c is RouteRecordRaw => typeof c !== 'string')
}

describe('router.routes', () => {
  it('keeps a single root layout with default redirect to settings', () => {
    const children = mainLayoutChildren()
    const home = children.find((c) => c.path === '')
    expect(home?.redirect).toBe('/settings')
  })

  it('registers expected workspace child paths (migration guard)', () => {
    const paths = new Set(mainLayoutChildren().map((c) => c.path))
    const required = [
      'settings',
      'fdm',
      'config/fdm',
      'devices/fdm',
      'process/fdm',
      'material/fdm',
      'jobs/fdm',
      'jobs/carvera',
      'jobs/gridbot',
      'carvera',
      'gridbot',
      'raster',
      'texturizer',
      'cam',
    ] as const
    for (const p of required) {
      expect(paths.has(p), `missing route path: ${p}`).toBe(true)
    }
  })

  it('uses lazy imports for heavy views except settings/devices/material shells', () => {
    const children = mainLayoutChildren()
    const lazy = (c: RouteRecordRaw) => typeof c.component === 'function'
    expect(lazy(children.find((c) => c.path === 'fdm')!)).toBe(true)
    expect(lazy(children.find((c) => c.path === 'cam')!)).toBe(true)
    const settings = children.find((c) => c.path === 'settings')
    expect(typeof settings?.component).toBe('object')
  })
})
