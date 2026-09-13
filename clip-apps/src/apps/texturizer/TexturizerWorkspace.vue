<template>
  <el-container class="texturizer-root">
    <el-aside width="320px" class="texturizer-aside">
      <div class="pane-title">输入 / 参数</div>
      <div class="pane-body">
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
          <el-button size="small" type="primary" plain @click="onPickStl">导入 STL</el-button>
          <el-button size="small" type="primary" plain @click="onPickTexture">导入纹理</el-button>
          <el-button size="small" plain @click="onApplyGripDefaults">grip 默认参数</el-button>
          <span class="hint">仅支持 STL 网格，纹理将转换为灰度高度图。</span>
          <input ref="fileInputRef" type="file" accept=".stl" style="display: none" @change="onFileChange" />
          <input
            ref="textureInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onTextureFileChange"
          />
        </div>

        <div style="margin-top: 12px">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="顶点数">
              <span v-if="vertexCount">{{ vertexCount }}</span>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="纹理">
              <span v-if="textureInfo">{{ textureInfo.width }} x {{ textureInfo.height }}</span>
              <span v-else>默认棋盘纹理</span>
            </el-descriptions-item>
            <el-descriptions-item label="振幅">
              <el-input-number v-model="amplitude" :min="0" :step="0.1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="频率">
              <el-input-number v-model="frequency" :min="0" :step="0.1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="映射模式">
              <el-select v-model="mappingMode" size="small" style="width: 180px">
                <el-option v-for="m in mappingModeOptions" :key="m.value" :label="m.label" :value="m.value" />
              </el-select>
            </el-descriptions-item>
            <el-descriptions-item label="Scale U / V">
              <div style="display: flex; gap: 6px">
                <el-input-number v-model="scaleU" :min="0.01" :step="0.1" size="small" />
                <el-input-number v-model="scaleV" :min="0.01" :step="0.1" size="small" />
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="Offset U / V">
              <div style="display: flex; gap: 6px">
                <el-input-number v-model="offsetU" :step="0.1" size="small" />
                <el-input-number v-model="offsetV" :step="0.1" size="small" />
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="Rotation (deg)">
              <el-input-number v-model="rotationDeg" :step="1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="Mapping Blend">
              <el-input-number v-model="mappingBlend" :min="0" :max="1" :step="0.05" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="Seam Band Width">
              <el-input-number v-model="seamBandWidth" :min="0" :max="1" :step="0.05" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="Cap Angle">
              <el-input-number v-model="capAngle" :min="0" :max="90" :step="1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="Top/Bottom Angle Limit">
              <div style="display: flex; gap: 6px">
                <el-input-number v-model="topAngleLimit" :min="0" :max="90" :step="1" size="small" />
                <el-input-number v-model="bottomAngleLimit" :min="0" :max="90" :step="1" size="small" />
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="Exclusion Mode">
              <el-select v-model="exclusionMode" size="small" style="width: 180px">
                <el-option label="Exclude Listed Faces" value="exclude" />
                <el-option label="Include Only Listed Faces" value="include" />
              </el-select>
            </el-descriptions-item>
            <el-descriptions-item label="Excluded Faces (JSON)">
              <el-input
                v-model="excludedFacesText"
                type="textarea"
                :rows="3"
                placeholder="[0,1,2] or []"
                size="small"
              />
            </el-descriptions-item>
            <el-descriptions-item label="Subdivision Levels">
              <el-input-number v-model="subdivisionLevels" :min="0" :max="3" :step="1" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="Decimation Ratio">
              <el-input-number v-model="decimationRatio" :min="0.05" :max="1" :step="0.05" size="small" />
            </el-descriptions-item>
            <el-descriptions-item label="Symmetric Displacement">
              <el-switch v-model="symmetricDisplacement" />
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap">
          <el-button size="small" type="success" :disabled="!canRun" :loading="running" @click="onRun">
            应用纹理位移
          </el-button>
          <el-button size="small" plain :disabled="!summary || stlExporting" @click="onExportJson">导出 JSON</el-button>
          <el-select v-model="stlExportFormat" size="small" style="width: 108px; margin-right: 8px">
            <el-option label="二进制 STL" value="binary" />
            <el-option label="ASCII STL" value="ascii" />
          </el-select>
          <el-button size="small" plain :disabled="!summary || stlExporting" :loading="stlExporting" @click="onExportStl">
            导出 STL
          </el-button>
        </div>
        <div v-if="running" class="hint" style="margin-top: 6px">
          阶段：{{ texturizerStageLabel(runStage) }}（{{ Math.round(runProgress * 100) }}%）{{ runProgressMessage ? ` - ${runProgressMessage}` : '' }}
          <el-progress :percentage="Math.round(runProgress * 100)" :stroke-width="10" style="margin-top: 4px" />
        </div>
        <div v-if="stlExporting" class="hint" style="margin-top: 6px">
          STL 导出：{{ Math.round(stlExportProgress * 100) }}%{{ stlExportMessage ? ` - ${stlExportMessage}` : '' }}
          <el-progress :percentage="Math.round(stlExportProgress * 100)" :stroke-width="10" style="margin-top: 4px" />
        </div>

        <div v-if="summary" class="hint" style="margin-top: 10px">
          输出顶点数：{{ summary.vertexCount }} ΔZ: [{{ summary.minDeltaZ.toFixed(3) }},
          {{ summary.maxDeltaZ.toFixed(3) }}]
        </div>
        <div v-if="runMeta" class="hint" style="margin-top: 6px">
          Triangles: pre={{ runMeta.preTriCount }} -> subdiv={{ runMeta.postSubdivTriCount }} -> decimate={{ runMeta.postDecimateTriCount }}
          <el-tag v-if="runMeta.subdivSafetyCapHit" type="danger" size="small" effect="plain" style="margin-left: 6px">
            safety cap hit
          </el-tag>
          <template v-if="runMeta.stageTimingsMs">
            <br />
            Stages(ms): subdiv={{ runMeta.stageTimingsMs.subdivision.toFixed(1) }} / disp={{ runMeta.stageTimingsMs.displacement.toFixed(1) }} / decimate={{ runMeta.stageTimingsMs.decimation.toFixed(1) }} / total={{ runMeta.stageTimingsMs.total.toFixed(1) }}
          </template>
          <template v-if="runMeta.decimationEngine">
            <br />
            Decimation Engine: {{ runMeta.decimationEngine }}
          </template>
          <template v-if="runMeta.decimationSearchMeta">
            <br />
            Decimation Search: iter={{ runMeta.decimationSearchMeta.binaryItersExecuted }}/{{
              runMeta.decimationSearchMeta.binaryItersPlanned
            }}, stop={{ decimationStopReasonLabel(runMeta.decimationSearchMeta.earlyStopReason) }}, diff={{
              runMeta.decimationSearchMeta.finalDiff
            }}
          </template>
        </div>
        <div v-if="normalizedRunWarnings.length" class="hint" style="margin-top: 6px">
          <WarningBadgeList
            :lines="getWarningsTooltipLines(normalizedRunWarnings)"
            :tag-type="getWarningsTagType(normalizedRunWarnings)"
            :tag-label="getWarningsTagLabel(normalizedRunWarnings)"
          />
        </div>

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
            <el-table-column label="概览" min-width="160">
              <template #default="scope">
                ΔZ=[{{ scope.row.summary.minDeltaZ.toFixed(3) }}, {{ scope.row.summary.maxDeltaZ.toFixed(3) }}]
                <template v-if="scope.row.meta">
                  <br />
                  Tri={{ scope.row.meta.preTriCount }}->{{ scope.row.meta.postSubdivTriCount }}->{{ scope.row.meta.postDecimateTriCount }}
                  <el-tag
                    v-if="scope.row.meta.subdivSafetyCapHit"
                    type="danger"
                    size="small"
                    effect="plain"
                    style="margin-left: 6px"
                  >
                    cap
                  </el-tag>
                  <template v-if="scope.row.meta.stageTimingsMs">
                    <br />
                    T={{ scope.row.meta.stageTimingsMs.total.toFixed(1) }}ms
                  </template>
                  <template v-if="scope.row.meta.decimationEngine">
                    <br />
                    E={{ scope.row.meta.decimationEngine }}
                  </template>
                  <template v-if="scope.row.meta.decimationSearchMeta">
                    <br />
                    S={{ scope.row.meta.decimationSearchMeta.binaryItersExecuted }}/{{
                      scope.row.meta.decimationSearchMeta.binaryItersPlanned
                    }} {{ decimationStopReasonLabel(scope.row.meta.decimationSearchMeta.earlyStopReason) }}
                  </template>
                </template>
                <template v-if="getRecentJobWarningUi(scope.row).warnings.length">
                  <br />
                  <WarningBadgeList
                    :lines="getRecentJobWarningUi(scope.row).lines"
                    :tag-type="getRecentJobWarningUi(scope.row).tagType"
                    :tag-label="getRecentJobWarningUi(scope.row).tagLabel"
                  />
                </template>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="scope">
                <el-button size="small" text @click="onLoadFromRecent(scope.row)">载入参数</el-button>
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

    <el-container class="texturizer-center">
      <el-main class="texturizer-main">
        <div class="pane-title">预览</div>
        <div class="pane-body">
          <div v-if="!originalMesh" class="hint">尚未导入 STL。</div>
          <div v-else>
            <div class="hint" style="margin-bottom: 8px">已接入简易 Three.js 预览（positions 更新 + 法线重算）。</div>
            <div class="preview-wrap">
              <canvas ref="canvasRef" class="preview-canvas"></canvas>
            </div>
          </div>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { runTexturizer } from '@/api/texturizer'
