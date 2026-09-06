import { describe, expect, it } from 'vitest'
import { formatGridbotAdvancedOk, parseGridbotLineNo } from './deviceBridgeGridbotProtocol'

describe('deviceBridgeGridbotProtocol', () => {
  it('formatGridbotAdvancedOk matches device-bridge mock contract', () => {
    expect(parseGridbotLineNo('N42 G1')).toBe(42)
    expect(formatGridbotAdvancedOk(42, 10, 11)).toBe('ok N42 B10 P11')
  })
})
