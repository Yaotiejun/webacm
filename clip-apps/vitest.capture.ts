import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

/** Runs `camEngine.legacy.capture.spec.ts` with capture env pinned (Windows-safe). */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      pool: 'forks',
      fileParallelism: false,
      include: ['src/core/cam/camEngine.legacy.capture.spec.ts'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      env: {
        CAPTURE_CAM_FIXTURE: '1',
        VITE_KIRI_LEGACY_CAM: '1',
      },
    },
  }),
)
