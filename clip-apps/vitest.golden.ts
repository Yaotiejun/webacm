import { mergeConfig } from 'vitest/config'
import base from './vitest.config'

/** Slow grip-bridge checksum tests (needs synced STLs + WebGPU). */
export default mergeConfig(base, {
  test: {
    testTimeout: 300_000,
    hookTimeout: 300_000,
    include: ['src/core/raster/*.live.spec.ts'],
  },
})
