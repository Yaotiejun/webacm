<template>
  <div class="km-workspace">
    <div class="km-canvas-host">
      <GcodePreviewPanel
        ref="previewRef"
        layout="cam"
        kind="cam"
        :job-gcode="displayGcode"
        :tool-position="laserToolPosition"
        :stem-color="laserStemColor"
        :show-toolbar="false"
        :show-path-legend="false"
      />
    </div>

    <div class="km-mode-tools">
      <button type="button" :class="{ selected: phase === 'arrange' }" @click="phase = 'arrange'">
        <span class="km-mode-ico" aria-hidden="true">▣</span>
        <span>arrange</span>
      </button>
      <button
        type="button"
        :class="{ selected: phase === 'slice' }"
        :disabled="!canSlice || slicing"
        @click="onSlice"
      >
        <span class="km-mode-ico" aria-hidden="true">☰</span>
        <span>slice</span>
      </button>
      <button type="button" :class="{ selected: phase === 'preview' }" :disabled="!laserGcode" @click="phase = 'preview'">
        <span class="km-mode-ico" aria-hidden="true">⧉</span>
        <span>preview</span>
      </button>
      <div class="km-mode-export-wrap">
        <button type="button" :class="{ selected: phase === 'export' }" @click="phase = 'export'">
          <span class="km-mode-ico" aria-hidden="true">⇩</span>
          <span>export</span>
        </button>
        <div class="km-export-menu" v-if="phase === 'export'">
          <button type="button" :disabled="!laserGcode" @click="onDownloadGcode">Download G-code</button>
          <button type="button" :disabled="!laserSvg" @click="onDownloadSvg">Download SVG</button>
          <button type="button" :disabled="!laserGcode" @click="onCopyGcode">Copy G-code</button>
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
                <el-select v-model="deviceId" size="small" filterable style="width: 100%">
                  <el-option v-for="id in deviceIds" :key="id" :label="id" :value="id" />
                </el-select>
              </div>
            </div>
          </details>
          <details class="km-set-group" open>
            <summary class="km-set-header">Layers</summary>
            <div class="km-set-body">
              <div class="km-row"><label>offset / kerf</label>
                <el-input-number v-model="kerf" :step="0.05" :min="0" size="small" /></div>
              <div class="km-row"><label>slice height</label>
                <el-input-number v-model="sliceHeight" :step="0.25" :min="0" size="small" /></div>
              <div class="km-row"><label>single slice</label>
                <el-switch v-model="sliceSingle" size="small" /></div>
            </div>
          </details>
          <details class="km-set-group" open>
            <summary class="km-set-header">Layout</summary>
            <div class="km-set-body">
              <div class="km-row"><label>spacing</label>
                <el-input-number v-model="nestGap" :step="0.5" :min="0" size="small" /></div>
              <div class="km-row"><label>grouped</label>
                <el-switch v-model="outGrouped" size="small" /></div>
            </div>
          </details>
          <details class="km-set-group" open>
            <summary class="km-set-header">Output</summary>
            <div class="km-set-body">
              <div class="km-row"><label>power %</label>
                <el-input-number v-model="powerPct" :step="5" :min="1" :max="100" size="small" /></div>
              <div class="km-row"><label>speed</label>
                <el-input-number v-model="feedrate" :step="100" :min="1" size="small" /></div>
              <div class="km-row"><label>passes</label>
                <el-input-number v-model="passes" :step="1" :min="1" :max="20" size="small" /></div>
              <div class="km-row"><label>origin center</label>
                <el-switch v-model="originCenter" size="small" /></div>
            </div>
          </details>
        </div>
      </div>

      <div class="km-mid-center">
        <div v-if="phase === 'arrange' && !hasObject" class="km-hint" style="padding: 12px">
          File → import (SVG / DXF / PNG / JPG). Images open Image Conversion, then appear in arrange.
        </div>
      </div>

      <div class="km-panel-right">
        <div class="km-panel-scroll">
          <details class="km-set-group" open>
            <summary class="km-set-header">objects</summary>
            <div class="km-set-body">
              <p v-if="!sourceName" class="km-hint">No objects. Use File → import.</p>
              <div v-else class="km-object-row active">
                <span class="name">{{ sourceName }}</span>
                <span class="km-hint">{{ objectHint }}</span>
              </div>
            </div>
          </details>
          <details class="km-set-group" open>
            <summary class="km-set-header">diagnostics</summary>
            <div class="km-set-body">
              <p class="km-hint">Mode: LASER · backend: kiri-ts</p>
              <p class="km-hint" v-if="imageHeightmap">heightmap {{ imageHeightmap.width }}×{{ imageHeightmap.height }} · zMax {{ imageHeightmap.zMax.toFixed(2) }}</p>
              <p class="km-hint" v-if="laserGcode">G-code {{ laserGcode.length }} chars</p>
              <p class="km-hint" v-if="errorMsg">{{ errorMsg }}</p>
            </div>
          </details>
        </div>
      </div>
    </div>

    <!-- Kiri Image Conversion dialog -->
    <el-dialog
      v-model="imgDialogVisible"
      title="Image Conversion"
      width="440px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <p class="km-hint" style="margin-bottom: 12px">
        This will create a 3D model from a 2D image. Photos must be blurred to be usable.
        Values from 0=off to 50=high are suggested. Higher values incur more processing time.
      </p>
      <div class="km-set-body">
        <div class="km-row"><label>blur value</label>
          <el-input-number v-model="dlgBlur" :min="0" :max="50" :step="1" size="small" /></div>
        <div class="km-row"><label>base size</label>
          <el-input-number v-model="dlgBase" :min="0" :step="0.5" size="small" /></div>
        <div class="km-row"><label>border size</label>
          <el-input-number v-model="dlgBorder" :min="0" :step="1" size="small" /></div>
        <div class="km-row"><label>invert image</label>
          <el-switch v-model="dlgInvImage" size="small" /></div>
        <div class="km-row"><label>invert alpha</label>
          <el-switch v-model="dlgInvAlpha" size="small" /></div>
      </div>
      <template #footer>
        <el-button @click="onImgDialogCancel">cancel</el-button>
        <el-button type="primary" :loading="converting" @click="onImgDialogConvert">convert</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Mesh } from 'three'
