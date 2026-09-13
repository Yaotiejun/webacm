<template>
  <div class="km-app">
    <header class="km-menubar">
      <div class="km-app-name">ShapeX:CAM</div>
      <div class="km-menubar-sep" aria-hidden="true" />

      <nav class="km-top-menu" aria-label="Main">
        <div class="km-menu">
          <span class="km-menu-label">files</span>
          <div class="km-menu-dropdown">
            <button class="km-menu-item" type="button" @click="onImport">import</button>
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('export')">
              export g-code
            </button>
            <div class="km-menu-sep" />
            <button class="km-menu-item" type="button" @click="go('/jobs/fdm')">jobs</button>
          </div>
        </div>

        <div class="km-menu">
          <span class="km-menu-label">edit</span>
          <div class="km-menu-dropdown">
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('lay-flat')">
              face down
            </button>
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('duplicate')">
              duplicate
            </button>
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('delete')">
              delete
            </button>
          </div>
        </div>

        <div class="km-menu">
          <span class="km-menu-label">view</span>
          <div class="km-menu-dropdown">
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('home')">
              home
            </button>
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('top')">
              top
            </button>
          </div>
        </div>

        <div class="km-menu">
          <span class="km-menu-label">render</span>
          <div class="km-menu-dropdown">
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('render-solid')">
              solid
            </button>
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('render-wire')">
              wireframe
            </button>
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('render-ghost')">
              transparent
            </button>
          </div>
        </div>

        <div class="km-menu">
          <span class="km-menu-label">tool</span>
          <div class="km-menu-dropdown">
            <button class="km-menu-item" type="button" :class="{ disabled: !isFdm }" @click="emitWorkspace('diagnostics')">
              diagnostics
            </button>
          </div>
        </div>

        <div class="km-menubar-spacer" />

        <div class="km-menu km-menu-right">
          <span class="km-menu-label">mode</span>
          <div class="km-menu-dropdown km-menu-dropdown-right">
            <button class="km-menu-item" type="button" @click="go('/fdm')">FDM</button>
            <button class="km-menu-item" type="button" @click="go('/sla')">SLA</button>
            <button class="km-menu-item" type="button" @click="go('/cam')">CNC</button>
            <button class="km-menu-item" type="button" @click="go('/laser')">Laser</button>
            <div class="km-menu-sep" />
            <button class="km-menu-item" type="button" @click="go('/raster')">Raster</button>
            <button class="km-menu-item" type="button" @click="go('/texturizer')">Texturizer</button>
            <div class="km-menu-sep" />
            <button class="km-menu-item" type="button" @click="go('/carvera')">Carvera</button>
            <button class="km-menu-item" type="button" @click="go('/gridbot')">GridBot</button>
          </div>
        </div>

        <div class="km-menu km-menu-right">
          <span class="km-menu-label">setup</span>
          <div class="km-menu-dropdown km-menu-dropdown-right">
            <button class="km-menu-item" type="button" @click="go('/devices/fdm')">machines</button>
            <button class="km-menu-item" type="button" @click="go('/process/fdm')">profiles</button>
            <button class="km-menu-item" type="button" @click="go('/material/fdm')">materials</button>
            <button class="km-menu-item" type="button" @click="go('/config/fdm')">current config</button>
            <div class="km-menu-sep" />
            <button class="km-menu-item" type="button" @click="go('/settings')">prefs</button>
          </div>
        </div>

        <div class="km-mode-badge">{{ modeLabel }}</div>
      </nav>
    </header>

    <main class="km-main" :class="isWorkspaceRoute ? 'is-workspace' : 'is-page'">
      <router-view />
    </main>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="fileAccept"
      class="km-hidden-file"
      @change="onFileInputChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { WORKSPACE_EVENT } from '@/layouts/workspaceEvents'

const route = useRoute()
const router = useRouter()
const fileInputRef = ref<HTMLInputElement | null>(null)

const WORKSPACE_PATHS = new Set([
  '/fdm',
  '/sla',
  '/cam',
  '/laser',
  '/raster',
  '/texturizer',
  '/carvera',
  '/gridbot',
])

const isWorkspaceRoute = computed(() => WORKSPACE_PATHS.has(route.path))
const isFdm = computed(() => route.path === '/fdm')

const modeLabel = computed(() => {
  if (route.path.startsWith('/fdm') || route.path.startsWith('/process/fdm') || route.path.startsWith('/devices/fdm')) {
    return 'FDM'
  }
  if (route.path.startsWith('/sla')) return 'SLA'
  if (route.path.startsWith('/cam')) return 'CNC'
  if (route.path.startsWith('/laser')) return 'Laser'
  if (route.path.startsWith('/raster')) return 'Raster'
  if (route.path.startsWith('/texturizer')) return 'Texturizer'
  if (route.path.startsWith('/carvera')) return 'Carvera'
  if (route.path.startsWith('/gridbot')) return 'GridBot'
  return ''
})

function go(path: string) {
  router.push(path)
}

function emitWorkspace(action: string, detail: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: { action, ...detail } }))
}

const fileAccept = computed(() => {
  if (route.path.startsWith('/laser')) {
    return '.svg,.dxf,.png,.jpg,.jpeg,.webp,.gif,image/svg+xml,image/png,image/jpeg,image/webp,image/gif'
  }
  if (route.path.startsWith('/sla')) return '.stl,.obj,.STL,.OBJ'
  if (route.path.startsWith('/cam') || route.path.startsWith('/raster') || route.path.startsWith('/texturizer')) {
    return '.stl,.obj,.svg,.dxf,.STL,.OBJ'
  }
  return '.stl,.obj,.3mf,.STL,.OBJ,.3MF'
})

function onImport() {
  // Kiri: File → import stays on current mode; only jump if not in a workspace.
  if (!isWorkspaceRoute.value) go('/fdm')
  requestAnimationFrame(() => fileInputRef.value?.click())
}

function onFileInputChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  if (!files.length) return
  emitWorkspace('import-files', { files })
}
</script>

<style scoped>
.km-hidden-file {
  display: none;
}
</style>
