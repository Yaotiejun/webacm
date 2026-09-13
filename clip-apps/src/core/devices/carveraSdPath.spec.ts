import { describe, expect, it } from 'vitest'
import { CARVERA_SD_GCODES_ROOT, carveraSdPathFromJobName, sanitizeCarveraSdPath } from './carveraSdPath'

describe('carveraSdPath', () => {
  it('forces /sd/gcodes/ root and replaces spaces', () => {
    expect(sanitizeCarveraSdPath('my job.nc')).toBe(`${CARVERA_SD_GCODES_ROOT}my_job.nc`)
    expect(sanitizeCarveraSdPath('/sd/gcodes/a b.nc')).toBe('/sd/gcodes/a_b.nc')
  })

  it('builds path from job name', () => {
    expect(carveraSdPathFromJobName('Cam Job #1')).toBe('/sd/gcodes/Cam_Job_1.nc')
    expect(carveraSdPathFromJobName('tool.gcode')).toBe('/sd/gcodes/tool.gcode')
  })
})