import GcodePreviewPanel from '@/components/gcode/GcodePreviewPanel.vue'
import { submitLaserJob } from '@/api/laser'
import { buildSyntheticPreviewGcode } from '@/core/gcode/syntheticPreviewGcode'
import {
  heightmapToLaserPolylines,
  loadImageFileToHeightmap,
  type LaserHeightmap,
} from '@/core/laser/laserImageHeightmap'
import {
  buildLaserHeightmapArrangeMesh,
  disposeObject3D,
} from '@/core/laser/laserHeightmapMesh'
import { parseDxfToLaserPolylines } from '@/core/laser/laserDxfParse'
import { parseSvgToLaserPolylines, type LaserPolyline } from '@/core/laser/laserSvgParse'
import { getStockLaserDevice, listStockLaserDeviceIds } from '@/core/laser/stock/stockLaserDevices'
import { WORKSPACE_EVENT } from '@/layouts/workspaceEvents'
import type { GcodeThreeToolPosition } from '@/composables/useGcodeThreeViewport'

type Phase = 'arrange' | 'slice' | 'preview' | 'export'

const phase = ref<Phase>('arrange')
const previewRef = ref<InstanceType<typeof GcodePreviewPanel> | null>(null)
const deviceIds = listStockLaserDeviceIds()
const deviceId = ref(deviceIds[0] || 'Any.Generic.Laser')
const device = computed(() => getStockLaserDevice(deviceId.value))

const kerf = ref(0.1)
const feedrate = ref(1000)
const seekrate = ref(3000)
const passes = ref(1)
const nestGap = ref(1)
const powerPct = ref(100)
const sliceHeight = ref(1)
const sliceSingle = ref(true)
const outGrouped = ref(true)
const originCenter = ref(true)
const engraveWidthMm = ref(200)

const sourceName = ref('')
const svgText = ref('')
const dxfText = ref('')
const imageHeightmap = ref<LaserHeightmap | null>(null)
const imagePolylines = ref<LaserPolyline[]>([])
const polylines = ref<LaserPolyline[]>([])
const arrangePreviewGcode = ref('')
const laserGcode = ref('')
const laserSvg = ref('')
const slicing = ref(false)
const converting = ref(false)
const errorMsg = ref('')
const laserToolPosition = ref<GcodeThreeToolPosition>({ x: 0, y: 0, z: 0 })
const laserStemColor = 0x909399