import { useTexturizerStore } from '@/stores/useTexturizerStore'
import type { TexturizeResult, TexturizeWarning, TexturizerProgressEvent, TexturizerRunStage } from '@/types/texturizer'
import WarningBadgeList from '@/components/texturizer/WarningBadgeList.vue'
import type { TexturizerRecentJob } from '@/stores/useTexturizerStore'
import {
  resetTexturizerProgressStageWeightOverrides,
  resetTexturizerWarningRuleThresholdOverrides,
  setTexturizerProgressStageWeightOverrides,
  setTexturizerWarningRuleThresholdOverrides,
} from '@/core/texturizer/config'
import { texturizerStageLabel, toTexturizerOverallProgress } from '@/core/texturizer/texturizerOverallProgress'
import {
  installTexturizerDebugApi,
  loadProgressStageWeightOverrides,
  loadWarningRuleOverrides,
} from './warningOverrideStorage'
import { exportNonIndexedTrianglesToStlAsciiBlobAsync } from '@/core/texturizer/stlAsciiExport'
import { exportNonIndexedTrianglesToStlBinaryBlobAsync } from '@/core/texturizer/stlBinaryExport'
import {
  buildRunWarnings,
  getWarningsTagLabel,
  getWarningsTagType,
  getWarningsTooltipLines,
  normalizeWarning,
  type WarningLevel,
} from '@/core/texturizer/warningUi'
import { parseExcludedFacesJson } from '@/core/texturizer/excludedFaces'
import { useExportActions } from '@/composables/useExportActions'
import {
  loadTexturizerLastRunParams,
  saveTexturizerLastRunParams,
} from '@/core/texturizer/texturizerLastRunPersist'
import { applyGripTexturizerUiDefaults } from '@/core/texturizer/texturizerGripDefaults'

