import { describe, expect, it } from 'vitest'
import { evaluateDeviceBridgeMigrationComplete } from './deviceBridgeMigrationComplete'

describe('deviceBridgeMigrationComplete', () => {
  it('device-bridge source stays aligned with migration constants', () => {
    const r = evaluateDeviceBridgeMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
  })
})
