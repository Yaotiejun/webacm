<template>
  <div class="km-workspace">
    <div class="km-canvas-host">
      <GcodePreviewPanel
        ref="previewRef"
        layout="cam"
        kind="sla"
        :job-gcode="''"
        :tool-position="slaToolPosition"
        :stem-color="0x909399"
        :show-toolbar="false"
        :show-path-legend="false"
      />
    </div>

    <div class="km-mode-tools">
      <button type="button" :class="{ selected: phase === 'arrange' }" @click="goArrange">
        <span class="km-mode-ico" aria-hidden="true">▣</span>
        <span>arrange</span>
      </button>
      <button
        type="button"
        :class="{ selected: phase === 'slice' || phase === 'preview' }"
        :disabled="!vertices || slicing"
        @click="onSlice"
      >
        <span class="km-mode-ico" aria-hidden="true">☰</span>
        <span>slice</span>
      </button>
      <button
        type="button"
        :class="{ selected: phase === 'animate' }"
        :disabled="!result"
        title="Play layer stack grow (Kiri-like)"
        @click="onAnimateModeClick"
      >
        <span class="km-mode-ico" aria-hidden="true">▶</span>
        <span>animate</span>
      </button>
      <div class="km-mode-export-wrap">
        <button type="button" :class="{ selected: phase === 'export' }" @click="onExportClick">
          <span class="km-mode-ico" aria-hidden="true">⇩</span>
          <span>export</span>
        </button>
        <div class="km-export-menu" v-if="phase === 'export'">
          <button type="button" :disabled="!result" @click="onDownload">Download .{{ exportFormat }}</button>
        </div>
      </div>
    </div>

    <div class="km-mid">
      <div class="km-panel-left">
        <div class="km-panel-scroll">
          <details class="km-set-group" open>
            <summary class="km-set-header">Machine</summary>
            <div class="km-set-body">
              <div class="km-row">
                <label>device</label>
                <el-select v-model="deviceId" placeholder="SLA device" size="small" filterable style="width: 100%">
                  <el-option v-for="id in deviceIds" :key="id" :label="id" :value="id" />
                </el-select>
              </div>
              <p class="km-hint" v-if="device">
                床 {{ device.bedWidth }}×{{ device.bedDepth }} · {{ device.resolutionX }}×{{ device.resolutionY }}
              </p>
            </div>
          </details>

          <details class="km-set-group" open>
            <summary class="km-set-header">Profile</summary>
            <div class="km-set-body">
              <div class="km-row">
                <label>profile</label>
                <el-select v-model="profileId" size="small" style="width: 100%">
                  <el-option label="default" value="default" />
                  <el-option label="fast draft" value="fast" />
                  <el-option label="fine detail" value="fine" />
                </el-select>
              </div>
            </div>
          </details>

          <details class="km-set-group" open>
            <summary class="km-set-header">切片</summary>
            <div class="km-set-body">
              <div class="km-row">
                <label>层高</label>
                <el-input-number v-model="layerHeight" :step="0.01" :min="0.01" :max="0.2" size="small" />
              </div>
              <div class="km-row">
                <label>空心外壳</label>
                <el-input-number v-model="shellMm" :step="0.05" :min="0" :max="5" size="small" />
              </div>
              <div class="km-row">
                <label>顶部开口</label>
                <el-switch v-model="shellOpenTop" size="small" :disabled="shellMm <= 0" />
              </div>
              <div class="km-row">
                <label>底部开口</label>
                <el-switch v-model="shellOpenBase" size="small" :disabled="shellMm <= 0" />
              </div>
            </div>
          </details>

          <details class="km-set-group" open>
            <summary class="km-set-header">层</summary>
            <div class="km-set-body">
              <div class="km-row">
                <label>光照时间</label>
                <el-input-number v-model="layerOn" :step="0.5" :min="0" size="small" />
              </div>
              <div class="km-row">
                <label>光熄时间</label>
                <el-input-number v-model="layerOff" :step="0.5" :min="0" size="small" />
              </div>
              <div class="km-row">
                <label>剥离距离</label>
                <el-input-number v-model="peelDist" :step="0.5" :min="0" size="small" />
              </div>
              <div class="km-row">
                <label>剥离提升速度</label>
                <el-input-number v-model="peelLiftRate" :step="0.1" :min="0.1" size="small" />
              </div>
              <div class="km-row">
                <label>剥离下降速度</label>
                <el-input-number v-model="peelDropRate" :step="0.1" :min="0.1" size="small" />
              </div>
            </div>
          </details>

          <details class="km-set-group" open>
            <summary class="km-set-header">基础</summary>
            <div class="km-set-body">
              <div class="km-row">
                <label>层数</label>
                <el-input-number v-model="baseLayers" :step="1" :min="0" :max="40" size="small" />
              </div>
              <div class="km-row">
                <label>光照时间</label>
                <el-input-number v-model="baseOn" :step="1" :min="0" size="small" />
              </div>
              <div class="km-row">
                <label>光熄时间</label>
                <el-input-number v-model="baseOff" :step="0.5" :min="0" size="small" />
              </div>
              <div class="km-row">
                <label>剥离距离</label>
                <el-input-number v-model="basePeelDist" :step="0.5" :min="0" size="small" />
              </div>
              <div class="km-row">
                <label>剥离提升速度</label>
                <el-input-number v-model="basePeelLiftRate" :step="0.1" :min="0.1" size="small" />
              </div>
            </div>
          </details>

          <details class="km-set-group" open>
            <summary class="km-set-header">填充</summary>
            <div class="km-set-body">
              <div class="km-row">
                <label>密度</label>
                <el-input-number v-model="fillDensity" :step="0.05" :min="0" :max="1" size="small" />
              </div>
              <div class="km-row">
                <label>线宽</label>
                <el-input-number v-model="fillLine" :step="0.05" :min="0" :max="5" size="small" />
              </div>
            </div>
          </details>

          <details class="km-set-group" open>
            <summary class="km-set-header">支撑</summary>
            <div class="km-set-body">
              <div class="km-row">
                <label>enable</label>
                <el-switch v-model="supportEnable" size="small" />
              </div>
              <div class="km-row">
                <label>基础层</label>
                <el-input-number v-model="supportLayers" :step="1" :min="0" :max="10" size="small" />
              </div>
              <div class="km-row">
                <label>间隙层</label>
                <el-input-number v-model="supportGap" :step="1" :min="0" :max="30" size="small" />
              </div>
              <div class="km-row">
                <label>密度</label>
                <el-input-number v-model="supportDensity" :step="0.05" :min="0.01" :max="0.9" size="small" />
              </div>
              <div class="km-row">
                <label>尺寸</label>
                <el-input-number v-model="supportSize" :step="0.05" :min="0.1" :max="1" size="small" />
              </div>
              <div class="km-row">
                <label>点</label>
                <el-input-number v-model="supportPoints" :step="1" :min="3" :max="10" size="small" />
              </div>
              <div class="km-row">
                <label>角度</label>
                <el-input-number v-model="supportAngle" :step="1" :min="5" :max="45" size="small" />
              </div>
            </div>
          </details>

          <details class="km-set-group" open>
            <summary class="km-set-header">输出</summary>
            <div class="km-set-body">
              <div class="km-row">
                <label>Z偏移</label>
                <el-input-number v-model="slaZOffset" :step="0.05" :min="0" :max="1" size="small" />
              </div>
              <div class="km-row">
                <label>抗锯齿</label>
                <el-select v-model="antiAlias" size="small" style="width: 100%">
                  <el-option label="off" :value="1" />
                  <el-option label="2x" :value="2" />
                  <el-option label="4x" :value="4" />
                  <el-option label="8x" :value="8" />
                </el-select>
              </div>
              <div class="km-row">
                <label>export format</label>
                <el-select v-model="exportFormat" size="small" style="width: 100%">
                  <el-option label="Photon" value="photon" />
                  <el-option label="CTB v3" value="ctb" />
                  <el-option label="CTB encrypted" value="ctb-encrypted" />
                  <el-option label="GOO V3.0" value="goo" />
                </el-select>
              </div>
            </div>
          </details>
        </div>
      </div>

      <div class="km-mid-center">
        <div v-if="phase === 'arrange' && !vertices" class="km-hint" style="padding: 12px">
          File → import STL/OBJ（光固化网格；不支持照片）。图片激光雕刻请用 /laser。然后 slice → animate → export。
        </div>
        <div v-if="result && phase !== 'arrange'" class="km-layer-bar">
          <span>Layer</span>
          <input
            type="range"
            class="km-layer-range"
            :min="0"
            :max="Math.max(0, result.layerCount - 1)"
            step="1"
            v-model.number="activeLayer"
          />
          <span>
            {{ activeLayer + 1 }}/{{ result.layerCount }}
            <template v-if="result.layers[activeLayer]"> z={{ result.layers[activeLayer].z.toFixed(2) }}</template>
          </span>
          <template v-if="phase === 'animate'">
            <button type="button" class="km-layer-anim-btn" @click="toggleAnimatePlayback">
              {{ animatePlaying ? 'Pause' : 'Play' }}
            </button>
            <label class="km-layer-anim-speed">
              speed
              <input type="range" min="1" max="20" step="1" v-model.number="animateSpeed" />
            </label>
          </template>
        </div>
      </div>

      <div class="km-panel-right">
        <div class="km-panel-scroll">
          <details class="km-set-group" open>
            <summary class="km-set-header">objects</summary>
            <div class="km-set-body">
              <input
                ref="meshInputRef"
                type="file"
                accept=".stl,.obj,.STL,.OBJ"
                class="km-hidden-file"
                style="display: none"
                @change="onMeshFile"
              />
              <button type="button" class="km-import-btn" @click="meshInputRef?.click()">Import STL/OBJ</button>
              <p v-if="!sourceName" class="km-hint">No mesh imported. Use File → import.</p>
              <div v-else class="km-object-row active">
                <span class="name">{{ sourceName }}</span>
                <span class="km-hint">{{ triCount }} tris</span>
              </div>
            </div>
          </details>
          <details class="km-set-group" open>
            <summary class="km-set-header">diagnostics</summary>
            <div class="km-set-body">
              <p class="km-hint">Mode: SLA · backend: sla-worker</p>
              <p class="km-hint" v-if="result">
                layers {{ result.layerCount }}
                <template v-if="result.mode === 'preview'"> · preview（导出时光栅化）</template>
                <template v-else> · blob {{ result.blob.byteLength }} B</template>
              </p>
              <p class="km-hint" v-if="errorMsg">{{ errorMsg }}</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Group, type Mesh } from 'three'