const store = useTexturizerStore()
const { exportJson, exportText, exportBlob } = useExportActions()

function applySessionWarningRuleOverrides() {
  try {
    const overrides = loadWarningRuleOverrides(localStorage)
    if (!Object.keys(overrides).length) {
      resetTexturizerWarningRuleThresholdOverrides()
      return
    }
    setTexturizerWarningRuleThresholdOverrides(overrides)
  } catch {
    resetTexturizerWarningRuleThresholdOverrides()
  }
}

function applySessionProgressStageWeightOverrides() {
  try {
    const overrides = loadProgressStageWeightOverrides(localStorage)
    if (!Object.keys(overrides).length) {
      resetTexturizerProgressStageWeightOverrides()
      return
    }
    setTexturizerProgressStageWeightOverrides(overrides)
  } catch {
    resetTexturizerProgressStageWeightOverrides()
  }
}

applySessionWarningRuleOverrides()
applySessionProgressStageWeightOverrides()
if (import.meta.env.DEV) {
  installTexturizerDebugApi(localStorage, window, {
    warningRuleOnChange: (overrides) => {
      if (!Object.keys(overrides).length) {
        resetTexturizerWarningRuleThresholdOverrides()
        return
      }
      setTexturizerWarningRuleThresholdOverrides(overrides)
    },
    progressWeightOnChange: (overrides) => {
      if (!Object.keys(overrides).length) {
        resetTexturizerProgressStageWeightOverrides()
        return
      }
      setTexturizerProgressStageWeightOverrides(overrides)
    },
  })
}
store.loadRecentJobs()

