import './assets/main.css'
import './styles/kiri-workspace.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import * as THREE from 'three'
import { preloadLegacyRuntimes } from '@/core/bootstrap/preloadLegacyRuntimes'
import { preloadRasterGripWorker } from '@/core/bootstrap/preloadRasterGripWorker'

;(globalThis as any).THREE = THREE

preloadLegacyRuntimes()
preloadRasterGripWorker()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