import GcodePreviewPanel from '@/components/gcode/GcodePreviewPanel.vue'
import { loadPartMeshFromFile } from '@/core/mesh/loadPartMesh'
import { submitSlaExport, submitSlaJob } from '@/api/sla'
import type { SlaEngineResult, SlaExportFormat } from '@/core/sla/slaEngine'
import {
  buildSlaArrangeMesh,
  disposeObject3D,
  seatSlaVertices,
  setSlaArrangeMeshGhost,
} from '@/core/sla/slaArrangeMesh'
import {
  clearSlaSliceOverlay,
  countDrawableSlaFills,
  createSlaSliceStack,
  type SlaSliceStackHandle,
} from '@/core/sla/slaSliceOverlay'
import { getStockSlaDevice, listStockSlaDeviceIds } from '@/core/sla/stock/stockSlaDevices'
import { WORKSPACE_EVENT } from '@/layouts/workspaceEvents'
import type { GcodeThreeToolPosition } from '@/composables/useGcodeThreeViewport'

type Phase = 'arrange' | 'slice' | 'preview' | 'animate' | 'export'

const phase = ref<Phase>('arrange')
const meshInputRef = ref<HTMLInputElement | null>(null)
const previewRef = ref<InstanceType<typeof GcodePreviewPanel> | null>(null)
const slaToolPosition = ref<GcodeThreeToolPosition>({ x: 0, y: 0, z: 0 })