const fileInputRef = ref<HTMLInputElement | null>(null)
const textureInputRef = ref<HTMLInputElement | null>(null)

const canvasRef = ref<HTMLCanvasElement | null>(null)

const vertices = ref<Float32Array | null>(null)
const vertexNormals = ref<Float32Array | null>(null)
const vertexCount = computed(() => (vertices.value ? vertices.value.length / 3 : 0))

const textureInfo = ref<{ width: number; height: number; gray: Uint8Array } | null>(null)

function cloneTextureForWorker(tex: { width: number; height: number; gray: Uint8Array }) {
  return { width: tex.width, height: tex.height, gray: new Uint8Array(tex.gray) }
}

const amplitude = ref(0.5)
const frequency = ref(1)
const mappingMode = ref(6)
const scaleU = ref(1)
const scaleV = ref(1)
const offsetU = ref(0)
const offsetV = ref(0)
const rotationDeg = ref(0)
const mappingBlend = ref(0)
const seamBandWidth = ref(0.5)
const capAngle = ref(20)
const topAngleLimit = ref(0)
const bottomAngleLimit = ref(0)
const exclusionMode = ref<'exclude' | 'include'>('exclude')
const excludedFacesText = ref('[]')
const subdivisionLevels = ref(0)
const decimationRatio = ref(1)
const symmetricDisplacement = ref(false)

const lastParams = loadTexturizerLastRunParams()
if (lastParams) {
  amplitude.value = lastParams.amplitude
  frequency.value = lastParams.frequency
  mappingMode.value = lastParams.mappingMode
  scaleU.value = lastParams.scaleU
  scaleV.value = lastParams.scaleV
  offsetU.value = lastParams.offsetU
  offsetV.value = lastParams.offsetV
  rotationDeg.value = lastParams.rotationDeg
  mappingBlend.value = lastParams.mappingBlend
  seamBandWidth.value = lastParams.seamBandWidth
  capAngle.value = lastParams.capAngle
  topAngleLimit.value = lastParams.topAngleLimit
  bottomAngleLimit.value = lastParams.bottomAngleLimit
  exclusionMode.value = lastParams.exclusionMode
  subdivisionLevels.value = lastParams.subdivisionLevels
  decimationRatio.value = lastParams.decimationRatio
  symmetricDisplacement.value = lastParams.symmetricDisplacement
}

const mappingModeOptions = [
  { value: 5, label: 'Triplanar' },
  { value: 6, label: 'Cubic' },
  { value: 3, label: 'Cylindrical' },
  { value: 4, label: 'Spherical' },
  { value: 0, label: 'Planar XY' },
  { value: 1, label: 'Planar XZ' },
  { value: 2, label: 'Planar YZ' },
]

const running = ref(false)
const stlExportFormat = ref<'binary' | 'ascii'>('binary')
const stlExporting = ref(false)
const stlExportProgress = ref(0)
const stlExportMessage = ref('')
const runStage = ref<TexturizerRunStage | null>(null)
const runProgress = ref(0)
const runProgressMessage = ref('')
const summary = ref<TexturizeResult['summary'] | null>(null)
const runMeta = ref<TexturizeResult['meta'] | null>(null)
const runWarnings = ref<TexturizeWarning[] | null>(null)

function decimationStopReasonLabel(reason: string | undefined): string {
  if (reason === 'target-close') return '目标接近'
  if (reason === 'stagnation') return '停滞早停'
  if (reason === 'stagnation-retry') return '停滞重试收敛'
  if (reason === 'max-iters') return '达到迭代上限'
  return 'N/A'
}

function onLoadFromRecent(job: TexturizerRecentJob) {
  amplitude.value = job.input.amplitude
  frequency.value = job.input.frequency
  mappingMode.value = (job.input as any).mappingMode ?? 6
  scaleU.value = (job.input as any).scaleU ?? 1
  scaleV.value = (job.input as any).scaleV ?? 1
  offsetU.value = (job.input as any).offsetU ?? 0
  offsetV.value = (job.input as any).offsetV ?? 0
  rotationDeg.value = (job.input as any).rotationDeg ?? 0
  mappingBlend.value = (job.input as any).mappingBlend ?? 0
  seamBandWidth.value = (job.input as any).seamBandWidth ?? 0.5
  capAngle.value = (job.input as any).capAngle ?? 20
  topAngleLimit.value = (job.input as any).topAngleLimit ?? 0
  bottomAngleLimit.value = (job.input as any).bottomAngleLimit ?? 0
  exclusionMode.value = (job.input as any).exclusionMode ?? 'exclude'
  excludedFacesText.value = JSON.stringify((job.input as any).excludedFaces ?? [])
  subdivisionLevels.value = (job.input as any).subdivisionLevels ?? 0
  decimationRatio.value = (job.input as any).decimationRatio ?? 1
  symmetricDisplacement.value = (job.input as any).symmetricDisplacement ?? false
  ElMessage.success('已从历史任务载入参数（需重新导入模型与纹理）')
}

