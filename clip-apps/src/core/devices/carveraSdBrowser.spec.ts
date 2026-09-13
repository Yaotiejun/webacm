import { describe, expect, it } from 'vitest'
import {
  formatCarveraSdBreadcrumb,
  isCarveraSdDirName,
  joinCarveraSdPath,
  parentCarveraSdPath,
} from './carveraSdBrowser'

describe('carveraSdBrowser', () => {
  it('detects dirs and joins paths', () => {
    expect(isCarveraSdDirName('gcodes/')).toBe(true)
    expect(isCarveraSdDirName('a.nc')).toBe(false)
    expect(joinCarveraSdPath('/sd', 'gcodes/')).toBe('/sd/gcodes')
    expect(joinCarveraSdPath('/sd/gcodes', 'job.nc')).toBe('/sd/gcodes/job.nc')
    expect(parentCarveraSdPath('/sd/gcodes')).toBe('/sd')
    expect(parentCarveraSdPath('/sd')).toBe('/')
    expect(formatCarveraSdBreadcrumb(['sd', 'gcodes'])).toBe('/sd/gcodes')
  })
})