const animatePlaying = ref(false)
const animateSpeed = ref(8)
let animateTimer: ReturnType<typeof setInterval> | null = null
let sliceStack: SlaSliceStackHandle | null = null
let sliceStackKey = ''

const deviceIds = listStockSlaDeviceIds()
const deviceId = ref(deviceIds[0] || 'Anycubic.Photon')
const device = computed(() => getStockSlaDevice(deviceId.value))

const profileId = ref('default')
const layerHeight = ref(0.05)
const shellMm = ref(0)
const shellOpenTop = ref(false)
const shellOpenBase = ref(false)
const layerOn = ref(2.5)
const layerOff = ref(2)
const peelDist = ref(6)
const peelLiftRate = ref(1.5)
const peelDropRate = ref(3)
const baseLayers = ref(8)
const baseOn = ref(25)
const baseOff = ref(2)
const basePeelDist = ref(6)
const basePeelLiftRate = ref(1.5)
const fillDensity = ref(0)
const fillLine = ref(0.45)
const supportEnable = ref(false)
const supportLayers = ref(3)
const supportGap = ref(2)
const supportDensity = ref(0.2)
const supportSize = ref(0.4)
const supportPoints = ref(4)
const supportAngle = ref(45)
const slaZOffset = ref(0)
const antiAlias = ref(1)
const exportFormat = ref<SlaExportFormat>('photon')