function getExcludedFacesOrNotify(): number[] | null {
  try {
    return parseExcludedFacesJson(excludedFacesText.value)
  } catch (err: any) {
    ElMessage.error(`Excluded Faces 解析失败：${err?.message ?? String(err)}`)
    return null
  }
}

function getJobWarnings(job: TexturizerRecentJob): TexturizeWarning[] {
  const raw = (job as any).warnings
  if (Array.isArray(raw)) return raw.map((w) => normalizeWarning(w as TexturizeWarning | string))
  return buildRunWarnings(job.meta)
}

const normalizedRunWarnings = computed(() => (runWarnings.value ?? []).map((w) => normalizeWarning(w)))
type JobWarningUi = {
  warnings: TexturizeWarning[]
  lines: Array<{ level: WarningLevel; text: string }>
  tagType: 'warning' | 'danger'
  tagLabel: string
}

const emptyJobWarningUi: JobWarningUi = {
  warnings: [] as TexturizeWarning[],
  lines: [] as Array<{ level: WarningLevel; text: string }>,
  tagType: 'warning',
  tagLabel: 'WARN(0)',
}
const recentJobWarningUiMap = computed(() => {
  const map = new Map<string, JobWarningUi>()
  for (let i = 0; i < store.recentJobs.length; i += 1) {
    const job = store.recentJobs[i]
    if (!job) continue
    const warnings = getJobWarnings(job)
    map.set(job.id, {
      warnings,
      lines: getWarningsTooltipLines(warnings),
      tagType: getWarningsTagType(warnings),
      tagLabel: getWarningsTagLabel(warnings),
    })
  }
  return map
})

function getRecentJobWarningUi(job: TexturizerRecentJob) {
  return recentJobWarningUiMap.value.get(job.id) ?? emptyJobWarningUi
}

function onReexportRecentJson(job: TexturizerRecentJob) {
  const warnings = getJobWarnings(job)
  const payload = {
    input: job.input,
    summary: job.summary,
    meta: job.meta,
    warnings,
    vertices: job.vertices,
  }
  const name = `texturizer-reexport-${new Date(job.createdAt).toISOString().replace(/[:.]/g, '-')}.json`
  exportJson(name, payload, '已从历史任务再次导出 JSON')
}

const originalMesh = ref<boolean>(false) // 是否已导入 STL

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material> | null = null
let rafId: number | null = null

function startRenderLoop() {
  if (!renderer || !scene || !camera) return
  if (rafId != null) return
  const tick = () => {
    rafId = requestAnimationFrame(tick)
    renderer!.render(scene!, camera!)
  }
  rafId = requestAnimationFrame(tick)
}

function stopRenderLoop() {
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

function ensureThree() {
  if (renderer || !canvasRef.value) return

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f7fa)

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000)
  camera.position.set(0, 0, 200)

  const light1 = new THREE.DirectionalLight(0xffffff, 1)
  light1.position.set(1, 1, 1)
  scene.add(light1)

  const light2 = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(light2)

  startRenderLoop()
}

function resizeRenderer() {
  if (!renderer || !camera || !canvasRef.value) return
  const parent = canvasRef.value.parentElement
  if (!parent) return
  const w = Math.max(1, parent.clientWidth)
  const h = Math.max(1, parent.clientHeight)
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function buildGeometryFromVertices(arr: Float32Array): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const finite = new Float32Array(arr.length)
  let n = 0
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i]!
    const y = arr[i + 1]!
    const z = arr[i + 2]!
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue
    finite[n++] = x
    finite[n++] = y
    finite[n++] = z
  }
  const trimmed = n === arr.length ? arr : finite.subarray(0, n)
  geometry.setAttribute('position', new THREE.BufferAttribute(trimmed, 3))
  if (trimmed.length >= 3) {
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    geometry.computeVertexNormals()
  }
  return geometry
}