const imgDialogVisible = ref(false)
const pendingImageFile = ref<File | null>(null)
const dlgBlur = ref(0)
const dlgBase = ref(0)
const dlgBorder = ref(0)
const dlgWidthMm = ref(200)
const dlgInvImage = ref(false)
const dlgInvAlpha = ref(false)

let arrangeMesh: Mesh | null = null

const displayGcode = computed(() => laserGcode.value || arrangePreviewGcode.value)
const hasObject = computed(
  () => Boolean(imageHeightmap.value || polylines.value.length || svgText.value || dxfText.value),
)
const canSlice = computed(
  () => Boolean(imageHeightmap.value || polylines.value.length || svgText.value || dxfText.value),
)
const objectHint = computed(() => {
  if (imageHeightmap.value && !laserGcode.value) return 'heightmap · arrange'
  if (polylines.value.length) return `${polylines.value.length} poly`
  return 'ready'
})

watch(deviceId, () => {
  if (canSlice.value) void onSlice()
})

function processOpts() {
  const isImage = Boolean(imageHeightmap.value)
  // Kiri: ctSliceSingle skips tile pack — keep image iso contours in place
  const pack = !isImage && !sliceSingle.value
  return {
    kerf: kerf.value,
    power: Math.max(0, Math.min(1, powerPct.value / 100)),
    feedrate: feedrate.value,
    seekrate: seekrate.value,
    passes: passes.value,
    nestGap: isImage || sliceSingle.value ? 0 : nestGap.value,
    grouped: outGrouped.value,
    layoutPack: pack,
    origin: originCenter.value ? ('center' as const) : ('bounds' as const),
    engraveScan: false,
  }
}

function imageConvertOpts() {
  const bedW = device.value?.bedWidth || 300
  const bedD = device.value?.bedDepth || bedW
  // Kiri image2mesh always fits to bed (no separate width field)
  return {
    bedWidth: bedW,
    bedDepth: bedD,
    blur: dlgBlur.value,
    base: dlgBase.value,
    border: dlgBorder.value,
    invImage: dlgInvImage.value,
    invAlpha: dlgInvAlpha.value,
    maxWidthPx: 1000,
    sliceMode: (sliceSingle.value ? 'single' : 'layers') as 'single' | 'layers',
    sliceHeightMm: sliceHeight.value,
    singleLevel: 0.35,
  }
}

function clearArrangeMesh() {
  if (arrangeMesh) {
    arrangeMesh.parent?.remove(arrangeMesh)
    disposeObject3D(arrangeMesh)
    arrangeMesh = null
  }
  previewRef.value?.clearAnimateStockGroup?.()
}

function showArrangeMesh(hm: LaserHeightmap) {
  clearArrangeMesh()
  const tryAdd = (attempt: number) => {
    const group = previewRef.value?.getOrCreateAnimateStockGroup?.()
    if (!group) {
      if (attempt < 20) requestAnimationFrame(() => tryAdd(attempt + 1))
      return
    }
    arrangeMesh = buildLaserHeightmapArrangeMesh(hm)
    group.add(arrangeMesh)
  }
  tryAdd(0)
}

function polylinesToArrangePreview(polys: LaserPolyline[]): string {
  return buildSyntheticPreviewGcode({
    headerComment: 'laser arrange preview',
    groups: polys.map((p) => {
      const pts = p.points.map((q) => ({ x: q.x, y: q.y, z: 0.05 }))
      if (p.closed && pts.length >= 2) {
        const a = pts[0]!
        pts.push({ x: a.x, y: a.y, z: a.z })
      }
      return { points: pts }
    }),
    maxGroups: 800,
    maxPoints: 20000,
  })
}

async function openImageConversionDialog(file: File) {
  if (file.size > 2_500_000) {
    try {
      await ElMessageBox.confirm(
        'Large images may fail to import. Consider resizing under 1000 × 1000. Proceed with import?',
        'Image Conversion',
        { confirmButtonText: 'Proceed', cancelButtonText: 'Cancel', type: 'warning' },
      )
    } catch {
      return
    }
  }
  pendingImageFile.value = file
  dlgBlur.value = 0
  dlgBase.value = 0
  dlgBorder.value = 0
  dlgWidthMm.value = device.value?.bedWidth || 300
  dlgInvImage.value = false
  dlgInvAlpha.value = false
  imgDialogVisible.value = true
}

