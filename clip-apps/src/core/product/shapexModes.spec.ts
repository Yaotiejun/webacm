import { describe, expect, it } from 'vitest'
import {
  isPrimaryShapexMode,
  kiriModeDirFor,
  SHAPEX_DEFERRED_MODES,
  SHAPEX_PRIMARY_MODES,
} from './shapexModes'

describe('shapexModes', () => {
  it('lists FDM CAM LASER SLA as primary', () => {
    expect([...SHAPEX_PRIMARY_MODES]).toEqual(['FDM', 'CAM', 'LASER', 'SLA'])
    expect(isPrimaryShapexMode('LASER')).toBe(true)
    expect(isPrimaryShapexMode('WJET')).toBe(false)
    expect(SHAPEX_DEFERRED_MODES).toContain('DRAG')
  })

  it('maps to Kiri mode directories', () => {
    expect(kiriModeDirFor('LASER')).toBe('laser')
    expect(kiriModeDirFor('SLA')).toBe('sla')
    expect(kiriModeDirFor('CAM')).toBe('cam')
  })
})