function setMeshFromVertices(arr: Float32Array) {
  ensureThree()
  if (!scene || !camera) return

  const geometry = buildGeometryFromVertices(arr)
  geometry.computeVertexNormals()

  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute | null
  if (posAttr) {
    const nrmAttr = geometry.getAttribute('normal') as THREE.BufferAttribute | null
    if (nrmAttr) {
      const nrm = new Float32Array(nrmAttr.count * 3)
      for (let i = 0; i < nrmAttr.count; i++) {
        nrm[i * 3] = nrmAttr.getX(i)
        nrm[i * 3 + 1] = nrmAttr.getY(i)
        nrm[i * 3 + 2] = nrmAttr.getZ(i)
      }
      vertexNormals.value = nrm
    }
  }

  if (!mesh) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4f8ad9, metalness: 0.05, roughness: 0.9 })
    mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
  } else {
    const old = mesh.geometry
    mesh.geometry = geometry
    old.dispose()
  }

  // Frame the object
  geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (bb) {
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    bb.getSize(size)
    bb.getCenter(center)
    mesh.position.sub(center) // recenter mesh around origin

    const maxDim = Math.max(size.x, size.y, size.z)
    const dist = maxDim > 0 ? maxDim * 1.8 : 200
    camera.position.set(0, 0, dist)
    camera.lookAt(0, 0, 0)
  }

  resizeRenderer()
}

const canRun = computed(() => {
  return !!vertices.value && !running.value && !stlExporting.value
})

onMounted(() => {
  if (canvasRef.value) {
    ensureThree()
    resizeRenderer()
  }
})

watch(canvasRef, () => {
  if (canvasRef.value) {
    ensureThree()
    resizeRenderer()
  }
})

onBeforeUnmount(() => {
  stopRenderLoop()
  if (mesh) {
    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
    mesh = null
  }
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
})

function onApplyGripDefaults() {
  applyGripTexturizerUiDefaults({
    amplitude,
    frequency,
    mappingMode,
    scaleU,
    scaleV,
    offsetU,
    offsetV,
    rotationDeg,
    mappingBlend,
    seamBandWidth,
    capAngle,
    topAngleLimit,
    bottomAngleLimit,
    exclusionMode,
    subdivisionLevels,
    decimationRatio,
    symmetricDisplacement,
  })
  ElMessage.success('已应用 grip stlTexturizer 默认参数')
}

function onPickStl() {
  fileInputRef.value?.click()
}

function onPickTexture() {
  textureInputRef.value?.click()
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const buf = await file.arrayBuffer()
    const loader = new STLLoader()
    const geom = loader.parse(buf)
    const pos = geom.getAttribute('position')
    const arr = pos.array as ArrayLike<number>

    const out = new Float32Array(arr.length)
    for (let i = 0; i < arr.length; i += 1) {
      out[i] = arr[i] ?? 0
    }

    vertices.value = out
    vertexNormals.value = null
    summary.value = null
    runMeta.value = null
    runWarnings.value = null
    originalMesh.value = true

    // Render original mesh
    setMeshFromVertices(out)

    ElMessage.success(`已导入 STL：${file.name}（顶点 ${out.length / 3}）`)
  } catch (err: any) {
    ElMessage.error(`导入 STL 失败：${err?.message ?? String(err)}`)
  } finally {
    input.value = ''
  }
}

async function toGrayscalePixels(img: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas ctx missing')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const gray = new Uint8Array(canvas.width * canvas.height)
  for (let i = 0, j = 0; i < data.data.length; i += 4, j += 1) {
    const r = data.data[i] ?? 0
    const g = data.data[i + 1] ?? 0
    const b = data.data[i + 2] ?? 0
    gray[j] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }

  return { width: canvas.width, height: canvas.height, gray }
}

function onTextureFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = async () => {
    try {
      const out = await toGrayscalePixels(img)
      textureInfo.value = out
      ElMessage.success(`已导入纹理：${file.name}（${out.width}x${out.height}）`)
    } catch (err: any) {
      ElMessage.error(`解析纹理失败：${err?.message ?? String(err)}`)
    } finally {
      URL.revokeObjectURL(url)
      input.value = ''
    }
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    input.value = ''
    ElMessage.error('纹理加载失败')
  }
  img.src = url
}

