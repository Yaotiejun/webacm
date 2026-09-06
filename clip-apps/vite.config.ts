import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'

const gripRasterCore = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../grip/raster-path-main/src/core')
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@grip-raster-core': gripRasterCore,
    },
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL('..', import.meta.url)), gripRasterCore],
    },
  },
  optimizeDeps: {
    include: ['three', 'element-plus'],
  },
})
