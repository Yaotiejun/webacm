import { defineStore } from 'pinia'
import type { AppSettings, ControllerSettings } from '@/types/settings'
import { getSettings, saveSettings } from '@/api/settings'
import { clonePlain } from '@/core/clonePlain'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: null as AppSettings | null,
    loading: false,
  }),

  actions: {
    async load() {
      this.loading = true
      try {
        const data = await getSettings()
        this.settings = clonePlain(data) as AppSettings
      } finally {
        this.loading = false
      }
    },

    async updateController(partial: Partial<ControllerSettings>) {
      if (!this.settings) return
      this.settings = {
        ...this.settings,
        controller: {
          ...this.settings.controller,
          ...partial,
        },
      }
    },

    async save() {
      if (!this.settings) return
      await saveSettings(this.settings)
    },
  },
})