/** Kiri maps density/size → pillar spacing/radius */
function supportOptsFromUi() {
  const dens = Math.min(0.9, Math.max(0.01, supportDensity.value))
  const size = Math.min(1, Math.max(0.1, supportSize.value))
  return {
    supportEnable: supportEnable.value,
    supportSpacingMm: Math.max(0.5, 2 + (1 - dens) * 8),
    supportRadiusMm: Math.max(0.2, size * 0.55),
  }
}

watch(profileId, (id) => {
  if (id === 'fast') {
    layerHeight.value = 0.1
    layerOn.value = 2
    baseLayers.value = 5
    baseOn.value = 20
  } else if (id === 'fine') {
    layerHeight.value = 0.025
    layerOn.value = 3
    baseLayers.value = 10
    baseOn.value = 30
  } else {
    layerHeight.value = 0.05
    layerOn.value = 2.5
    baseLayers.value = 8
    baseOn.value = 25
  }
})

const sourceName = ref('')
const vertices = ref<Float32Array | null>(null)
const seatedVertices = ref<Float32Array | null>(null)
const triCount = ref(0)
const result = ref<SlaEngineResult | null>(null)
const activeLayer = ref(0)
const slicing = ref(false)
const errorMsg = ref('')

let arrangeMesh: Mesh | null = null
let sliceOverlayGroup: Group | null = null

function applyDeviceExportFormat(id: string) {
  const stock = getStockSlaDevice(id)
  const fmt = stock?.format
  if (fmt === 'photon' || fmt === 'ctb' || fmt === 'goo') {
    exportFormat.value = fmt
  }
}

watch(deviceId, (id) => applyDeviceExportFormat(id))
applyDeviceExportFormat(deviceId.value)

function clearArrangeMesh() {
  if (arrangeMesh) {
    arrangeMesh.parent?.remove(arrangeMesh)
    disposeObject3D(arrangeMesh)
    arrangeMesh = null
  }
}

function clearSliceOverlayFull() {
  stopAnimatePlayback()
  sliceStack?.dispose()
  sliceStack = null
  sliceStackKey = ''
  clearSlaSliceOverlay(sliceOverlayGroup)
  if (sliceOverlayGroup) {
    sliceOverlayGroup.parent?.remove(sliceOverlayGroup)
    sliceOverlayGroup = null
  }
}

function ensureOverlayGroup(stock: Group): Group {
  if (sliceOverlayGroup && sliceOverlayGroup.parent === stock) return sliceOverlayGroup
  if (sliceOverlayGroup) sliceOverlayGroup.parent?.remove(sliceOverlayGroup)
  sliceOverlayGroup = new Group()
  sliceOverlayGroup.name = 'sla-slice-overlay'
  stock.add(sliceOverlayGroup)
  sliceStack = null
  sliceStackKey = ''
  return sliceOverlayGroup
}

function showArrangeMesh(verts: Float32Array) {
  clearArrangeMesh()
  const tryAdd = (attempt: number) => {
    const group = previewRef.value?.getOrCreateAnimateStockGroup?.()
    if (!group) {
      if (attempt < 120) requestAnimationFrame(() => tryAdd(attempt + 1))
      else ElMessage.warning('3D 视口未就绪，请稍后重新导入模型')
      return
    }
    arrangeMesh = buildSlaArrangeMesh(verts)
    setSlaArrangeMeshGhost(arrangeMesh, false)
    group.add(arrangeMesh)
    previewRef.value?.fitCameraToAnimateStock?.(2.4)
  }
  tryAdd(0)
}