function onImgDialogCancel() {
  imgDialogVisible.value = false
  pendingImageFile.value = null
}

async function onImgDialogConvert() {
  const file = pendingImageFile.value
  if (!file) return
  converting.value = true
  errorMsg.value = ''
  try {
    const opts = imageConvertOpts()
    const hm = await loadImageFileToHeightmap(file, opts)
    svgText.value = ''
    dxfText.value = ''
    sourceName.value = file.name
    imageHeightmap.value = hm
    imagePolylines.value = []
    polylines.value = []
    laserGcode.value = ''
    laserSvg.value = ''
    arrangePreviewGcode.value = ''
    phase.value = 'arrange'
    imgDialogVisible.value = false
    pendingImageFile.value = null
    await nextTick()
    showArrangeMesh(hm)
    ElMessage.success(`converted · ${hm.width}×${hm.height} heightmap — click slice`)
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
    ElMessage.error(errorMsg.value)
  } finally {
    converting.value = false
  }
}

async function importFiles(files: File[]) {
  const file = files[0]
  if (!file) return
  try {
    const isImage =
      /\.(png|jpe?g|webp|gif)$/i.test(file.name) || /^image\/(png|jpeg|webp|gif)/i.test(file.type)
    if (isImage) {
      await openImageConversionDialog(file)
      return
    }
    const text = await file.text()
    const isDxf = /\.dxf$/i.test(file.name)
    const polys = isDxf ? parseDxfToLaserPolylines(text) : parseSvgToLaserPolylines(text)
    clearArrangeMesh()
    svgText.value = isDxf ? '' : text
    dxfText.value = isDxf ? text : ''
    imageHeightmap.value = null
    imagePolylines.value = []
    sourceName.value = file.name
    polylines.value = polys
    laserGcode.value = ''
    laserSvg.value = ''
    arrangePreviewGcode.value = polylinesToArrangePreview(polys)
    errorMsg.value = ''
    phase.value = 'arrange'
    ElMessage.success(`imported ${polys.length} paths`)
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
  clearArrangeMesh()
})

async function onSlice() {
  slicing.value = true
  errorMsg.value = ''
  try {
    let result
    if (svgText.value) {
      result = await submitLaserJob(
        { kind: 'svg', svgText: svgText.value },
        { deviceId: deviceId.value, process: processOpts() },
      )
    } else if (dxfText.value) {
      result = await submitLaserJob(
        { kind: 'dxf', dxfText: dxfText.value },
        { deviceId: deviceId.value, process: processOpts() },
      )
    } else if (imageHeightmap.value) {
      const polys = heightmapToLaserPolylines(imageHeightmap.value, imageConvertOpts())
      imagePolylines.value = polys
      result = await submitLaserJob(
        { kind: 'polylines', polylines: polys },
        { deviceId: deviceId.value, process: processOpts(), forceSync: true },
      )
    } else if (polylines.value.length) {
      result = await submitLaserJob(
        { kind: 'polylines', polylines: polylines.value },
        { deviceId: deviceId.value, process: processOpts() },
      )
    } else {
      throw new Error('File → import first')
    }
    clearArrangeMesh()
    arrangePreviewGcode.value = ''
    polylines.value = result.polylines
    laserGcode.value = result.gcodeText
    laserSvg.value = result.svgText
    phase.value = 'preview'
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : String(e)
    ElMessage.error(errorMsg.value)
  } finally {
    slicing.value = false
  }
}

function onDownloadGcode() {
  if (!laserGcode.value) return
  const blob = new Blob([laserGcode.value], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${sourceName.value.replace(/\.(svg|dxf|png|jpe?g|webp|gif)$/i, '') || 'laser'}.gcode`
  a.click()
  URL.revokeObjectURL(a.href)
}

function onDownloadSvg() {
  if (!laserSvg.value) return
  const blob = new Blob([laserSvg.value], { type: 'image/svg+xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${sourceName.value.replace(/\.(svg|dxf|png|jpe?g|webp|gif)$/i, '') || 'laser'}.svg`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function onCopyGcode() {
  if (!laserGcode.value) return
  await navigator.clipboard.writeText(laserGcode.value)
  ElMessage.success('copied G-code')
}
</script>