async function onRun() {
  if (!vertices.value) {
    ElMessage.info('请先导入 STL 模型')
    return
  }
  running.value = true
  runStage.value = 'subdivision'
  runProgress.value = 0
  runProgressMessage.value = ''
  summary.value = null
  runMeta.value = null
  runWarnings.value = null
  try {
    const excludedFaces = getExcludedFacesOrNotify()
    if (!excludedFaces) return
    const res: TexturizeResult = await runTexturizer(
      {
        vertices: vertices.value,
        normals: vertexNormals.value ?? undefined,
        amplitude: amplitude.value,
        frequency: frequency.value,
        mappingMode: mappingMode.value,
        scaleU: scaleU.value,
        scaleV: scaleV.value,
        offsetU: offsetU.value,
        offsetV: offsetV.value,
        rotationDeg: rotationDeg.value,
        mappingBlend: mappingBlend.value,
        seamBandWidth: seamBandWidth.value,
        capAngle: capAngle.value,
        topAngleLimit: topAngleLimit.value,
        bottomAngleLimit: bottomAngleLimit.value,
        exclusionMode: exclusionMode.value,
        excludedFaces,
        subdivisionLevels: subdivisionLevels.value,
        decimationRatio: decimationRatio.value,
        symmetricDisplacement: symmetricDisplacement.value,
        texture: textureInfo.value ? cloneTextureForWorker(textureInfo.value) : undefined,
      },
      {
        onProgress: (ev: TexturizerProgressEvent) => {
          runStage.value = ev.stage
          runProgress.value = toTexturizerOverallProgress(ev.stage, ev.progress)
          runProgressMessage.value = ev.message ?? ''
        },
      },
    )
    vertices.value = res.vertices
    summary.value = res.summary
    runMeta.value = res.meta ?? null
    runWarnings.value = res.warnings ?? buildRunWarnings(res.meta)

    // Update preview mesh
    setMeshFromVertices(res.vertices)
    vertexNormals.value = null

    saveTexturizerLastRunParams({
      amplitude: amplitude.value,
      frequency: frequency.value,
      mappingMode: mappingMode.value,
      scaleU: scaleU.value,
      scaleV: scaleV.value,
      offsetU: offsetU.value,
      offsetV: offsetV.value,
      rotationDeg: rotationDeg.value,
      mappingBlend: mappingBlend.value,
      seamBandWidth: seamBandWidth.value,
      capAngle: capAngle.value,
      topAngleLimit: topAngleLimit.value,
      bottomAngleLimit: bottomAngleLimit.value,
      exclusionMode: exclusionMode.value,
      subdivisionLevels: subdivisionLevels.value,
      decimationRatio: decimationRatio.value,
      symmetricDisplacement: symmetricDisplacement.value,
    })

    const ts = Date.now()
    const runName = `texturizer-${new Date(ts).toISOString().replace(/[:.]/g, '-')}`
    store.addRecentJob({
      id: `texturizer-${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: ts,
      name: runName,
      input: {
        vertexCount: res.summary.vertexCount,
        amplitude: amplitude.value,
        frequency: frequency.value,
        mappingMode: mappingMode.value,
        scaleU: scaleU.value,
        scaleV: scaleV.value,
        offsetU: offsetU.value,
        offsetV: offsetV.value,
        rotationDeg: rotationDeg.value,
        mappingBlend: mappingBlend.value,
        seamBandWidth: seamBandWidth.value,
        capAngle: capAngle.value,
        topAngleLimit: topAngleLimit.value,
        bottomAngleLimit: bottomAngleLimit.value,
        exclusionMode: exclusionMode.value,
        excludedFaces,
        subdivisionLevels: subdivisionLevels.value,
        decimationRatio: decimationRatio.value,
        symmetricDisplacement: symmetricDisplacement.value,
        texture: textureInfo.value
          ? { width: textureInfo.value.width, height: textureInfo.value.height }
          : { width: 128, height: 128 },
      },
      summary: res.summary,
      meta: res.meta,
      warnings: res.warnings ?? buildRunWarnings(res.meta),
      vertices: Array.from(res.vertices),
    })

    ElMessage.success('已应用纹理位移')
  } catch (err: any) {
    ElMessage.error(`应用失败：${err?.message ?? String(err)}`)
  } finally {
    runProgress.value = 1
    running.value = false
  }
}

function onExportJson() {
  if (!vertices.value || !summary.value) return
  const excludedFaces = getExcludedFacesOrNotify()
  if (!excludedFaces) return
  const name = `texturizer-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const warnings = runWarnings.value ?? buildRunWarnings(runMeta.value)
  const payload = {
    input: {
      vertexCount: vertexCount.value,
      amplitude: amplitude.value,
      frequency: frequency.value,
      mappingMode: mappingMode.value,
      scaleU: scaleU.value,
      scaleV: scaleV.value,
      offsetU: offsetU.value,
      offsetV: offsetV.value,
      rotationDeg: rotationDeg.value,
      mappingBlend: mappingBlend.value,
      seamBandWidth: seamBandWidth.value,
      capAngle: capAngle.value,
      topAngleLimit: topAngleLimit.value,
      bottomAngleLimit: bottomAngleLimit.value,
      exclusionMode: exclusionMode.value,
      excludedFaces,
      subdivisionLevels: subdivisionLevels.value,
      decimationRatio: decimationRatio.value,
      symmetricDisplacement: symmetricDisplacement.value,
      texture: textureInfo.value
        ? { width: textureInfo.value.width, height: textureInfo.value.height }
        : { width: 128, height: 128 },
    },
    summary: summary.value,
    meta: runMeta.value ?? undefined,
    warnings,
    vertices: Array.from(vertices.value),
  }
  exportJson(name, payload, '已导出 JSON')

  const ts = Date.now()
  store.addRecentJob({
    id: `texturizer-${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: ts,
    name,
    input: payload.input,
    summary: summary.value,
    meta: runMeta.value ?? undefined,
    warnings,
    vertices: payload.vertices,
  })

}

async function onExportStl() {
  if (!vertices.value) return
  const excludedFaces = getExcludedFacesOrNotify()
  if (!excludedFaces) return
  stlExporting.value = true
  stlExportProgress.value = 0
  stlExportMessage.value = ''
  const name = `texturizer-${new Date().toISOString().replace(/[:.]/g, '-')}.stl`
  try {
    const onProgress = (p: number) => {
      stlExportProgress.value = p
      stlExportMessage.value = '序列化三角面'
    }
    const blob =
      stlExportFormat.value === 'binary'
        ? await exportNonIndexedTrianglesToStlBinaryBlobAsync(vertices.value, { onProgress })
        : await exportNonIndexedTrianglesToStlAsciiBlobAsync(vertices.value, { onProgress })
    exportBlob(name, blob, `已导出 ${stlExportFormat.value === 'binary' ? '二进制' : 'ASCII'} STL`)
  } catch (err: any) {
    ElMessage.error(`导出 STL 失败：${err?.message ?? String(err)}`)
  } finally {
    stlExporting.value = false
    stlExportProgress.value = 0
    stlExportMessage.value = ''
  }

  if (summary.value) {
    const warnings = runWarnings.value ?? buildRunWarnings(runMeta.value)
    const ts = Date.now()
    store.addRecentJob({
      id: `texturizer-${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: ts,
      name,
      input: {
        vertexCount: vertexCount.value,
        amplitude: amplitude.value,
        frequency: frequency.value,
        mappingMode: mappingMode.value,
        scaleU: scaleU.value,
        scaleV: scaleV.value,
        offsetU: offsetU.value,
        offsetV: offsetV.value,
        rotationDeg: rotationDeg.value,
        mappingBlend: mappingBlend.value,
        seamBandWidth: seamBandWidth.value,
        capAngle: capAngle.value,
        topAngleLimit: topAngleLimit.value,
        bottomAngleLimit: bottomAngleLimit.value,
        exclusionMode: exclusionMode.value,
        excludedFaces,
        subdivisionLevels: subdivisionLevels.value,
        decimationRatio: decimationRatio.value,
        symmetricDisplacement: symmetricDisplacement.value,
        texture: textureInfo.value
          ? { width: textureInfo.value.width, height: textureInfo.value.height }
          : { width: 128, height: 128 },
      },
      summary: summary.value,
      meta: runMeta.value ?? undefined,
      warnings,
      vertices: Array.from(vertices.value),
    })
  }

}

function onClearRecentJobs() {
  store.clearRecentJobs()
  ElMessage.info('已清空最近任务')
}
</script>

<style scoped>
.texturizer-root {
  height: calc(100vh - 60px);
}
.texturizer-aside {
  background: #fff;
  border-right: 1px solid #dcdfe6;
}
.texturizer-center {
  background: #f5f7fa;
}
.texturizer-main {
  padding: 12px;
}
.preview-wrap {
  width: 100%;
  height: 340px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
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
</style>