function updateSliceOverlayView() {
  const res = result.value
  // Kiri stays in slice/animate through export; only arrange clears the stack
  if (!res || phase.value === 'arrange') {
    sliceStack?.dispose()
    sliceStack = null
    sliceStackKey = ''
    clearSlaSliceOverlay(sliceOverlayGroup)
    setSlaArrangeMeshGhost(arrangeMesh, false)
    return
  }
  const tryDraw = (attempt: number) => {
    const stock = previewRef.value?.getOrCreateAnimateStockGroup?.()
    if (!stock) {
      if (attempt < 120) requestAnimationFrame(() => tryDraw(attempt + 1))
      else ElMessage.warning('切片完成但 3D 预览未挂载，请再点一次 slice')
      return
    }
    if (!arrangeMesh && vertices.value) {
      arrangeMesh = buildSlaArrangeMesh(vertices.value)
      stock.add(arrangeMesh)
    }
    const overlay = ensureOverlayGroup(stock)
    const key = `${res.layerCount}:${res.layers[0]?.z ?? 0}:${res.layers[res.layerCount - 1]?.z ?? 0}:${layerHeight.value}`
    if (!sliceStack || sliceStackKey !== key) {
      sliceStack?.dispose()
      sliceStack = createSlaSliceStack(overlay, res.layers, layerHeight.value)
      sliceStackKey = key
    }
    sliceStack.setRange(0, activeLayer.value)
    setSlaArrangeMeshGhost(arrangeMesh, true)
  }
  tryDraw(0)
}

function stopAnimatePlayback() {
  animatePlaying.value = false
  if (animateTimer != null) {
    clearInterval(animateTimer)
    animateTimer = null
  }
}

function startAnimatePlayback() {
  stopAnimatePlayback()
  const res = result.value
  if (!res?.layers.length) return
  animatePlaying.value = true
  const ms = Math.max(30, Math.round(1000 / Math.max(1, animateSpeed.value * 3)))
  animateTimer = setInterval(() => {
    const max = Math.max(0, res.layerCount - 1)
    activeLayer.value = activeLayer.value >= max ? 0 : activeLayer.value + 1
  }, ms)
}

function toggleAnimatePlayback() {
  if (animatePlaying.value) stopAnimatePlayback()
  else startAnimatePlayback()
}

function onAnimateModeClick() {
  if (!result.value) {
    ElMessage.info('请先 slice，再 animate')
    return
  }
  phase.value = 'animate'
  activeLayer.value = 0
  startAnimatePlayback()
}

function onExportClick() {
  stopAnimatePlayback()
  phase.value = 'export'
}

watch(activeLayer, () => updateSliceOverlayView())
watch([result, phase], () => {
  void nextTick(() => updateSliceOverlayView())
})
watch(animateSpeed, () => {
  if (animatePlaying.value) startAnimatePlayback()
})

function goArrange() {
  stopAnimatePlayback()
  phase.value = 'arrange'
  clearSlaSliceOverlay(sliceOverlayGroup)
  sliceStack?.dispose()
  sliceStack = null
  sliceStackKey = ''
  setSlaArrangeMeshGhost(arrangeMesh, false)
  if (vertices.value && !arrangeMesh) showArrangeMesh(vertices.value)
}

async function importMeshFile(file: File) {
  const mesh = await loadPartMeshFromFile(file)
  stopAnimatePlayback()
  vertices.value = mesh.vertices
  seatedVertices.value = seatSlaVertices(mesh.vertices).vertices
  triCount.value = mesh.triangleCount
  sourceName.value = file.name
  result.value = null
  errorMsg.value = ''
  clearSliceOverlayFull()
  phase.value = 'arrange'
  await nextTick()
  showArrangeMesh(mesh.vertices)
  ElMessage.success(`已导入 ${mesh.triangleCount} 三角形`)
}

async function onMeshFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    await importMeshFile(file)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
    ElMessage.error(errorMsg.value)
  }
}

async function importFiles(files: File[]) {
  const meshFile = files.find((f) => /\.(stl|obj)$/i.test(f.name))
  if (!meshFile) {
    ElMessage.warning('SLA 仅支持 STL / OBJ')
    return
  }
  try {
    await importMeshFile(meshFile)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
    ElMessage.error(errorMsg.value)
  }
}

