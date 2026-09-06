import type { RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import SettingsView from '@/views/settings/SettingsView.vue'
import FdmDeviceListView from '@/views/devices/FdmDeviceListView.vue'
import FdmMaterialView from '@/views/material/FdmMaterialView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/settings' },
      { path: 'settings', component: SettingsView },
      { path: 'fdm', component: () => import('@/views/fdm/FdmView.vue') },
      { path: 'config/fdm', component: () => import('@/views/config/FdmCurrentConfigView.vue') },
      { path: 'devices/fdm', component: FdmDeviceListView },
      { path: 'process/fdm', component: () => import('@/views/process/FdmProcessView.vue') },
      { path: 'material/fdm', component: FdmMaterialView },
      { path: 'jobs/fdm', component: () => import('@/views/jobs/FdmJobListView.vue') },
      { path: 'jobs/carvera', component: () => import('@/views/jobs/CarveraJobListView.vue') },
      { path: 'jobs/gridbot', component: () => import('@/views/jobs/GridBotJobListView.vue') },

      { path: 'carvera', component: () => import('@/views/carvera/CarveraView.vue') },
      { path: 'gridbot', component: () => import('@/views/gridbot/GridBotView.vue') },
      { path: 'raster', component: () => import('@/views/raster/RasterView.vue') },
      { path: 'texturizer', component: () => import('@/views/texturizer/TexturizerView.vue') },
      { path: 'cam', component: () => import('@/views/cam/CamView.vue') },
    ],
  },
]
