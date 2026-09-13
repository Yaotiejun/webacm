import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { existsSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolveGripRasterCore, githubRoot } from './scripts/resolve-grip-root.mjs'

const clipAppsDir = fileURLToPath(new URL('.', import.meta.url))
const gripRasterCore =
  resolveGripRasterCore() ??
  path.resolve(clipAppsDir, '../../grip/raster-path-main/src/core')

if (!existsSync(path.join(gripRasterCore, 'raster-path.js'))) {
  console.warn(
    `[vite] @grip-raster-core not found at ${gripRasterCore}\n` +
      `  Set GRIP_ROOT to the parent of raster-path-main, or place it under:\n` +
      `  ${path.join(githubRoot, 'grip/raster-path-main')}\n` +
      `  ${path.join(githubRoot, 'Kiri-Moto/raster-path-main')}`,
  )
} else {
  console.info(`[vite] @grip-raster-core → ${gripRasterCore}`)
}

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  plugins: [vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@grip-raster-core': gripRasterCore,
    },
  },
  server: {
    fs: {
      // allow reading grip/Kiri-Moto siblings outside clip-apps
      allow: [
        fileURLToPath(new URL('..', import.meta.url)),
        gripRasterCore,
        githubRoot,
      ],
    },
  },
  optimizeDeps: {
    include: ['three', 'element-plus'],
  },
})