function onWorkspaceEvent(ev: Event) {
  const detail = (ev as CustomEvent).detail as { action?: string; files?: File[] } | undefined
  if (detail?.action !== 'import-files' || !detail.files?.length) return
  void importFiles(detail.files)
}

onMounted(() => {
  window.addEventListener(WORKSPACE_EVENT, onWorkspaceEvent as EventListener)
})

onUnmounted(() => {
  window.removeEventListener(WORKSPACE_EVENT, onWorkspaceEvent as EventListener)
  stopAnimatePlayback()
  clearSliceOverlayFull()
  clearArrangeMesh()
  previewRef.value?.clearAnimateStockGroup?.()
})

function buildSlaJobOpts() {
  const stockDev = device.value
  return {
    layerHeight: layerHeight.value,
    exportFormat: exportFormat.value,
    deviceId: deviceId.value,
    resolution: stockDev
      ? {
          w: Math.min(512, stockDev.resolutionX),
          h: Math.min(512, stockDev.resolutionY),
        }
      : { w: 256, h: 256 },
    layerOn: layerOn.value,
    layerOff: layerOff.value,
    baseOn: baseOn.value,
    baseOff: baseOff.value,
    baseLayers: baseLayers.value,
    peelDist: peelDist.value,
    peelLiftRate: peelLiftRate.value,
    peelDropRate: peelDropRate.value,
    basePeelDist: basePeelDist.value,
    basePeelLiftRate: basePeelLiftRate.value,
    fillDensity: fillDensity.value,
    fillLine: fillLine.value,
    shellMm: shellMm.value,
    shellOpenTop: shellOpenTop.value,
    shellOpenBase: shellOpenBase.value,
    antiAlias: antiAlias.value,
    zOffset: slaZOffset.value,
    supportLayers: supportLayers.value,
    supportGap: supportGap.value,
    supportPoints: supportPoints.value,
    supportAngle: supportAngle.value,
    supportSize: supportSize.value,
    supportDensity: supportDensity.value,
    ...supportOptsFromUi(),
  }
}

async function onSlice() {
  if (!vertices.value) return
  stopAnimatePlayback()
  slicing.value = true
  errorMsg.value = ''
  try {
    const seated = seatedVertices.value || seatSlaVertices(vertices.value).vertices
    seatedVertices.value = seated
    const verts = new Float32Array(seated)
    // Kiri: slice = contours for 3D stack; rasterize only on export
    const out = await submitSlaJob(verts, {
      ...buildSlaJobOpts(),
      mode: 'preview',
    })
    result.value = out
    sliceStack?.dispose()
    sliceStack = null
    sliceStackKey = ''
    activeLayer.value = 0
    phase.value = 'slice'
    await nextTick()
    updateSliceOverlayView()
    requestAnimationFrame(() => {
      previewRef.value?.fitCameraToAnimateStock?.(2.6)
    })
    const drawable = countDrawableSlaFills(out.layers)
    if (!drawable) {
      ElMessage.warning(`切片完成 ${out.layerCount} 层，但轮廓为空（无法预览）。请检查模型是否已贴床。`)
    } else {
      ElMessage.success(`切片完成：${out.layerCount} 层（Kiri geo）· 可 animate · Download 时再导出`)
    }
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
    ElMessage.error(errorMsg.value)
  } finally {
    slicing.value = false
  }
}

async function onDownload() {
  const res = result.value
  if (!res?.layers.length) {
    ElMessage.info('请先 slice')
    return
  }
  try {
    ElMessage.info('正在导出设备文件…')
    const exported = await submitSlaExport(res.layers, {
      ...buildSlaJobOpts(),
      mode: 'export',
    })
    const blob = new Blob([exported.blob], { type: 'application/octet-stream' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const base = sourceName.value.replace(/\.(stl|obj)$/i, '') || 'sla'
    a.download = `${base}.${exported.filenameExt}`
    a.click()
    URL.revokeObjectURL(a.href)
    ElMessage.success(`已导出 .${exported.filenameExt}（${exported.blob.byteLength} B）`)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
    ElMessage.error(errorMsg.value)
  }
}
</script>
