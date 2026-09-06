<template>
  <el-container class="raster-root">
    <el-aside width="320px" class="raster-aside">
      <div class="pane-title">输入 / 参数</div>
      <div class="pane-body">
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
          <el-button size="small" type="primary" plain @click="onPickTerrainStl">导入地形 STL</el-button>
          <el-button size="small" type="primary" plain @click="onPickToolStl">导入刀具 STL</el-button>
          <input
            ref="terrainFileInputRef"
            type="file"
            accept=".stl"
            style="display: none"
            @change="onTerrainFileChange"
          />
          <input ref="toolFileInputRef" type="file" accept=".stl" style="display: none" @change="onToolFileChange" />
        </div>

        <div style="margin-top: 12px">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="地形顶点">
              <span v-if="terrainVertexCount" data-testid="raster-terrain-vertex-count">{{ terrainVertexCount }}</span>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="刀具顶点">
              <span v-if="toolVertexCount" data-testid="raster-tool-vertex-count">{{ toolVertexCount }}</span>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="模式">
              <el-radio-group v-model="mode" size="small">
                <el-radio-button value="planar">planar</el-radio-button>
                <el-radio-button value="tracing">tracing</el-radio-button>
                <el-radio-button value="radial">radial</el-radio-button>
              </el-radio-group>
            </el-descriptions-item>
            <el-descriptions-item label="分辨率 (mm)">
              <el-input-number v-model="resolution" :min="0.01" :step="0.1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item v-if="mode === 'radial'" label="角度步距 (deg)">
              <el-input-number v-model="rotationStep" :min="0.1" :step="0.5" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="X 步距 (grid)">
              <el-input-number v-model="xStep" :min="1" :step="1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="Y 步距 (grid)">
              <el-input-number v-model="yStep" :min="1" :step="1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item v-if="mode === 'tracing'" label="Tracing 步长">
              <el-input-number v-model="tracingStep" :min="0.01" :step="0.1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="地板 Z">
              <el-input-number v-model="zFloor" :step="1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="grip 桥接">
              <el-switch v-model="gripBridgeOn" size="small" @change="onGripBridgeToggle" />
              <span class="hint" style="margin-left: 6px">raster-path-main</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div v-if="mode === 'tracing'" style="margin-top: 10px">
          <div class="hint" style="margin-bottom: 4px">Tracing 路径(JSON): [{"points":[[x,y],[x,y],...]}]</div>
          <el-input v-model="tracingPathsText" type="textarea" :rows="6" placeholder='[{"points":[[0,0],[20,0],[20,20]]}]' />
          <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap">
            <el-button size="small" plain @click="onFillTracingSampleRect">矩形示例</el-button>
            <el-button size="small" plain @click="onFillTracingSampleSpiral">螺旋示例</el-button>
          </div>
        </div>

        <div v-if="mode === 'planar'" style="margin-top: 10px">
          <div class="hint">grip 基线：</div>
          <div class="hint" style="margin-top: 4px; font-size: 12px">{{ gripPlanarHint }}</div>
          <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap">
            <el-button size="small" plain @click="onApplyGripPlanarBaseline">grip planar 基线</el-button>
            <el-button size="small" plain @click="onApplyGripFastDev">快速 dev 预设</el-button>
            <el-button size="small" type="primary" plain :loading="gripStlLoading" @click="onLoadGripBaselineStl">
              grip 基线 STL
            </el-button>
            <el-button size="small" plain :disabled="!canRun || running" @click="onGripBaselineFullRun">
              基线一键（STL+参数+生成）
            </el-button>
          </div>
        </div>

        <div v-if="mode === 'radial'" style="margin-top: 10px">
          <div class="hint">radial 预设：</div>
          <div class="hint" style="margin-top: 4px; font-size: 12px">{{ gripRadialHint }}</div>
          <div style="display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap">
            <el-button size="small" plain @click="onApplyGripRadialBaseline">grip radial 基线</el-button>
            <el-button size="small" plain :loading="gripStlLoading" @click="onLoadGripBaselineStl">grip 基线 STL</el-button>
            <el-button size="small" plain :disabled="!canRun || running" @click="onGripRadialBaselineFullRun">
              radial 基线一键
            </el-button>
            <el-button size="small" plain @click="onSetRadialPresetFine">精细(1deg)</el-button>
            <el-button size="small" plain @click="onSetRadialPresetNormal">标准(5deg)</el-button>
            <el-button size="small" plain @click="onSetRadialPresetFast">快速(10deg)</el-button>
          </div>
        </div>

        <div v-if="running" style="margin-top: 10px">
          <div class="hint" style="margin-bottom: 4px">
            生成中：{{ runPhase || '…' }}（{{ runPercent }}%）
          </div>
          <el-progress :percentage="runPercent" :stroke-width="10" />
        </div>

        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap">
          <el-button size="small" type="success" :disabled="!canRun" :loading="running" @click="onRun">
            生成栅格刀路（STL）
          </el-button>
          <el-button size="small" plain :disabled="!canRun || running" @click="onCompareCpuGpu">
            GPU/CPU 对比自检
          </el-button>
          <el-button size="small" plain :disabled="!canRun || running" @click="onGpuBatchCheck">
            GPU 批跑自检(5次)
          </el-button>
          <el-button size="small" plain :disabled="!result || running" @click="onGripBaselineParity">
            grip 基线 checksum
          </el-button>
          <el-button size="small" plain :disabled="!canRun || running" @click="onCompareClipVsGrip">
            clip↔grip 对比
          </el-button>
          <el-button size="small" plain :disabled="!result" @click="onExportJson">导出 JSON</el-button>
          <el-button size="small" plain :disabled="!result" @click="onExportGcode">导出 G-code</el-button>
          <el-button size="small" plain :disabled="!canCopyRasterGcode" @click="onCopyRasterGcode">复制 G-code</el-button>
          <el-button size="small" plain :disabled="!compareReport" @click="onCopyCompareReport">复制报告</el-button>
          <el-button size="small" type="success" plain :disabled="!result" @click="onSaveRasterToCarvera">保存 Carvera Job</el-button>
          <el-button size="small" type="success" plain :disabled="!result" @click="onSaveRasterToGridBot">保存 GridBot Job</el-button>
        </div>

        <div v-if="result" class="hint" style="margin-top: 10px">
          输出：paths={{ result.summary.pathCount }} points={{ result.summary.pointCount }}
          <span v-if="result.summary.engine">
            / engine={{ result.summary.engine }} / {{ (result.summary.elapsedMs || 0).toFixed(1) }}ms
          </span>
          <span v-if="result.summary.gripBridge"> / grip-bridge</span>
          <span v-if="result.summary.gpuBufferPool">
            / pool(h={{ result.summary.gpuBufferPool.hits }}, m={{ result.summary.gpuBufferPool.misses }}, r={{ result.summary.gpuBufferPool.reuses }}, a={{ result.summary.gpuBufferPool.newAllocs }})
          </span>
          <span v-if="result.summary.gpuStagesMs">
            / gpu(ms r={{ result.summary.gpuStagesMs.rasterize.toFixed(1) }}, t={{ result.summary.gpuStagesMs.toolpath.toFixed(1) }}, tr={{ result.summary.gpuStagesMs.tracing.toFixed(1) }}, total={{ result.summary.gpuStagesMs.totalGpu.toFixed(1) }})
          </span>
          <span v-if="result.summary.tracingBudget">
            / tracingBudget(max={{ result.summary.tracingBudget.maxPoints }}, n={{ result.summary.tracingBudget.normalizedPoints }}, s={{ result.summary.tracingBudget.sampledPoints }}, f={{ result.summary.tracingBudget.finalPoints }}, scale={{ result.summary.tracingBudget.fallbackScale }}, applied={{ result.summary.tracingBudget.budgetApplied ? 'Y' : 'N' }})
          </span>
        </div>
        <pre
          v-if="compareReport"
          data-testid="raster-parity-report"
          class="preview-text"
          style="margin-top: 8px"
        >{{ compareReport }}</pre>

        <el-divider />

        <div class="pane-title" style="padding: 4px 0; border: none">最近任务</div>
        <div class="pane-body" style="padding-top: 4px">
          <el-empty v-if="!store.recentJobs.length" description="暂无历史任务" />
          <el-table v-else :data="store.recentJobs" size="small" border height="180">
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column label="时间" min-width="160">
              <template #default="scope">
                {{ new Date(scope.row.createdAt).toLocaleString() }}
              </template>
            </el-table-column>
            <el-table-column label="尺寸" width="120">
              <template #default="scope">
                <span v-if="scope.row.input.width && scope.row.input.height">
                  {{ scope.row.input.width }}×{{ scope.row.input.height }}
                </span>
                <span v-else>{{ scope.row.input.terrainVertexCount || 0 }}/{{ scope.row.input.toolVertexCount || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="概览" min-width="140">
              <template #default="scope">
                paths={{ scope.row.summary.pathCount }} / pts={{ scope.row.summary.pointCount }}
                <span v-if="scope.row.summary.engine"> / {{ scope.row.summary.engine }}</span>
                <span v-if="buildTracingTelemetry(scope.row.summary)">
                  / sig={{ buildTracingTelemetry(scope.row.summary)?.budgetSignature }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="scope">
                <el-button size="small" text @click="onLoadFromRecent(scope.row)">载入配置</el-button>
                <el-button size="small" text @click="onReexportRecentJson(scope.row)">再次导出</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="store.recentJobs.length" style="margin-top: 8px">
            <el-button size="small" plain @click="onClearRecentJobs">清空最近任务</el-button>
          </div>
        </div>
      </div>
    </el-aside>

    <el-container class="raster-center">
      <el-main class="raster-main raster-main-center">
        <div class="pane-title">结果预览</div>
        <div v-if="!result" class="pane-body hint">尚未生成刀路。</div>
        <GcodePreviewPanel
          layout="compact"
          kind="raster"
          :job-gcode="rasterViewportGcode"
          :tool-position="rasterViewportTool"
          :stem-color="rasterViewportStem"
          :toolbar-hint="result ? '3D 折线：由 raster paths 合成 G0/G1（共用 Carvera/FDM 视口基建）。' : '生成刀路后显示 3D 折线与下方 2D 预览。'"
        />
        <div v-if="result" class="pane-body raster-2d-block">
            <div class="hint" style="margin-bottom: 6px">2D 预览（XY 轨迹，颜色映射 Z）。</div>
            <div class="preview-wrap">
              <canvas ref="canvasRef" class="preview-canvas"></canvas>
            </div>
            <pre class="preview-text">{{ previewText }}</pre>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { useRasterStore } from '@/stores/useRasterStore'
import { useCarveraStore } from '@/stores/useCarveraStore'
import { useGridBotStore } from '@/stores/useGridBotStore'
import { createCarveraJobFromBridgeGcode, createGridBotJobFromBridgeGcode } from '@/core/jobs/bridgeGcodeJob'
import {
  GRIP_RASTER_FAST_DEV,
  GRIP_RASTER_PLANAR_BASELINE,
  GRIP_RASTER_RADIAL_BASELINE,
  rasterConfigWithGripPreset,
} from '@/core/raster/rasterGripPresets'
import { gripPlanarBaselineHint, gripRadialBaselineHint } from '@/core/raster/rasterGripBaselineExpectations'
import {
  buildGripBaselineParityReport,
  formatGripBaselineParityReport,
} from '@/core/raster/rasterGripBaselineParity'
import {
  getRasterGripBridgeSessionOverride,
  isRasterGripBridgeEnabled,
  setRasterGripBridgeSessionOverride,
} from '@/core/raster/rasterGripBridgePolicy'
import { flattenRasterPathsZ } from '@/core/raster/rasterGripPathChecksum'
import { stlTriangleCountFromPositions } from '@/core/raster/stlTriangleCount'
import { tryGripBaselineParityBundle } from '@/core/raster/rasterGripBaselineAuto'
import { isGripFastDevRasterConfig } from '@/core/raster/rasterGripFastDevPolicy'
import { publishRasterParityE2e } from '@/core/raster/rasterParityE2eExpose'
import { loadRasterLastRunMeta } from '@/core/raster/rasterLastRunPersist'
import { gripBaselineStlSyncHint, loadGripBaselineStlPair } from '@/core/raster/rasterGripBaselineLoader'
import { runRaster } from '@/api/raster'
import type { RasterMode, RasterPath, RasterResult, RasterTracingPath } from '@/types/raster'
import type { RasterRecentJob } from '@/stores/useRasterStore'
import { useExportActions } from '@/composables/useExportActions'
import { gcodeForClipboard } from '@/core/gcode/gcodeForClipboard'
import GcodePreviewPanel from '@/components/gcode/GcodePreviewPanel.vue'
import { useGcodePathEndToolPosition } from '@/composables/useGcodePathEndToolPosition'
import { buildRasterPathsPreviewSyntheticGcode } from '@/core/raster/rasterPathsPreviewGcode'
import { buildRasterPathsExportGcode } from '@/core/raster/rasterPathsExportGcode'
import { parseTracingPathsJson } from '@/core/raster/tracingPaths'
import { getTracingPathsParseErrorLabel } from '@/core/raster/tracingPathsUi'

const router = useRouter()
const store = useRasterStore()
const carveraStore = useCarveraStore()
const gridbotStore = useGridBotStore()
const { copyText, exportJson, exportText } = useExportActions()
store.loadRecentJobs()

const terrainFileInputRef = ref<HTMLInputElement | null>(null)
const toolFileInputRef = ref<HTMLInputElement | null>(null)

const canvasRef = ref<HTMLCanvasElement | null>(null)

const resolution = computed({
  get: () => store.config.resolution,
  set: (v: number) => store.setConfig({ resolution: v }),
})
const rotationStep = computed({
  get: () => store.config.rotationStep,
  set: (v: number) => store.setConfig({ rotationStep: v }),
})
const mode = computed({
  get: () => store.config.mode,
  set: (v: RasterMode) => store.setMode(v),
})
const xStep = computed({
  get: () => store.config.xStep,
  set: (v: number) => store.setConfig({ xStep: v }),
})
const yStep = computed({
  get: () => store.config.yStep,
  set: (v: number) => store.setConfig({ yStep: v }),
})
const zFloor = computed({
  get: () => store.config.zFloor,
  set: (v: number) => store.setConfig({ zFloor: v }),
})
const tracingStep = computed({
  get: () => store.config.tracingStep,
  set: (v: number) => store.setConfig({ tracingStep: v }),
})

const running = computed(() => store.running)
const runPhase = computed(() => store.runPhase)
const runPercent = computed(() => store.runPercent)
const result = computed<RasterResult | null>(() => store.result)

const rasterViewportGcode = computed(() => {
  const r = result.value
  if (!r?.paths?.length) return ''
  return buildRasterPathsPreviewSyntheticGcode(r)
})

const rasterViewportTool = ref({ x: 0, y: 0, z: 0 })
useGcodePathEndToolPosition(rasterViewportGcode, rasterViewportTool)
const rasterViewportStem = ref(0x13c2c2)

function onLoadFromRecent(job: RasterRecentJob) {
  store.setConfig({ ...job.input.config })
  ElMessage.success('已从历史任务载入配置（参数已更新）')
}

function onReexportRecentJson(job: RasterRecentJob) {
  const payload = {
    input: job.input,
    summary: job.summary,
    tracingTelemetry: buildTracingTelemetry(job.summary),
    analysisFlags: buildAnalysisFlags(job.summary),
    paths: job.paths,
  }
  const name = `raster-reexport-${new Date(job.createdAt).toISOString().replace(/[:.]/g, '-')}.json`
  exportJson(name, payload, '已从历史任务再次导出 JSON')
}

const terrainTriangles = ref<Float32Array | null>(null)
const toolTriangles = ref<Float32Array | null>(null)
const tracingPathsText = ref('')
const compareReport = ref('')
const gripBridgeOn = ref(isRasterGripBridgeEnabled())
const gripStlLoading = ref(false)

function onGripBridgeToggle(v: boolean) {
  setRasterGripBridgeSessionOverride(v)
  ElMessage.success(v ? '已启用 grip raster 桥接（本会话）' : '已使用 clip worker（本会话）')
}

onMounted(() => {
  const session = getRasterGripBridgeSessionOverride()
  if (session !== null) gripBridgeOn.value = session
  const last = loadRasterLastRunMeta()
  if (last) {
    store.setConfig({ ...last.config })
    ElMessage.info(
      `已恢复上次栅格参数（${last.summary.pathCount} paths / grip=${last.summary.gripBridge ? 'Y' : 'N'}）`,
    )
  }
})

const terrainVertexCount = computed(() =>
  terrainTriangles.value ? stlTriangleCountFromPositions(terrainTriangles.value) : 0,
)
const toolVertexCount = computed(() =>
  toolTriangles.value ? stlTriangleCountFromPositions(toolTriangles.value) : 0,
)

const canRun = computed(() => {
  return !!terrainTriangles.value && !!toolTriangles.value && !running.value
})

const previewText = computed(() => {
  const r = result.value
  if (!r) return ''
  const head = r.paths.slice(0, 20)
  const lines: string[] = []
  for (const p of head) {
    const first = p.points[0]
    let zMin = Number.POSITIVE_INFINITY
    let zMax = Number.NEGATIVE_INFINITY
    for (const pt of p.points) {
      if (!pt) continue
      const z = pt[2]
      if (z < zMin) zMin = z
      if (z > zMax) zMax = z
    }
    const z0 = first ? first[2] : 0
    lines.push(
      `z0=${z0.toFixed(3)} z=[${(Number.isFinite(zMin) ? zMin : 0).toFixed(3)}, ${(Number.isFinite(zMax) ? zMax : 0).toFixed(3)}] points=${p.points.length} first=${first?.[0]},${first?.[1]}`,
    )
  }
  if (r.paths.length > head.length) lines.push(`... (${r.paths.length - head.length} more paths)`)
  return lines.join('\n')
})

function drawPaths(ctx: CanvasRenderingContext2D, paths: RasterPath[], width: number, height: number) {
  ctx.clearRect(0, 0, width, height)

  // background
  ctx.fillStyle = '#f5f7fa'
  ctx.fillRect(0, 0, width, height)

  if (paths.length === 0) return

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const p of paths) {
    for (const pt of p.points) {
      const [x, y] = pt
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  const spanX = Math.max(1e-6, maxX - minX)
  const spanY = Math.max(1e-6, maxY - minY)
  const scale = Math.min(width / spanX, height / spanY) * 0.9
  const ox = (width - spanX * scale) / 2
  const oy = (height - spanY * scale) / 2

  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(scale, scale)

  ctx.strokeStyle = '#c0c4cc'
  ctx.lineWidth = 1 / scale
  ctx.strokeRect(0, 0, spanX, spanY)

  function zToStroke(z: number) {
    const range = Math.max(1e-6, Math.abs(zFloor.value))
    const t = Math.min(1, Math.max(0, (z - zFloor.value) / range))
    return `hsl(${220 - 220 * t}, 70%, 45%)`
  }

  // draw paths (segment-colored by point z)
  ctx.lineWidth = 1.2 / scale

  for (const p of paths) {
    if (!p || !p.points || p.points.length < 2) continue

    let prev = p.points[0]
    if (!prev) continue

    for (let j = 1; j < p.points.length; j++) {
      const cur = p.points[j]
      if (!cur) continue

      const zMid = (prev[2] + cur[2]) / 2
      ctx.strokeStyle = zToStroke(zMid)

      ctx.beginPath()
      ctx.moveTo(prev[0] - minX, prev[1] - minY)
      ctx.lineTo(cur[0] - minX, cur[1] - minY)
      ctx.stroke()

      prev = cur
    }
  }

  ctx.restore()
}

function redraw() {
  const c = canvasRef.value
  const r = result.value
  if (!c || !r) return

  const parent = c.parentElement
  if (!parent) return

  const w = Math.max(1, parent.clientWidth)
  const h = Math.max(1, parent.clientHeight)
  c.width = Math.floor(w)
  c.height = Math.floor(h)

  const ctx = c.getContext('2d')
  if (!ctx) return

  drawPaths(ctx, r.paths, c.width, c.height)
}

function onPickTerrainStl() {
  terrainFileInputRef.value?.click()
}

function onPickToolStl() {
  toolFileInputRef.value?.click()
}

async function parseStlToTriangles(file: File): Promise<Float32Array> {
  const buf = await file.arrayBuffer()
  const loader = new STLLoader()
  const geometry = loader.parse(buf)
  const pos = geometry.getAttribute('position')
  const arr = pos.array as ArrayLike<number>
  const out = new Float32Array(arr.length)
  for (let i = 0; i < arr.length; i += 1) out[i] = arr[i] ?? 0
  return out
}

function calcBoundsOfTriangles(triangles: Float32Array) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (let i = 0; i < triangles.length; i += 3) {
    const x = triangles[i] ?? 0
    const y = triangles[i + 1] ?? 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

function onFillTracingSampleRect() {
  const t = terrainTriangles.value
  if (!t) {
    ElMessage.info('请先导入地形 STL')
    return
  }
  const b = calcBoundsOfTriangles(t)
  const padX = (b.maxX - b.minX) * 0.15
  const padY = (b.maxY - b.minY) * 0.15
  const x0 = b.minX + padX
  const x1 = b.maxX - padX
  const y0 = b.minY + padY
  const y1 = b.maxY - padY
  tracingPathsText.value = JSON.stringify([{ points: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]] }], null, 2)
  ElMessage.success('已填充矩形 tracing 示例')
}

function onFillTracingSampleSpiral() {
  const t = terrainTriangles.value
  if (!t) {
    ElMessage.info('请先导入地形 STL')
    return
  }
  const b = calcBoundsOfTriangles(t)
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  const rMax = Math.min(b.maxX - b.minX, b.maxY - b.minY) * 0.4
  const turns = 3
  const steps = 160
  const points: Array<[number, number]> = []
  for (let i = 0; i <= steps; i += 1) {
    const t01 = i / steps
    const angle = t01 * Math.PI * 2 * turns
    const r = rMax * (1 - t01)
    points.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r])
  }
  tracingPathsText.value = JSON.stringify([{ points }], null, 2)
  ElMessage.success('已填充螺旋 tracing 示例')
}

function onSetRadialPresetFine() {
  store.setConfig({ rotationStep: 1, xStep: 2, yStep: 1 })
  ElMessage.success('已设置 radial 精细预设')
}

function onSetRadialPresetNormal() {
  store.setConfig({ rotationStep: 5, xStep: 5, yStep: 1 })
  ElMessage.success('已设置 radial 标准预设')
}

function onSetRadialPresetFast() {
  store.setConfig({ rotationStep: 10, xStep: 8, yStep: 1 })
  ElMessage.success('已设置 radial 快速预设')
}

function onApplyGripPlanarBaseline() {
  store.setConfig(rasterConfigWithGripPreset(GRIP_RASTER_PLANAR_BASELINE))
  ElMessage.success('已应用 grip planar 基线参数（resolution 0.05）')
}

function onApplyGripFastDev() {
  store.setConfig(rasterConfigWithGripPreset(GRIP_RASTER_FAST_DEV))
  ElMessage.info('已应用快速 dev 栅格参数（非 grip 基线 checksum，仅用于交互调试）')
}

function onApplyGripRadialBaseline() {
  store.setConfig(rasterConfigWithGripPreset(GRIP_RASTER_RADIAL_BASELINE))
  ElMessage.success('已应用 grip radial 基线（resolution 0.1, 1°）')
}

async function onLoadGripBaselineStl() {
  gripStlLoading.value = true
  try {
    const pair = await loadGripBaselineStlPair()
    terrainTriangles.value = pair.terrainTriangles
    toolTriangles.value = pair.toolTriangles
    store.result = null
    const msg = pair.meshMatch
      ? `已加载 grip 基线 STL（${pair.terrainVertexCount}/${pair.toolVertexCount} 顶点，匹配）`
      : `已加载 STL（地形 ${pair.terrainVertexCount} / 刀具 ${pair.toolVertexCount} 顶点，与 grip 基线不完全一致）`
    ElMessage.success(msg)
  } catch (e: unknown) {
    ElMessage.error(`${gripBaselineStlSyncHint()} — ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    gripStlLoading.value = false
  }
}

async function onGripBaselineFullRun() {
  onApplyGripPlanarBaseline()
  gripBridgeOn.value = true
  setRasterGripBridgeSessionOverride(true)
  await onLoadGripBaselineStl()
  if (!terrainTriangles.value || !toolTriangles.value) return
  await onRun()
}

async function onGripRadialBaselineFullRun() {
  onApplyGripRadialBaseline()
  gripBridgeOn.value = true
  setRasterGripBridgeSessionOverride(true)
  await onLoadGripBaselineStl()
  if (!terrainTriangles.value || !toolTriangles.value) return
  await onRun()
}

const gripPlanarHint = gripPlanarBaselineHint()
const gripRadialHint = gripRadialBaselineHint()

function rasterBridgeGcodeText(): string | null {
  const r = result.value
  if (!r?.paths?.length) return null
  return buildRasterPathsExportGcode(r)
}

const canCopyRasterGcode = computed(() => !!rasterBridgeGcodeText())

function onSaveRasterToCarvera() {
  const text = rasterBridgeGcodeText()
  if (!text) return
  const job = createCarveraJobFromBridgeGcode({
    mode: 'RASTER',
    gcodeText: text,
    namePrefix: 'raster',
    process: store.config.mode,
  })
  void carveraStore.addJob(job)
  router.push('/carvera')
  ElMessage.success('已保存为 Carvera Job')
}

function onSaveRasterToGridBot() {
  const text = rasterBridgeGcodeText()
  if (!text) return
  const job = createGridBotJobFromBridgeGcode({
    mode: 'RASTER',
    gcodeText: text,
    namePrefix: 'raster',
    process: store.config.mode,
  })
  void gridbotStore.saveJob(job)
  router.push('/gridbot')
  ElMessage.success('已保存为 GridBot Job')
}

async function onTerrainFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    terrainTriangles.value = await parseStlToTriangles(file)
    store.result = null
    ElMessage.success(`已导入地形 STL：${file.name}（顶点 ${terrainVertexCount.value}）`)
  } catch (err: any) {
    ElMessage.error(`地形 STL 解析失败：${err?.message ?? String(err)}`)
  } finally {
    input.value = ''
  }
}

async function onToolFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    toolTriangles.value = await parseStlToTriangles(file)
    store.result = null
    ElMessage.success(`已导入刀具 STL：${file.name}（顶点 ${toolVertexCount.value}）`)
  } catch (err: any) {
    ElMessage.error(`刀具 STL 解析失败：${err?.message ?? String(err)}`)
  } finally {
    input.value = ''
  }
}

async function onRun() {
  if (!terrainTriangles.value || !toolTriangles.value) return
  if (store.running) return
  store.result = null
  try {
    let tracingPaths: RasterTracingPath[] | undefined
    if (mode.value === 'tracing') {
      try {
        tracingPaths = parseTracingPathsJson(tracingPathsText.value)
      } catch (err: any) {
        ElMessage.error(`Tracing 路径 JSON 无效：${getTracingPathsParseErrorLabel(err)}`)
        return
      }
    }
    await store.runRaster({
      terrainTriangles: terrainTriangles.value,
      toolTriangles: toolTriangles.value,
      config: {
        ...store.config,
      },
      tracingPaths,
    })
    await nextTick()
    redraw()
    const autoParity = store.result
      ? tryGripBaselineParityBundle(
          store.result,
          store.config.mode,
          terrainVertexCount.value,
          toolVertexCount.value,
        )
      : null
    if (autoParity) {
      compareReport.value = autoParity.text
      publishRasterParityE2e(autoParity.report, autoParity.text)
    }
    ElMessage.success(
      autoParity && autoParity.includes('MISMATCH')
        ? '已生成栅格刀路（基线 checksum 不一致，见报告）'
        : '已生成栅格刀路（STL）',
    )
  } catch (e: any) {
    ElMessage.error(`生成失败：${e?.message ?? String(e)}`)
  } finally {
    // no-op
  }
}

function buildTracingPathsSafe(): RasterTracingPath[] | undefined {
  if (mode.value !== 'tracing') return undefined
  return parseTracingPathsJson(tracingPathsText.value)
}

function flattenZ(result: RasterResult): number[] {
  return flattenRasterPathsZ(result.paths)
}

function onGripBaselineParity() {
  const r = result.value
  if (!r) {
    ElMessage.info('请先生成刀路')
    return
  }
  const report = buildGripBaselineParityReport(
    r,
    store.config.mode,
    terrainVertexCount.value,
    toolVertexCount.value,
  )
  const text = formatGripBaselineParityReport(report)
  compareReport.value = text
  publishRasterParityE2e(report, text)
  if (report.checksumMatch) ElMessage.success('checksum 与 grip 基线一致')
  else ElMessage.warning('checksum 与 grip 基线不一致（见下方报告）')
}

async function onCompareClipVsGrip() {
  if (!terrainTriangles.value || !toolTriangles.value) return
  let tracingPaths: RasterTracingPath[] | undefined
  try {
    tracingPaths = buildTracingPathsSafe()
  } catch (err: any) {
    ElMessage.error(`Tracing 路径 JSON 无效：${getTracingPathsParseErrorLabel(err)}`)
    return
  }
  if (store.config.mode === 'tracing') {
    ElMessage.info('tracing 模式请用 GPU/CPU 对比')
    return
  }

  const prevSession = getRasterGripBridgeSessionOverride()
  const base = {
    terrainTriangles: terrainTriangles.value,
    toolTriangles: toolTriangles.value,
    config: { ...store.config },
    tracingPaths,
    preferredEngine: 'webgpu' as const,
  }

  compareReport.value = 'clip↔grip 对比中…'
  try {
    setRasterGripBridgeSessionOverride(false)
    const clipRes = await runRaster(base)
    setRasterGripBridgeSessionOverride(true)
    const gripRes = await runRaster(base)
    const clipZ = flattenZ(clipRes)
    const gripZ = flattenZ(gripRes)
    const n = Math.min(clipZ.length, gripZ.length)
    let maxAbs = 0
    let sumAbs = 0
    for (let i = 0; i < n; i += 1) {
      const d = Math.abs((clipZ[i] ?? 0) - (gripZ[i] ?? 0))
      if (d > maxAbs) maxAbs = d
      sumAbs += d
    }
    compareReport.value =
      `clip: paths=${clipRes.summary.pathCount} pts=${clipRes.summary.pointCount} engine=${clipRes.summary.engine}\n` +
      `grip: paths=${gripRes.summary.pathCount} pts=${gripRes.summary.pointCount} gripBridge=${gripRes.summary.gripBridge ? 'Y' : 'N'}\n` +
      `Z samples=${n} mean|dz|=${(n ? sumAbs / n : 0).toExponential(3)} max|dz|=${maxAbs.toExponential(3)}`
    ElMessage.success('已完成 clip↔grip 对比')
  } finally {
    setRasterGripBridgeSessionOverride(prevSession)
    gripBridgeOn.value = isRasterGripBridgeEnabled()
  }
}

function formatTracingBudget(summary: RasterResult['summary']): string {
  const b = summary.tracingBudget
  if (!b) return 'none'
  return `budget(max=${b.maxPoints}, n=${b.normalizedPoints}, s=${b.sampledPoints}, f=${b.finalPoints}, scale=${b.fallbackScale}, applied=${b.budgetApplied ? 'Y' : 'N'})`
}

function buildTracingTelemetry(summary: RasterResult['summary']) {
  const b = summary.tracingBudget
  if (!b) return null
  const pointCompressionRatio = b.sampledPoints > 0 ? Number((b.finalPoints / b.sampledPoints).toFixed(4)) : 1
  const budgetSignature = [
    `applied:${b.budgetApplied ? 1 : 0}`,
    `scale:${b.fallbackScale}`,
    `ratio:${pointCompressionRatio.toFixed(4)}`,
    `pts:${b.normalizedPoints}/${b.sampledPoints}/${b.finalPoints}/${b.maxPoints}`,
  ].join('|')
  return {
    budgetApplied: b.budgetApplied,
    fallbackScale: b.fallbackScale,
    pointCompressionRatio,
    budgetSignature,
    points: {
      max: b.maxPoints,
      normalized: b.normalizedPoints,
      sampled: b.sampledPoints,
      final: b.finalPoints,
    },
  }
}

function buildAnalysisFlags(summary: RasterResult['summary']) {
  const b = summary.tracingBudget
  if (!b) {
    return {
      budgetLimited: false,
      budgetApplied: false,
      fallbackScale: 1,
      pointCompressionRatio: 1,
    }
  }
  const pointCompressionRatio = b.sampledPoints > 0 ? Number((b.finalPoints / b.sampledPoints).toFixed(4)) : 1
  const budgetLimited = b.budgetApplied || b.fallbackScale > 1 || b.finalPoints < b.sampledPoints
  return {
    budgetLimited,
    budgetApplied: b.budgetApplied,
    fallbackScale: b.fallbackScale,
    pointCompressionRatio,
  }
}

async function onCompareCpuGpu() {
  if (!terrainTriangles.value || !toolTriangles.value) return
  let tracingPaths: RasterTracingPath[] | undefined
  try {
    tracingPaths = buildTracingPathsSafe()
  } catch (err: any) {
    ElMessage.error(`Tracing 路径 JSON 无效：${getTracingPathsParseErrorLabel(err)}`)
    return
  }

  compareReport.value = ''
  const base = {
    terrainTriangles: terrainTriangles.value,
    toolTriangles: toolTriangles.value,
    config: { ...store.config },
    tracingPaths,
  }

  const cpu = await runRaster({ ...base, preferredEngine: 'cpu' })
  const gpu = await runRaster({ ...base, preferredEngine: 'webgpu' })
  const cpuZ = flattenZ(cpu)
  const gpuZ = flattenZ(gpu)
  const n = Math.min(cpuZ.length, gpuZ.length)
  let maxAbs = 0
  let sumAbs = 0
  for (let i = 0; i < n; i += 1) {
    const d = Math.abs((cpuZ[i] ?? 0) - (gpuZ[i] ?? 0))
    if (d > maxAbs) maxAbs = d
    sumAbs += d
  }
  const meanAbs = n > 0 ? sumAbs / n : 0
  compareReport.value =
    `CPU: engine=${cpu.summary.engine} ${(cpu.summary.elapsedMs ?? 0).toFixed(1)}ms paths=${cpu.summary.pathCount} points=${cpu.summary.pointCount} ${formatTracingBudget(cpu.summary)}\n` +
    `CPU tracingSig=${buildTracingTelemetry(cpu.summary)?.budgetSignature ?? 'none'}\n` +
    `GPU: engine=${gpu.summary.engine} ${(gpu.summary.elapsedMs ?? 0).toFixed(1)}ms paths=${gpu.summary.pathCount} points=${gpu.summary.pointCount} ${formatTracingBudget(gpu.summary)}\n` +
    `GPU tracingSig=${buildTracingTelemetry(gpu.summary)?.budgetSignature ?? 'none'}\n` +
    `Compare: samples=${n} mean|dz|=${meanAbs.toExponential(3)} max|dz|=${maxAbs.toExponential(3)}`
  ElMessage.success('已完成 GPU/CPU 对比自检')
}

async function onGpuBatchCheck() {
  if (!terrainTriangles.value || !toolTriangles.value) return
  let tracingPaths: RasterTracingPath[] | undefined
  try {
    tracingPaths = buildTracingPathsSafe()
  } catch (err: any) {
    ElMessage.error(`Tracing 路径 JSON 无效：${getTracingPathsParseErrorLabel(err)}`)
    return
  }

  compareReport.value = ''
  const runs = 5
  const base = {
    terrainTriangles: terrainTriangles.value,
    toolTriangles: toolTriangles.value,
    config: { ...store.config },
    tracingPaths,
    preferredEngine: 'webgpu' as const,
  }

  const elapsed: number[] = []
  const hits: number[] = []
  const misses: number[] = []
  const reuses: number[] = []
  const newAllocs: number[] = []
  const hotElapsed: number[] = []
  const hotHits: number[] = []
  const hotMisses: number[] = []
  const hotReuses: number[] = []
  const hotNewAllocs: number[] = []
  const hotGpuRasterize: number[] = []
  const hotGpuToolpath: number[] = []
  const hotGpuTracing: number[] = []
  const hotGpuTotal: number[] = []
  const hotBudgetApplied: number[] = []
  const hotBudgetScale: number[] = []
  const hotBudgetFinalPts: number[] = []
  const hotBudgetSignatures: string[] = []
  let engineFallbackCount = 0

  const cold = await runRaster({ ...base, resetGpuBufferPool: true })
  const coldElapsed = cold.summary.elapsedMs ?? 0
  const coldHits = cold.summary.gpuBufferPool?.hits ?? 0
  const coldMisses = cold.summary.gpuBufferPool?.misses ?? 0
  const coldReuses = cold.summary.gpuBufferPool?.reuses ?? 0
  const coldNewAllocs = cold.summary.gpuBufferPool?.newAllocs ?? 0
  const coldGpuRasterize = cold.summary.gpuStagesMs?.rasterize ?? 0
  const coldGpuToolpath = cold.summary.gpuStagesMs?.toolpath ?? 0
  const coldGpuTracing = cold.summary.gpuStagesMs?.tracing ?? 0
  const coldGpuTotal = cold.summary.gpuStagesMs?.totalGpu ?? 0
  const coldBudget = cold.summary.tracingBudget
  const coldSig = buildTracingTelemetry(cold.summary)?.budgetSignature ?? 'none'
  if (cold.summary.engine !== 'webgpu') engineFallbackCount += 1

  for (let i = 0; i < runs; i += 1) {
    const res = await runRaster(base)
    elapsed.push(res.summary.elapsedMs ?? 0)
    hotElapsed.push(res.summary.elapsedMs ?? 0)
    if (res.summary.engine !== 'webgpu') engineFallbackCount += 1
    hits.push(res.summary.gpuBufferPool?.hits ?? 0)
    misses.push(res.summary.gpuBufferPool?.misses ?? 0)
    reuses.push(res.summary.gpuBufferPool?.reuses ?? 0)
    newAllocs.push(res.summary.gpuBufferPool?.newAllocs ?? 0)
    hotHits.push(res.summary.gpuBufferPool?.hits ?? 0)
    hotMisses.push(res.summary.gpuBufferPool?.misses ?? 0)
    hotReuses.push(res.summary.gpuBufferPool?.reuses ?? 0)
    hotNewAllocs.push(res.summary.gpuBufferPool?.newAllocs ?? 0)
    hotGpuRasterize.push(res.summary.gpuStagesMs?.rasterize ?? 0)
    hotGpuToolpath.push(res.summary.gpuStagesMs?.toolpath ?? 0)
    hotGpuTracing.push(res.summary.gpuStagesMs?.tracing ?? 0)
    hotGpuTotal.push(res.summary.gpuStagesMs?.totalGpu ?? 0)
    hotBudgetApplied.push(res.summary.tracingBudget?.budgetApplied ? 1 : 0)
    hotBudgetScale.push(res.summary.tracingBudget?.fallbackScale ?? 1)
    hotBudgetFinalPts.push(res.summary.tracingBudget?.finalPoints ?? res.summary.pointCount)
    hotBudgetSignatures.push(buildTracingTelemetry(res.summary)?.budgetSignature ?? 'none')
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const line = (arr: number[]) => arr.map((v) => v.toFixed(1)).join(', ')
  const lineInt = (arr: number[]) => arr.map((v) => String(Math.round(v))).join(', ')
  const hotAvgElapsed = avg(hotElapsed)
  const hotAvgMisses = avg(hotMisses)
  const hotAvgNewAllocs = avg(hotNewAllocs)
  const hotAvgGpuRasterize = avg(hotGpuRasterize)
  const hotAvgGpuToolpath = avg(hotGpuToolpath)
  const hotAvgGpuTracing = avg(hotGpuTracing)
  const hotAvgGpuTotal = avg(hotGpuTotal)
  const improveElapsedPct = coldElapsed > 1e-9 ? ((coldElapsed - hotAvgElapsed) / coldElapsed) * 100 : 0
  const improveMissPct = coldMisses > 1e-9 ? ((coldMisses - hotAvgMisses) / coldMisses) * 100 : 0
  const improveAllocPct = coldNewAllocs > 1e-9 ? ((coldNewAllocs - hotAvgNewAllocs) / coldNewAllocs) * 100 : 0
  const improveGpuRasterizePct = coldGpuRasterize > 1e-9 ? ((coldGpuRasterize - hotAvgGpuRasterize) / coldGpuRasterize) * 100 : 0
  const improveGpuToolpathPct = coldGpuToolpath > 1e-9 ? ((coldGpuToolpath - hotAvgGpuToolpath) / coldGpuToolpath) * 100 : 0
  const improveGpuTracingPct = coldGpuTracing > 1e-9 ? ((coldGpuTracing - hotAvgGpuTracing) / coldGpuTracing) * 100 : 0
  const improveGpuTotalPct = coldGpuTotal > 1e-9 ? ((coldGpuTotal - hotAvgGpuTotal) / coldGpuTotal) * 100 : 0
  const positivePool = hotAvgMisses < coldMisses || hotAvgNewAllocs < coldNewAllocs
  const positiveElapsed = hotAvgElapsed < coldElapsed
  const coldBudgetApplied = coldBudget?.budgetApplied ?? false
  const hotBudgetAppliedRate = avg(hotBudgetApplied)
  const hotBudgetScaleAvg = avg(hotBudgetScale)
  let assessment = 'Assessment: '
  if (positivePool && positiveElapsed) {
    assessment += `warm cache effective (elapsed ${improveElapsedPct.toFixed(1)}%, miss ${improveMissPct.toFixed(1)}%, alloc ${improveAllocPct.toFixed(1)}% improved)`
  } else if (positivePool) {
    assessment += `pool improves allocation/miss, elapsed not improved yet (elapsed ${improveElapsedPct.toFixed(1)}%)`
  } else if (positiveElapsed) {
    assessment += `elapsed improves but pool miss/alloc not reduced enough`
  } else {
    assessment += `no clear warm-cache gain yet; inspect mode/input and fallback count`
  }
  if (coldBudgetApplied || hotBudgetAppliedRate > 0) {
    assessment += ` | budget-limited run (cold=${coldBudgetApplied ? 'Y' : 'N'}, hotRate=${(
      hotBudgetAppliedRate * 100
    ).toFixed(1)}%, hotScaleAvg=${hotBudgetScaleAvg.toFixed(2)})`
  }
  compareReport.value =
    `GPU Cold/Hot Batch: hotRuns=${runs}, fallback=${engineFallbackCount}\n` +
    `cold elapsed=${coldElapsed.toFixed(1)}ms | pool(h=${coldHits}, m=${coldMisses}, r=${coldReuses}, a=${coldNewAllocs})\n` +
    `cold tracing budget: ${coldBudget ? `applied=${coldBudget.budgetApplied ? 'Y' : 'N'}, scale=${coldBudget.fallbackScale}, final=${coldBudget.finalPoints}` : 'none'}\n` +
    `cold tracingSig=${coldSig}\n` +
    `cold gpu(ms): r=${coldGpuRasterize.toFixed(1)}, t=${coldGpuToolpath.toFixed(1)}, tr=${coldGpuTracing.toFixed(1)}, total=${coldGpuTotal.toFixed(1)}\n` +
    `hot elapsed(ms): [${line(hotElapsed)}], avg=${avg(hotElapsed).toFixed(1)}\n` +
    `hot pool.hits: [${lineInt(hotHits)}], avg=${avg(hotHits).toFixed(1)}\n` +
    `hot pool.misses: [${lineInt(hotMisses)}], avg=${avg(hotMisses).toFixed(1)}\n` +
    `hot pool.reuses: [${lineInt(hotReuses)}], avg=${avg(hotReuses).toFixed(1)}\n` +
    `hot pool.newAllocs: [${lineInt(hotNewAllocs)}], avg=${avg(hotNewAllocs).toFixed(1)}\n` +
    `hot gpu.rasterize(ms): [${line(hotGpuRasterize)}], avg=${hotAvgGpuRasterize.toFixed(1)}, improve=${improveGpuRasterizePct.toFixed(1)}%\n` +
    `hot gpu.toolpath(ms): [${line(hotGpuToolpath)}], avg=${hotAvgGpuToolpath.toFixed(1)}, improve=${improveGpuToolpathPct.toFixed(1)}%\n` +
    `hot gpu.tracing(ms): [${line(hotGpuTracing)}], avg=${hotAvgGpuTracing.toFixed(1)}, improve=${improveGpuTracingPct.toFixed(1)}%\n` +
    `hot gpu.total(ms): [${line(hotGpuTotal)}], avg=${hotAvgGpuTotal.toFixed(1)}, improve=${improveGpuTotalPct.toFixed(1)}%\n` +
    `hot tracing budget.applied: [${lineInt(hotBudgetApplied)}], avg=${avg(hotBudgetApplied).toFixed(2)}\n` +
    `hot tracing budget.scale: [${line(hotBudgetScale)}], avg=${avg(hotBudgetScale).toFixed(2)}\n` +
    `hot tracing budget.finalPts: [${lineInt(hotBudgetFinalPts)}], avg=${avg(hotBudgetFinalPts).toFixed(1)}\n` +
    `hot tracingSig: [${hotBudgetSignatures.join(', ')}]\n` +
    `all elapsed(ms): [${line(elapsed)}]\n` +
    `all pool.hits: [${lineInt(hits)}], misses: [${lineInt(misses)}], reuses: [${lineInt(reuses)}], newAllocs: [${lineInt(newAllocs)}]\n` +
    assessment
  ElMessage.success('已完成 GPU 冷热批跑自检')
}

function onExportJson() {
  const r = result.value
  if (!r) return

  const payload = {
    input: {
      terrainVertexCount: terrainVertexCount.value,
      toolVertexCount: toolVertexCount.value,
      config: { ...store.config },
    },
    summary: r.summary,
    tracingTelemetry: buildTracingTelemetry(r.summary),
    analysisFlags: buildAnalysisFlags(r.summary),
    paths: r.paths,
  }

  const name = `raster-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  exportJson(name, payload, '已导出 JSON')

  const ts = Date.now()
  store.addRecentJob({
    id: `raster-${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: ts,
    name,
    input: {
      terrainVertexCount: terrainVertexCount.value,
      toolVertexCount: toolVertexCount.value,
      config: { ...store.config },
    },
    summary: r.summary,
    paths: r.paths,
  })
}

function onExportGcode() {
  const text = rasterBridgeGcodeText()
  if (!text) return
  const name = `raster-${new Date().toISOString().replace(/[:.]/g, '-')}.gcode`
  exportText(name, text, '已导出 G-code', 'text/plain;charset=utf-8')
}

async function onCopyRasterGcode() {
  const text = rasterBridgeGcodeText()
  if (!text) return
  const { text: clip, truncated } = gcodeForClipboard(text)
  await copyText(clip, truncated ? '已复制 G-code（已截断）' : '已复制 G-code')
}

async function onCopyCompareReport() {
  if (!compareReport.value) return
  await copyText(compareReport.value, '已复制对比报告')
}

function onClearRecentJobs() {
  store.clearRecentJobs()
  ElMessage.info('已清空最近任务')
}

onMounted(() => {
  if (canvasRef.value && result.value) {
    redraw()
  }
})

watch([canvasRef, result], () => {
  if (canvasRef.value && result.value) {
    redraw()
  }
})

onBeforeUnmount(() => {
  const c = canvasRef.value
  if (c) {
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, c.width, c.height)
    }
  }
})
</script>

<style scoped>
.raster-root {
  height: calc(100vh - 60px);
}
.raster-aside {
  background: #fff;
  border-right: 1px solid #dcdfe6;
}
.raster-center {
  background: #f5f7fa;
}
.raster-main {
  padding: 12px;
}
.preview-wrap {
  width: 100%;
  height: 260px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}
.preview-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.pane-title {
  padding: 10px 12px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
}
.pane-body {
  padding: 12px;
}
.hint {
  color: #909399;
}
.preview-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre;
}
</style>
