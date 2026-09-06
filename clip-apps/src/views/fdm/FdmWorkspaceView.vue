<template>
  <el-container class="ws-root">
    <!-- Left: model list -->
    <el-aside width="280px" class="ws-aside">
      <div class="pane-title">模型列表</div>
      <div class="pane-body">
        <el-upload
          action="#"
          :auto-upload="false"
          multiple
          :show-file-list="false"
          accept=".stl,.obj,.3mf,.STL,.OBJ,.3MF"
          @change="onFilesSelected"
        >
          <el-button type="primary" size="small">导入模型文件</el-button>
          <span class="hint" style="margin-left: 6px">（仅保存在当前页面内存中）</span>
        </el-upload>

        <el-divider />

        <el-empty
          v-if="models.length === 0"
          :description="selectedJobId ? '当前 Job 无模型，或需重新导入模型' : '尚未导入模型'"
        />

        <el-scrollbar v-else height="calc(100vh - 210px)">
          <el-table
            :data="models"
            size="small"
            border
            highlight-current-row
            :row-class-name="({ row }: { row: { id: string } }) => (row.id === selectedModelId ? 'is-selected' : '')"
            @row-click="onRowClick"
          >
            <el-table-column prop="name" label="文件名" min-width="160">
              <template #default="scope">
                <span>{{ scope.row.name }}</span>
                <el-tag
                  v-if="scope.row.id === selectedModelId"
                  size="small"
                  type="success"
                  style="margin-left: 4px"
                >
                  当前
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="scope">
                <el-button type="danger" size="small" text @click.stop="removeModel(scope.row.id)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-scrollbar>
      </div>
    </el-aside>

    <!-- Center: 3D viewport placeholder -->
    <el-container class="ws-center">
      <el-main class="ws-viewport">
        <div class="pane-title">3D 视图</div>
        <div class="pane-body viewport">
          <canvas ref="canvasRef" class="viewport-canvas"></canvas>
        </div>

        <GcodePreviewPanel
          layout="compact"
          kind="fdm"
          :job-gcode="fdmViewportGcode"
          :tool-position="fdmViewportTool"
          :stem-color="fdmViewportStem"
          title="切片刀路 3D 示意（合成 G-code）"
          :empty-hint="!sliceResult ? '请先切片；下方为单层 2D 预览。' : undefined"
          :toolbar-hint="sliceResult ? '由 sliceResult.preview 合成 G0/G1，与 Carvera/CAM 共用折线视口。' : '切片完成后在此显示合成刀路折线。'"
        />

        <div class="pane-body" v-if="sliceResult" style="padding-top: 8px">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <span>层：</span>
            <el-slider
              v-model="activeLayerIndex"
              :min="0"
              :max="sliceResult.preview.layers.length - 1"
              :step="1"
              :show-tooltip="false"
              style="flex:1"
            />
            <span v-if="sliceResult && sliceResult.preview.layers[activeLayerIndex]">
              z={{ sliceResult!.preview.layers[activeLayerIndex]?.z.toFixed(2) }}
            </span>
          </div>
          <canvas ref="sliceCanvasRef" width="300" height="300" class="slice-preview-canvas"></canvas>
        </div>
        <div class="pane-body" v-else style="padding-top: 8px">
          <el-empty description="尚未切片，暂无法预览" />
        </div>
      </el-main>

      <el-footer class="ws-footer">
        <el-button type="primary" :loading="isSlicing" @click="onSliceClick">切片</el-button>
        <el-button @click="onPreviewClick">预览</el-button>
        <el-button @click="onExportGcodeClick">导出 G-code</el-button>
        <el-button type="success" plain @click="onSendToCarveraClick">{{ sendToCarveraLabel }}</el-button>
        <el-button type="success" plain @click="onSendToGridBotClick">{{ sendToGridBotLabel }}</el-button>
        <el-button type="info" size="small" @click="onKiriPocClick">Kiri PoC</el-button>
        <span class="hint">（{{ sliceRuntimeHint }}）</span>
      </el-footer>
    </el-container>

    <!-- Right: config summary -->
    <el-aside class="ws-aside-right">
      <div class="pane-title">当前配置</div>

      <div class="pane-body">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="模式">FDM</el-descriptions-item>
          <el-descriptions-item label="设备">{{ current.device }}</el-descriptions-item>
          <el-descriptions-item label="工艺">{{ current.process }}</el-descriptions-item>
          <el-descriptions-item label="材料">{{ current.material }}</el-descriptions-item>
          <el-descriptions-item v-if="sliceResult" label="切片后端">
            {{ sliceResult.backend || 'mock' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="sliceResult?.inputMeta" label="输入网格（迁移元数据）">
            {{ sliceResult.inputMeta.triangleCount }} 三角 · {{ sliceResult.inputMeta.vertexCount }} 顶点 · Z 跨度
            {{ sliceResult.inputMeta.zSpanMm.toFixed(2) }} mm
          </el-descriptions-item>
          <el-descriptions-item v-if="sliceResult?.legacyDebug" label="Legacy FDM 桥">
            <span>运行时 {{ sliceResult.legacyDebug.ready ? '就绪' : '未就绪' }}</span>
            <span style="margin-left: 8px">fdm_slice：{{ sliceResult.legacyDebug.hasSliceImpl ? '已加载' : '未加载' }}</span>
            <el-button size="small" text style="margin-left: 8px" @click="copyLiveLegacyDebugSummary">复制</el-button>
            <el-button size="small" text style="margin-left: 4px" @click="copyLegacyFdmComparisonBundle">复制对账包</el-button>
            <div v-if="sliceResult.legacyDebug.initErrorMessage" class="hint" style="margin-top: 4px">
              init：{{ sliceResult.legacyDebug.initErrorMessage }}
            </div>
            <div v-if="sliceResult.legacyDebug.legacyImportErrorMessage" class="hint" style="margin-top: 4px">
              import：{{ sliceResult.legacyDebug.legacyImportErrorMessage }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="sliceResult?.fallback" label="回退原因">
            {{ getSliceFallbackReasonLabel(sliceResult.fallback.reasonCode) }}
            <span v-if="sliceResult.fallback.warningCode" class="hint">
              [{{ sliceResult.fallback.warningCode }}]
            </span>
            - {{ sliceResult.fallback.message }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedJobId" label="当前 Job">
            <span>
              {{ jobs.find((j) => j.id === selectedJobId)?.name || '' }}
              <span class="hint" style="margin-left: 4px">（模型需按文件名重新导入）</span>
            </span>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedJobSliceInputMeta" label="Job 保存的输入网格">
            {{ selectedJobSliceInputMeta.triangleCount }} 三角 · {{ selectedJobSliceInputMeta.vertexCount }} 顶点 · Z
            {{ selectedJobSliceInputMeta.zSpanMm.toFixed(2) }} mm
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedJobSliceLegacyDebug" label="Job 保存的 Legacy FDM 桥">
            <span>运行时 {{ selectedJobSliceLegacyDebug.ready ? '就绪' : '未就绪' }}</span>
            <span style="margin-left: 8px">
              fdm_slice：{{ selectedJobSliceLegacyDebug.hasSliceImpl ? '已加载' : '未加载' }}
            </span>
            <el-button size="small" text style="margin-left: 8px" @click="copyJobLegacyDebugSummary">复制</el-button>
            <div v-if="selectedJobSliceLegacyDebug.initErrorMessage" class="hint" style="margin-top: 4px">
              init：{{ selectedJobSliceLegacyDebug.initErrorMessage }}
            </div>
            <div v-if="selectedJobSliceLegacyDebug.legacyImportErrorMessage" class="hint" style="margin-top: 4px">
              import：{{ selectedJobSliceLegacyDebug.legacyImportErrorMessage }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedJobId" label="comparisonSourceFingerprint">
            <span style="font-family: monospace; font-size: 11px; word-break: break-all">
              {{ selectedJobLegacyComparisonSourceFingerprint }}
            </span>
            <el-button size="small" text style="margin-left: 8px" @click="copyLegacyFdmSourceFingerprint">
              复制
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedJobId" label="traceSchemaVersion">
            <span style="font-family: monospace; font-size: 11px; word-break: break-all">
              {{ TRACE_SCHEMA_VERSION }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedJobId" label="comparisonSourceLabel">
            <span style="font-family: monospace; font-size: 11px; word-break: break-all">
              {{ selectedJobComparisonSourceLabel }}
            </span>
            <el-button size="small" text style="margin-left: 8px" @click="copyLegacyFdmSourceLabel">
              复制
            </el-button>
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="selectedJobTelemetryDigest.length || selectedJobSliceInputMeta || selectedJobSliceLegacyDebug" style="margin-top: 10px">
          <el-collapse>
            <el-collapse-item title="当前 Job 诊断（告警摘要 / 输入网格 / Legacy桥）" name="job-telemetry-digest">
              <div style="margin-bottom: 8px; display: flex; justify-content: flex-end;">
                <el-button size="small" @click="copyJobTelemetryDigest">复制诊断文本</el-button>
              </div>
              <div
                v-for="event in selectedJobTelemetryDigest"
                :key="`${event.ts}-${event.code}-${event.reasonCode}`"
                style="font-size:12px; margin-bottom: 8px;"
              >
                <div>
                  [{{ new Date(event.ts).toLocaleTimeString() }}]
                  <strong>{{ event.code }}</strong>
                  / {{ getSliceFallbackReasonLabel(event.reasonCode) }}
                </div>
                <div class="hint" style="margin-left: 0">{{ event.message }}</div>
              </div>
              <div v-if="selectedJobSliceInputMeta && !selectedJobTelemetryDigest.length" class="hint" style="font-size: 12px">
                无告警摘要；可使用「复制诊断文本」导出已保存的 sliceInputMeta。
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        <div v-if="selectedJobDiagnosticsSnapshot" style="margin-top: 10px">
          <el-collapse>
            <el-collapse-item title="当前 Job 诊断快照（最近保存）" name="job-diagnostics-snapshot">
              <div style="margin-bottom: 8px; display: flex; justify-content: flex-end;">
                <el-button size="small" @click="copyJobDiagnosticsSnapshot">复制快照文本</el-button>
              </div>
              <pre class="job-diagnostics-pre">{{ selectedJobDiagnosticsSnapshot }}</pre>
            </el-collapse-item>
          </el-collapse>
        </div>
        <div v-if="sliceResult?.summary?.estimateMeta" style="margin-top: 10px">
          <el-collapse>
            <el-collapse-item title="切片估算明细（调试）" name="estimate-meta">
              <div style="margin-bottom: 8px; display: flex; justify-content: flex-end; gap: 8px">
                <el-button size="small" @click="copyEstimateMetaCompactSummary">复制简版摘要</el-button>
                <el-button size="small" @click="exportEstimateMetaJson">导出 JSON</el-button>
                <el-button size="small" @click="copyEstimateMetaJson">复制 JSON</el-button>
              </div>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="perimeter 长度">
                  {{ sliceResult.summary.estimateMeta.lengths.perimeter.toFixed(2) }} mm
                </el-descriptions-item>
                <el-descriptions-item label="infill 长度">
                  {{ sliceResult.summary.estimateMeta.lengths.infill.toFixed(2) }} mm
                </el-descriptions-item>
                <el-descriptions-item label="support 长度">
                  {{ sliceResult.summary.estimateMeta.lengths.support.toFixed(2) }} mm
                </el-descriptions-item>
                <el-descriptions-item label="travel(层内/层间)">
                  {{ sliceResult.summary.estimateMeta.lengths.travelInLayer.toFixed(2) }} /
                  {{ sliceResult.summary.estimateMeta.lengths.travelInterLayer.toFixed(2) }} mm
                </el-descriptions-item>
                <el-descriptions-item label="回抽估算">
                  count={{ sliceResult.summary.estimateMeta.retract.estimatedCount }}
                  (trigger={{ sliceResult.summary.estimateMeta.retract.triggerDistance.toFixed(2) }}mm)
                </el-descriptions-item>
                <el-descriptions-item label="时间分解(sec)">
                  print={{ sliceResult.summary.estimateMeta.timeSec.print.toFixed(2) }},
                  travel={{ sliceResult.summary.estimateMeta.timeSec.travel.toFixed(2) }},
                  retract={{ sliceResult.summary.estimateMeta.timeSec.retract.toFixed(2) }},
                  floor={{ sliceResult.summary.estimateMeta.timeSec.floor.toFixed(2) }},
                  final={{ sliceResult.summary.estimateMeta.timeSec.final.toFixed(2) }}
                </el-descriptions-item>
              </el-descriptions>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div v-if="sliceTelemetryTimeline.length" style="margin-top: 10px">
          <el-collapse>
            <el-collapse-item title="切片告警时间线（调试）" name="slice-telemetry">
              <div style="margin-bottom: 8px; display: flex; justify-content: flex-end;">
                <el-button size="small" @click="copyCurrentTimelineDiagnostics">复制当前诊断</el-button>
              </div>
              <div
                v-for="event in sliceTelemetryTimeline"
                :key="`${event.ts}-${event.code}-${event.reasonCode}`"
                style="font-size:12px; margin-bottom: 8px;"
              >
                <div>
                  [{{ new Date(event.ts).toLocaleTimeString() }}]
                  <strong>{{ event.code }}</strong>
                  / {{ event.reasonCode }}
                </div>
                <div class="hint" style="margin-left: 0">{{ event.message }}</div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="actions">
          <el-button @click="go('/config/fdm')">配置总览</el-button>
          <el-button @click="go('/devices/fdm')">设备</el-button>
          <el-button @click="go('/process/fdm')">工艺</el-button>
          <el-button @click="go('/material/fdm')">材料</el-button>
          <el-button @click="go('/jobs/fdm')">Jobs</el-button>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">
          当前工艺参数
          <span v-if="currentJob && processChangedFromJob" class="hint">（当前工艺已修改，与 Job 保存时不同）</span>
        </div>
        <el-empty v-if="!currentProcessDetail" description="未找到当前工艺配置" />
        <el-descriptions v-else :column="1" border size="small">
          <el-descriptions-item label="层高">
            {{ currentProcessDetail.sliceHeight }} mm
            <span class="hint" style="margin-left: 6px">首层 {{ currentProcessDetail.firstSliceHeight }} mm</span>
          </el-descriptions-item>
          <el-descriptions-item label="壳/顶/底">
            {{ currentProcessDetail.sliceShells }} / {{ currentProcessDetail.sliceTopLayers }} / {{
              currentProcessDetail.sliceBottomLayers
            }}
          </el-descriptions-item>
          <el-descriptions-item label="线宽">
            {{ currentProcessDetail.sliceLineWidth }} mm
          </el-descriptions-item>
          <el-descriptions-item label="填充">
            {{ currentProcessDetail.sliceFillType }}
            <span class="hint" style="margin-left: 6px">密度 {{ currentProcessDetail.sliceFillSparse }}</span>
            <span class="hint" style="margin-left: 6px">重叠 {{ currentProcessDetail.sliceFillOverlap }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="支撑">
            {{ currentProcessDetail.sliceSupportEnable ? '开启' : '关闭' }}
            <span v-if="currentProcessDetail.sliceSupportEnable" class="hint" style="margin-left: 6px">
              密度 {{ currentProcessDetail.sliceSupportDensity }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="回抽">
            {{ currentProcessDetail.outputRetractDist }} mm @ {{ currentProcessDetail.outputRetractSpeed }}
          </el-descriptions-item>
          <el-descriptions-item label="速度">
            打印 {{ currentProcessDetail.outputFeedrate }} / 空程 {{ currentProcessDetail.outputSeekrate }} / 首层
            {{ currentProcessDetail.firstLayerRate }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">
          模型信息
          <span v-if="selectedModelIds.size > 1" class="hint">（已选中 {{ selectedModelIds.size }} 个模型）</span>
        </div>
        <el-empty v-if="!modelInfo" description="未选择模型" />
        <el-descriptions v-else :column="1" border size="small">
          <el-descriptions-item label="文件">{{ modelInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="格式">{{ modelInfo.ext.toUpperCase() }}</el-descriptions-item>
          <el-descriptions-item label="尺寸 (X,Y,Z)">
            {{ modelInfo.size.x }} × {{ modelInfo.size.y }} × {{ modelInfo.size.z }}
          </el-descriptions-item>
          <el-descriptions-item label="包围盒最小">
            ({{ modelInfo.min.x }}, {{ modelInfo.min.y }}, {{ modelInfo.min.z }})
          </el-descriptions-item>
          <el-descriptions-item label="包围盒最大">
            ({{ modelInfo.max.x }}, {{ modelInfo.max.y }}, {{ modelInfo.max.z }})
          </el-descriptions-item>
          <el-descriptions-item label="体积(粗略)">
            {{ modelInfo.volume }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <el-button @click="reload" plain>刷新当前配置</el-button>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">切片后端</div>
        <el-radio-group v-model="sliceBackendKind" size="small">
          <el-radio-button value="mock">Mock</el-radio-button>
          <el-radio-button value="kiri">Kiri（实验）</el-radio-button>
        </el-radio-group>
        <div style="margin-top: 8px">
          <el-checkbox v-model="includeTelemetryInGcode">
            导出 G-code 时附带切片诊断（告警摘要、诊断快照、输入网格元数据）
          </el-checkbox>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">FDM Jobs（本地）</div>
        <div class="pane-body" style="padding: 0 0 8px">
          <el-button
            v-if="selectedJobId"
            type="primary"
            size="small"
            plain
            @click="onUpdateJobClick"
          >
            更新当前 Job
          </el-button>
          <span v-if="selectedJobId" class="hint" style="margin-left: 8px">
            将当前配置与切片摘要覆盖保存到该 Job。
          </span>
        </div>
        <el-empty v-if="jobs.length === 0" description="尚未保存任何 Job" />
        <el-table
          v-else
          :data="jobs"
          size="small"
          border
          height="160"
          @row-click="onJobRowClick"
          :row-class-name="({ row }: { row: FdmJobRecord }) => (row.id === selectedJobId ? 'is-selected' : '')"
        >
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="createdAt" label="创建时间" min-width="140">
            <template #default="scope">
              {{ new Date(scope.row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>
        </el-table>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">模型变换</div>
        <el-empty v-if="!activeTransform" description="请选择一个模型" />
        <div v-else class="pane-body" style="padding: 8px 0 0">
          <el-form label-width="60px" size="small">
            <el-form-item label="位置">
              <el-input-number
                v-model="activeTransform.position.x"
                :step="1"
                controls-position="right"
                @change="applyActiveTransform"
              />
              <el-input-number
                v-model="activeTransform.position.y"
                :step="1"
                controls-position="right"
                style="margin-left: 4px"
                @change="applyActiveTransform"
              />
              <el-input-number
                v-model="activeTransform.position.z"
                :step="1"
                controls-position="right"
                style="margin-left: 4px"
                @change="applyActiveTransform"
              />
            </el-form-item>
            <el-form-item label="缩放">
              <el-input-number
                v-model="activeTransform.scale.x"
                :step="0.1"
                :min="0.01"
                controls-position="right"
                @change="applyActiveTransform"
              />
            </el-form-item>
            <el-form-item label="旋转Z">
              <el-input-number
                v-model="activeTransform.rotation.z"
                :step="0.1"
                controls-position="right"
                @change="applyActiveTransform"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-aside>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadUserFile } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { readCurrentKeys } from '@/api/current'
import { clonePlain } from '@/core/clonePlain'
import { getFdmProcess } from '@/api/process'
import type { FdmProcess } from '@/types/process'
import type { SliceLegacyDebugSnapshot, SliceResult } from '@/api/slice'
import { getSliceBackend, type SliceBackendKind } from '@/api/slice-backend'
import { getFdmJob, saveFdmJob, deleteFdmJob, type FdmJobRecord, type GridBotJobRecord } from '@/api/jobs'
import type { SceneModelPayload, SliceJobPayload } from '@/types/job'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { useCarveraStore } from '@/stores/useCarveraStore'
import { useGridBotStore } from '@/stores/useGridBotStore'
import { useFdmStore } from '@/stores/useFdmStore'
import { getSliceFallbackReasonLabel } from '@/core/slicer/sliceFallbackUi'
import { buildSliceTelemetryDigestForJob } from '@/core/slicer/sliceTelemetryJobDigest'
import { getSlicerDebugApi, uninstallSlicerDebugApi } from '@/core/slicer/sliceDebugApi'
import { initSlicerDebugSession } from '@/core/slicer/sliceDebugSession'
import {
  appendDiagnosticsSnapshotComments,
  appendLegacyFdmDebugComments,
  appendSliceInputMetaPairForGcode,
  appendTelemetryDigestComments,
  buildTelemetryDigestText,
} from '@/core/slicer/telemetryComment'
import { buildFdmLegacyComparisonBundleText } from '@/core/slicer/legacyFdmCompareText'
import {
  buildFdmEstimateMetaExportContext,
  buildFdmLegacyComparisonTrace,
  buildFdmTraceExportContext,
  buildFdmTraceHeaderLines,
  resolveFdmTrace,
} from '@/core/slicer/fdmTraceResolve'
import { buildEstimateMetaCompactSummary, buildEstimateMetaExportPayload } from '@/core/slicer/estimateMetaExport'
import {
  FDM_ACTION_ERROR,
  FDM_ACTION_INFO,
  FDM_ACTION_SUCCESS,
  FDM_ACTION_WARNING,
  FDM_COPY_EMPTY,
  FDM_COPY_SUCCESS,
  FDM_EXPORT_EMPTY,
  FDM_EXPORT_SUCCESS,
  UNKNOWN_ERROR_MESSAGE,
} from '@/core/copyFeedbackMessages'
import {
  buildTraceCommentLines,
  TRACE_NONE_VALUE,
  TRACE_SCHEMA_VERSION,
} from '@/core/traceKeys'
import { useExportActions } from '@/composables/useExportActions'
import GcodePreviewPanel from '@/components/gcode/GcodePreviewPanel.vue'
import { useGcodePathEndToolPosition } from '@/composables/useGcodePathEndToolPosition'
import { buildFdmSlicePreviewSyntheticGcode } from '@/core/fdm/fdmSlicePreviewGcode'

const router = useRouter()
const route = useRoute()
const carveraStore = useCarveraStore()
const gridbotStore = useGridBotStore()
const fdmStore = useFdmStore()
const { copyText, copyJson, exportJson } = useExportActions()

const current = reactive({
  device: 'Any.Generic.Marlin',
  process: 'default',
  material: 'PLA',
})

const currentProcessDetail = ref<FdmProcess | null>(null)

const currentJob = computed(() => fdmStore.currentJob)

const processChangedFromJob = computed(() => {
  const snap = currentJob.value?.processSnapshot
  const cur = currentProcessDetail.value
  if (!snap || !cur) return false

  return (
    snap.sliceHeight !== cur.sliceHeight ||
    snap.firstSliceHeight !== cur.firstSliceHeight ||
    snap.sliceShells !== cur.sliceShells ||
    snap.sliceTopLayers !== cur.sliceTopLayers ||
    snap.sliceBottomLayers !== cur.sliceBottomLayers ||
    snap.sliceLineWidth !== cur.sliceLineWidth ||
    snap.sliceFillType !== cur.sliceFillType ||
    snap.sliceFillSparse !== cur.sliceFillSparse ||
    snap.sliceFillOverlap !== cur.sliceFillOverlap ||
    snap.sliceSupportEnable !== cur.sliceSupportEnable ||
    snap.sliceSupportDensity !== cur.sliceSupportDensity
  )
})

interface ModelItem {
  id: string
  name: string
  file: File | null
  needsFile?: boolean
}

const models = ref<ModelItem[]>([])
const selectedModelId = ref<string | null>(null)
// 多选集合：列表/场景统一用它驱动高亮；selectedModelId 表示“当前（最后一次点击）”用于信息面板
const selectedModelIds = ref<Set<string>>(new Set())

type Vec3 = { x: string; y: string; z: string }

const modelInfo = ref<null | {
  id: string
  name: string
  ext: string
  size: Vec3
  min: Vec3
  max: Vec3
  volume: string
}>(null)

import type { Transform } from '@/types/job'

const transforms = reactive(new Map<string, Transform>())
const activeTransform = ref<Transform | null>(null)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const sliceCanvasRef = ref<HTMLCanvasElement | null>(null)
const fdmViewportTool = ref({ x: 0, y: 0, z: 0 })
const fdmViewportStem = ref(0x409eff)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: any = null
let meshGroup: THREE.Group | null = null
let raf = 0

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const selectedMeshes = new Set<THREE.Object3D>()
// id <-> Object3D 映射，用于多模型加载/删除/高亮
const objectByModelId = new Map<string, THREE.Object3D>()
// 通过射线拾取到任意子 mesh 时，向上追溯可拿到所属 modelId
const modelIdByObject = new WeakMap<THREE.Object3D, string>()
const defaultColor = 0x5b8ff9
const highlightColor = 0xffa940

const isSlicing = computed(() => fdmStore.slicing)
const sliceResult = computed(() => fdmStore.sliceResult)

const fdmViewportGcode = computed(() => {
  const r = sliceResult.value
  if (!r) return ''
  return buildFdmSlicePreviewSyntheticGcode(r)
})

useGcodePathEndToolPosition(fdmViewportGcode, fdmViewportTool)

const sliceTelemetryTimeline = computed(() => fdmStore.sliceTelemetryTimeline)
const sliceRuntimeHint = computed(() => {
  const res = sliceResult.value
  if (!res) {
    return '尚未切片；可选择 Mock 或 Kiri 后端执行'
  }
  const backend = res.backend || 'mock'
  if (backend === 'kiri') {
    return '当前结果来自 Kiri 后端'
  }
  if (res.fallback) {
    const code = res.fallback.warningCode ? ` / ${res.fallback.warningCode}` : ''
    return `当前结果已回退到 Mock（原因：${getSliceFallbackReasonLabel(res.fallback.reasonCode)}${code}）`
  }
  return '当前结果来自 Mock 后端'
})
const sliceSourceTag = computed(() => {
  const res = sliceResult.value
  if (!res) return 'none'
  if (res.backend === 'kiri') return 'kiri'
  if (res.fallback) return `mock-fallback:${res.fallback.reasonCode}`
  return 'mock'
})
const sendToCarveraLabel = computed(() => {
  const res = sliceResult.value
  if (!res) return '发送到 Carvera（无切片）'
  if (res.backend === 'kiri') return '发送到 Carvera（Kiri）'
  if (res.fallback) return '发送到 Carvera（回退结果）'
  return '发送到 Carvera（Mock）'
})
const sendToGridBotLabel = computed(() => {
  const res = sliceResult.value
  if (!res) return '发送到 GridBot（无切片）'
  if (res.backend === 'kiri') return '发送到 GridBot（Kiri）'
  if (res.fallback) return '发送到 GridBot（回退结果）'
  return '发送到 GridBot（Mock）'
})
const activeLayerIndex = ref(0)
const includeTelemetryInGcode = computed({
  get: () => fdmStore.exportGcodeIncludeDiagnostics,
  set: (v: boolean) => fdmStore.setExportGcodeIncludeDiagnostics(v),
})

const jobs = computed(() => fdmStore.jobs)
const selectedJobTelemetryDigest = computed(() => {
  const id = selectedJobId.value
  if (!id) return []
  return jobs.value.find((j) => j.id === id)?.sliceTelemetryDigest ?? []
})
const selectedJobDiagnosticsSnapshot = computed(() => {
  const id = selectedJobId.value
  if (!id) return ''
  return jobs.value.find((j) => j.id === id)?.currentDiagnosticsSnapshot?.trim() ?? ''
})
const selectedJobSliceInputMeta = computed(() => {
  const id = selectedJobId.value
  if (!id) return null
  return jobs.value.find((j) => j.id === id)?.sliceInputMeta ?? null
})
const selectedJobSliceLegacyDebug = computed(() => {
  const id = selectedJobId.value
  if (!id) return null
  return jobs.value.find((j) => j.id === id)?.sliceLegacyDebug ?? null
})
const selectedJobResolvedTrace = computed(() =>
  resolveFdmTrace({
    selectedJobId: selectedJobId.value,
    selectedJobName: selectedJobId.value ? (jobs.value.find((j) => j.id === selectedJobId.value)?.name ?? null) : null,
    telemetryDigest: selectedJobTelemetryDigest.value,
    jobSliceInputMeta: selectedJobSliceInputMeta.value,
    jobLegacyDebug: selectedJobSliceLegacyDebug.value,
  }),
)
const selectedJobComparisonSourceLabel = computed(() => selectedJobResolvedTrace.value.sourceLabel)
const selectedJobLegacyComparisonSourceFingerprint = computed(() => selectedJobResolvedTrace.value.sourceFingerprint)
const selectedJobTraceExportContext = computed(() =>
  buildFdmTraceExportContext({
    selectedJobId: currentJob.value?.id ?? selectedJobId.value,
    selectedJobName: currentJob.value?.name ?? null,
    trace: selectedJobResolvedTrace.value,
  }),
)
const selectedJobId = computed({
  get: () => fdmStore.selectedJobId,
  set: (val: string | null) => fdmStore.selectJob(val),
})

const sliceBackendKind = computed({
  get: () => fdmStore.backendKind,
  set: (val: SliceBackendKind) => fdmStore.setBackendKind(val),
})

function exportSceneVerticesWorld(): Float32Array {
  const verts: number[] = []
  const v = new THREE.Vector3()

  for (const obj of objectByModelId.values()) {
    obj.updateWorldMatrix(true, true)
    obj.traverse((c) => {
      const mesh = c as THREE.Mesh
      if (!(mesh as any).isMesh) return

      const geom = (mesh as any).geometry as THREE.BufferGeometry | undefined
      const pos = geom?.attributes?.position as THREE.BufferAttribute | undefined
      if (!pos) return

      mesh.updateWorldMatrix(true, false)
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i)
        v.applyMatrix4(mesh.matrixWorld)
        verts.push(v.x, v.y, v.z)
      }
    })
  }

  return new Float32Array(verts)
}

function initThree() {
  const canvas = canvasRef.value
  if (!canvas) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
  camera.position.set(180, 140, 180)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)

  const dir = new THREE.DirectionalLight(0xffffff, 0.6)
  dir.position.set(200, 400, 200)
  scene.add(dir)

  meshGroup = new THREE.Group()
  scene.add(meshGroup)

  const grid = new THREE.GridHelper(300, 30, 0x999999, 0xdddddd)
  scene.add(grid)

  const axes = new THREE.AxesHelper(80)
  scene.add(axes)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.target.set(0, 0, 0)
  controls.update()

  const resize = () => {
    if (!renderer || !camera || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  const onPointerDown = (ev: PointerEvent) => {
    if (!renderer || !camera || !scene) return
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1)

    if (!meshGroup) {
      if (!ev.ctrlKey && !ev.metaKey) {
        selectedModelIds.value.clear()
        selectedModelId.value = null
        syncSelectionHighlight()
        modelInfo.value = null
      }
      return
    }

    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(meshGroup.children, true)
    const firstHit = hits[0]
    if (!firstHit) {
      if (!ev.ctrlKey && !ev.metaKey) {
        selectedModelIds.value.clear()
        selectedModelId.value = null
        syncSelectionHighlight()
        modelInfo.value = null
      }
      return
    }

    const obj = firstHit.object
    toggleSelection(obj, ev)
  }

  const animate = () => {
    raf = requestAnimationFrame(animate)
    controls?.update()
    renderer?.render(scene!, camera!)
  }

  // 初始 resize
  queueMicrotask(resize)
  window.addEventListener('resize', resize)
  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  animate()

  // 返回销毁函数
  return () => {
    window.removeEventListener('resize', resize)
    renderer?.domElement.removeEventListener('pointerdown', onPointerDown)
    cancelAnimationFrame(raf)
    controls?.dispose()
    renderer?.dispose()
    controls = null
    renderer = null
    scene = null
    camera = null
    meshGroup = null
  }
}

let disposeThree: (() => void) | undefined

async function reload() {
  const cur = await readCurrentKeys()
  current.device = cur.device
  current.process = cur.process
  current.material = cur.material

  const proc = await getFdmProcess(cur.process)
  currentProcessDetail.value = proc ? clonePlain(proc) : null
}

function go(path: string) {
  router.push(path)
}

async function copyEstimateMetaJson() {
  const result = sliceResult.value
  if (!result?.summary?.estimateMeta) {
    ElMessage.info(FDM_COPY_EMPTY.estimateMetaJson)
    return
  }
  const payload = buildEstimateMetaExportPayload(result, {
    ...buildFdmEstimateMetaExportContext({
      device: current.device,
      process: current.process,
      material: current.material,
      traceContext: selectedJobTraceExportContext.value,
    }),
  })
  if (!payload) {
    ElMessage.info(FDM_COPY_EMPTY.estimateMetaJson)
    return
  }
  await copyJson(payload, FDM_COPY_SUCCESS.estimateMetaJson)
}

async function copyEstimateMetaCompactSummary() {
  const result = sliceResult.value
  if (!result?.summary?.estimateMeta) {
    ElMessage.info(FDM_COPY_EMPTY.estimateMetaSummary)
    return
  }
  const line = buildEstimateMetaCompactSummary(result, {
    device: current.device,
    process: current.process,
    material: current.material,
    jobId: currentJob.value?.id ?? null,
    jobName: currentJob.value?.name ?? null,
  })
  if (!line) {
    ElMessage.info(FDM_COPY_EMPTY.estimateMetaSummary)
    return
  }
  await copyText(line, FDM_COPY_SUCCESS.estimateMetaSummary)
}

async function copyJobTelemetryDigest() {
  const hasDigest = selectedJobTelemetryDigest.value.length > 0
  const meta = selectedJobSliceInputMeta.value
  if (!hasDigest && !meta) {
    ElMessage.info(FDM_COPY_EMPTY.jobTelemetryDigest)
    return
  }
  const header = buildFdmTraceHeaderLines({
    sourceLabel: selectedJobComparisonSourceLabel.value,
    sourceFingerprint: selectedJobLegacyComparisonSourceFingerprint.value,
    selectedJobId: selectedJobId.value,
  }).join('\n')
  const parts: string[] = []
  if (hasDigest) {
    parts.push(buildTelemetryDigestText(selectedJobTelemetryDigest.value, { header }))
  } else {
    parts.push(header)
  }
  if (meta) {
    parts.push('--- sliceInputMeta (job saved) ---')
    parts.push(JSON.stringify(meta))
  }
  await copyText(parts.join('\n\n'), FDM_COPY_SUCCESS.jobTelemetryDigest)
}

async function copyJobDiagnosticsSnapshot() {
  const text = selectedJobDiagnosticsSnapshot.value
  if (!text) {
    ElMessage.info(FDM_COPY_EMPTY.jobDiagnosticsSnapshot)
    return
  }
  const header = buildFdmTraceHeaderLines({
    sourceLabel: selectedJobComparisonSourceLabel.value,
    sourceFingerprint: selectedJobLegacyComparisonSourceFingerprint.value,
    selectedJobId: selectedJobId.value,
  }).join('\n')
  await copyText(`${header}\n\n${text}`, FDM_COPY_SUCCESS.jobDiagnosticsSnapshot)
}

function buildLegacyDebugSummaryText(debug: SliceLegacyDebugSnapshot, scope: 'currentLegacy' | 'targetLegacy'): string {
  const lines = [
    `${scope}.ready=${debug.ready ? '1' : '0'}`,
    `${scope}.hasSlice=${debug.hasSliceImpl ? '1' : '0'}`,
  ]
  if (debug.initErrorMessage) lines.push(`${scope}.initError=${debug.initErrorMessage}`)
  if (debug.legacyImportErrorMessage) lines.push(`${scope}.importError=${debug.legacyImportErrorMessage}`)
  return lines.join('\n')
}

async function copyLiveLegacyDebugSummary() {
  const debug = sliceResult.value?.legacyDebug
  if (!debug) {
    ElMessage.info(FDM_COPY_EMPTY.currentLegacy)
    return
  }
  await copyText(buildLegacyDebugSummaryText(debug, 'currentLegacy'), FDM_COPY_SUCCESS.currentLegacy)
}

async function copyJobLegacyDebugSummary() {
  const debug = selectedJobSliceLegacyDebug.value
  if (!debug) {
    ElMessage.info(FDM_COPY_EMPTY.targetLegacy)
    return
  }
  await copyText(buildLegacyDebugSummaryText(debug, 'targetLegacy'), FDM_COPY_SUCCESS.targetLegacy)
}

async function copyLegacyFdmComparisonBundle() {
  const text = buildFdmLegacyComparisonBundleText({
    liveLegacyDebug: sliceResult.value?.legacyDebug,
    jobLegacyDebug: selectedJobSliceLegacyDebug.value,
    fallbackReasonCode: sliceResult.value?.fallback?.reasonCode ?? null,
    telemetryDigest: selectedJobTelemetryDigest.value,
    jobSliceInputMeta: selectedJobSliceInputMeta.value,
    ...buildFdmLegacyComparisonTrace({
      traceContext: selectedJobTraceExportContext.value,
    }),
  })
  await copyText(text, FDM_COPY_SUCCESS.comparisonBundle)
}

async function copyLegacyFdmSourceFingerprint() {
  const text = selectedJobLegacyComparisonSourceFingerprint.value.trim()
  if (!text || text === TRACE_NONE_VALUE) {
    ElMessage.info(FDM_COPY_EMPTY.sourceFingerprint)
    return
  }
  await copyText(text, FDM_COPY_SUCCESS.sourceFingerprint)
}

async function copyLegacyFdmSourceLabel() {
  const text = selectedJobComparisonSourceLabel.value.trim()
  if (!text || text === TRACE_NONE_VALUE) {
    ElMessage.info(FDM_COPY_EMPTY.sourceLabel)
    return
  }
  await copyText(text, FDM_COPY_SUCCESS.sourceLabel)
}

async function copyCurrentTimelineDiagnostics() {
  if (!sliceTelemetryTimeline.value.length) {
    ElMessage.info(FDM_COPY_EMPTY.timelineDiagnostics)
    return
  }
  const body =
    getSlicerDebugApi(window)?.exportDiagnostics({
      header: selectedJobId.value ? `jobId=${selectedJobId.value}` : 'jobId=unknown',
    }) ?? ''
  if (!body) {
    ElMessage.info(FDM_COPY_EMPTY.timelineDiagnostics)
    return
  }
  const contextLines = [
    `backend=${sliceResult.value?.backend || 'unknown'}`,
    `fallbackReason=${sliceResult.value?.fallback?.reasonCode || 'none'}`,
    ...buildFdmTraceHeaderLines({
      sourceLabel: selectedJobComparisonSourceLabel.value,
      sourceFingerprint: selectedJobLegacyComparisonSourceFingerprint.value,
      selectedJobId: selectedJobId.value,
    }),
  ]
  await copyText([...contextLines, body].join('\n'), FDM_COPY_SUCCESS.timelineDiagnostics)
}

function exportEstimateMetaJson() {
  const result = sliceResult.value
  if (!result?.summary?.estimateMeta) {
    ElMessage.info(FDM_EXPORT_EMPTY.estimateMetaJson)
    return
  }
  const payload = buildEstimateMetaExportPayload(result, {
    ...buildFdmEstimateMetaExportContext({
      device: current.device,
      process: current.process,
      material: current.material,
      traceContext: selectedJobTraceExportContext.value,
    }),
  })
  if (!payload) {
    ElMessage.info(FDM_EXPORT_EMPTY.estimateMetaJson)
    return
  }
  const filename = `fdm-estimate-meta-${payload.fingerprint.slice(0, 48).replace(/[^a-zA-Z0-9:_-]/g, '_')}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.json`
  exportJson(filename, payload, FDM_EXPORT_SUCCESS.estimateMetaJson)
}

async function onFilesSelected(file: UploadFile, fileList: UploadUserFile[]) {
  modelInfo.value = null

  // Element Plus 的 change 返回当前文件和整个 fileList，我们只关心原生 File 对象
  for (const uf of fileList) {
    const raw = uf.raw
    if (!raw) continue

    // 若是从 Job 恢复的占位模型，允许用新文件覆盖
    const placeholder = models.value.find((m) => m.needsFile && m.name === raw.name)
    if (placeholder) {
      placeholder.file = raw
      placeholder.needsFile = false
      selectedModelId.value = placeholder.id
      await loadSelectedModel()
      continue
    }
    const id = `${raw.name}-${raw.size}-${raw.lastModified}-${Math.random().toString(36).slice(2)}`
    if (models.value.some((m) => m.id === id)) continue
    models.value.push({
      id,
      name: raw.name,
      file: raw,
      needsFile: false,
    })

    // 首次导入一个受支持格式的模型时，作为默认当前并加载
    const lower = raw.name.toLowerCase()
    const supported = lower.endsWith('.stl') || lower.endsWith('.obj') || lower.endsWith('.3mf')
    if (!selectedModelId.value && supported) {
      selectedModelId.value = id
      await loadSelectedModel()
    }
  }
}

function removeModel(id: string) {
  models.value = models.value.filter((m) => m.id !== id)

  // 场景移除（多模型）
  const obj = objectByModelId.get(id)
  if (obj && meshGroup) {
    meshGroup.remove(obj)
    disposeObject(obj)
    objectByModelId.delete(id)
  }

  // 选择态清理
  selectedModelIds.value.delete(id)
  transforms.delete(id)
  if (selectedModelId.value === id) {
    const next = selectedModelIds.value.values().next().value as string | undefined
    selectedModelId.value = next ?? null
  }

  syncSelectionHighlight()
  syncModelInfoFromActive()

  // 若删空，兜底清场景
  if (models.value.length === 0) {
    clearMeshes()
    modelInfo.value = null
  }
}

function setMeshColor(obj: THREE.Object3D, color: number) {
  obj.traverse((c) => {
    const m = c as THREE.Mesh
    if ((m as any).isMesh) {
      const mat = (m as any).material
      if (Array.isArray(mat)) {
        mat.forEach((mm) => mm?.color?.set?.(color))
      } else {
        mat?.color?.set?.(color)
      }
    }
  })
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((c) => {
    const m = c as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    const mat = (m as any).material
    if (Array.isArray(mat)) mat.forEach((x) => x?.dispose?.())
    else mat?.dispose?.()
  })
}

function syncSelectionHighlight() {
  // 先恢复所有模型为默认色
  for (const obj of objectByModelId.values()) {
    setMeshColor(obj, defaultColor)
  }
  // 再为选中模型设置高亮色
  for (const id of selectedModelIds.value) {
    const obj = objectByModelId.get(id)
    if (obj) setMeshColor(obj, highlightColor)
  }
}

function syncModelInfoFromActive() {
  const id = selectedModelId.value
  if (!id) {
    modelInfo.value = null
    activeTransform.value = null
    return
  }
  const item = models.value.find((m) => m.id === id)
  const obj = objectByModelId.get(id)
  if (item && obj) {
    updateModelInfo(id, item.name, obj)

    const t = transforms.get(id)
    if (t) {
      activeTransform.value = t
    } else {
      activeTransform.value = null
    }
  } else {
    modelInfo.value = null
    activeTransform.value = null
  }
}

function ensureTransform(id: string, obj: THREE.Object3D) {
  const existing = transforms.get(id)
  if (existing) return existing
  const t: Transform = {
    position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
    rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
    scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
  }
  transforms.set(id, t)
  return t
}

function applyActiveTransform() {
  const id = selectedModelId.value
  const t = activeTransform.value
  if (!id || !t) return
  const obj = objectByModelId.get(id)
  if (!obj) return
  obj.position.set(t.position.x, t.position.y, t.position.z)
  obj.rotation.set(t.rotation.x, t.rotation.y, t.rotation.z)
  obj.scale.set(t.scale.x, t.scale.y, t.scale.z)

  // 变换后更新信息面板尺寸/bbox
  const item = models.value.find((m) => m.id === id)
  if (item) updateModelInfo(id, item.name, obj)
}

function clearSelection() {
  selectedModelIds.value.clear()
  selectedModelId.value = null
  syncSelectionHighlight()
  modelInfo.value = null
}

function onJobRowClick(row: FdmJobRecord) {
  selectedJobId.value = row.id

  // 恢复当时使用的后端（如果有记录）
  if (row.backend) {
    sliceBackendKind.value = row.backend
  }
  fdmStore.setSliceTelemetryTimeline(row.sliceTelemetryDigest ?? [])

  ElMessage.info(`${FDM_ACTION_INFO.selectedJobPrefix}${row.name}`)
}

async function onUpdateJobClick() {
  if (!selectedJobId.value) return

  const job = await buildSliceJobPayload()
  if (!job) {
    ElMessage.warning(FDM_ACTION_WARNING.noModelInfoToSave)
    return
  }

  const cur = await readCurrentKeys()
  const procRaw = await getFdmProcess(cur.process)
  const proc = procRaw ? clonePlain(procRaw) : null
  const currentDiagnostics =
    getSlicerDebugApi(window)?.exportDiagnostics({
      header: selectedJobId.value ? `jobId=${selectedJobId.value}` : 'jobId=unknown',
    }) ?? ''

  await saveFdmJob({
    ...(job as FdmJobRecord),
    id: selectedJobId.value,
    summary: sliceResult.value?.summary,
    backend: sliceResult.value?.backend || sliceBackendKind.value,
    sliceTelemetryDigest: buildSliceTelemetryDigestForJob(fdmStore.sliceTelemetryTimeline),
    sliceInputMeta: sliceResult.value?.inputMeta,
    sliceLegacyDebug: sliceResult.value?.legacyDebug,
    currentDiagnosticsSnapshot: currentDiagnostics || undefined,
    processSnapshot: proc ?? undefined,
  })

  await reloadJobs()
  ElMessage.success(FDM_ACTION_SUCCESS.updatedCurrentJob)
}

async function onRowClick(row: { id: string }, _: any, ev: MouseEvent) {
  const id = row.id

  // 确保模型已加载
  if (!objectByModelId.get(id)) {
    selectedModelId.value = id
    await loadSelectedModel()
  }

  // 更新多选集合（Ctrl/Meta toggle，否则单选）
  if (ev.ctrlKey || ev.metaKey) {
    if (selectedModelIds.value.has(id)) {
      selectedModelIds.value.delete(id)
    } else {
      selectedModelIds.value.add(id)
    }
  } else {
    selectedModelIds.value.clear()
    selectedModelIds.value.add(id)
  }

  selectedModelId.value = id
  syncSelectionHighlight()
  syncModelInfoFromActive()
}

function toggleSelection(obj: THREE.Object3D, ev?: PointerEvent) {
  // 从任意 mesh/子对象向上追溯所属 modelId
  let target: THREE.Object3D | null = obj
  while (target && !modelIdByObject.has(target) && target.parent) {
    target = target.parent
  }
  if (!target) return

  const modelId = modelIdByObject.get(target)
  if (!modelId) return

  if (ev?.ctrlKey || ev?.metaKey) {
    if (selectedModelIds.value.has(modelId)) {
      selectedModelIds.value.delete(modelId)
    } else {
      selectedModelIds.value.add(modelId)
    }
  } else {
    selectedModelIds.value.clear()
    selectedModelIds.value.add(modelId)
  }

  selectedModelId.value = modelId
  syncSelectionHighlight()
  syncModelInfoFromActive()
}

function clearMeshes() {
  selectedModelIds.value.clear()
  selectedModelId.value = null
  objectByModelId.clear()
  transforms.clear()
  activeTransform.value = null
  fdmStore.setSliceResult(null)
  activeLayerIndex.value = 0
  modelInfo.value = null
  if (!meshGroup) return
  while (meshGroup.children.length) {
    const obj = meshGroup.children.pop()!
    disposeObject(obj)
  }
}

function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function vec3ToFmt(v: THREE.Vector3): Vec3 {
  return { x: fmt(v.x), y: fmt(v.y), z: fmt(v.z) }
}

function updateModelInfo(id: string, name: string, obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3()
  box.getSize(size)

  // 体积粗略估算：包围盒体积（不是真实体积）
  const volume = size.x * size.y * size.z

  const ext = name.toLowerCase().split('.').pop() || ''

  modelInfo.value = {
    id,
    name,
    ext,
    size: vec3ToFmt(size),
    min: vec3ToFmt(box.min),
    max: vec3ToFmt(box.max),
    volume: fmt(volume),
  }
}

async function loadSelectedModel() {
  const id = selectedModelId.value
  if (!id) {
    modelInfo.value = null
    return
  }
  await loadModelById(id)
}

async function loadModelById(id: string) {
  const item = models.value.find((m) => m.id === id)
  if (!item) return
  if (!meshGroup || !scene || !camera) return

  // 已加载则直接更新信息
  const existing = objectByModelId.get(id)
  if (existing) {
    ensureTransform(id, existing)
    updateModelInfo(id, item.name, existing)
    return
  }

  const lower = item.name.toLowerCase()

  let loadedObj: THREE.Object3D | null = null
  let maxDim = 200

  if (lower.endsWith('.stl')) {
    if (!item.file) {
      ElMessage.warning(FDM_ACTION_WARNING.modelNeedsReimportFromJob)
      return
    }
    const buf = await item.file.arrayBuffer()
    const loader = new STLLoader()
    const geom = loader.parse(buf)
    geom.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({ color: defaultColor, metalness: 0.1, roughness: 0.8 })
    const mesh = new THREE.Mesh(geom, mat)

    geom.computeBoundingBox()
    const box = geom.boundingBox!
    const center = new THREE.Vector3()
    box.getCenter(center)
    mesh.position.sub(center)
    mesh.position.y -= box.min.y - center.y

    meshGroup.add(mesh)
    loadedObj = mesh

    const size = new THREE.Vector3()
    box.getSize(size)
    maxDim = Math.max(size.x, size.y, size.z)
  } else if (lower.endsWith('.obj')) {
    if (!item.file) {
      ElMessage.warning(FDM_ACTION_WARNING.modelNeedsReimportFromJob)
      return
    }
    const text = await item.file.text()
    const loader = new OBJLoader()
    const obj = loader.parse(text)

    const box = new THREE.Box3().setFromObject(obj)
    const center = new THREE.Vector3()
    box.getCenter(center)
    obj.position.sub(center)
    obj.position.y -= box.min.y - center.y

    obj.traverse((c: any) => {
      if ((c as any).isMesh) {
        const m = c as any
        if (!Array.isArray((m as any).material) && !(m as any).material) {
          ;(m as any).material = new THREE.MeshStandardMaterial({
            color: defaultColor,
            metalness: 0.1,
            roughness: 0.8,
          })
        }
      }
    })

    meshGroup.add(obj)
    loadedObj = obj

    const size = new THREE.Vector3()
    box.getSize(size)
    maxDim = Math.max(size.x, size.y, size.z)
  } else if (lower.endsWith('.3mf')) {
    if (!item.file) {
      ElMessage.warning(FDM_ACTION_WARNING.modelNeedsReimportFromJob)
      return
    }
    const buf = await item.file.arrayBuffer()
    const loader = new ThreeMFLoader()
    const obj = loader.parse(buf)

    const box = new THREE.Box3().setFromObject(obj)
    const center = new THREE.Vector3()
    box.getCenter(center)
    obj.position.sub(center)
    obj.position.y -= box.min.y - center.y

    meshGroup.add(obj)
    loadedObj = obj

    const size = new THREE.Vector3()
    box.getSize(size)
    maxDim = Math.max(size.x, size.y, size.z)
  } else {
    modelInfo.value = null
    return
  }

  if (loadedObj) {
    objectByModelId.set(id, loadedObj)
    loadedObj.traverse((c) => {
      const m = c as THREE.Mesh
      if ((m as any).isMesh) {
        modelIdByObject.set(m, id)
      }
    })

    ensureTransform(id, loadedObj)

    const dist = maxDim * 1.2 + 100
    camera.position.set(dist, dist * 0.8, dist)
    controls?.target.set(0, 0, 0)
    controls?.update()

    updateModelInfo(item.id, item.name, loadedObj)
  }
}

async function reloadJobs() {
  await fdmStore.loadJobs()
}

onMounted(async () => {
  await reload()
  await reloadJobs()
  initSlicerDebugSession(window, sessionStorage, {
    dumpTimeline: () => [...fdmStore.sliceTelemetryTimeline],
    clearTimeline: () => fdmStore.clearSliceTelemetryTimeline(),
    getDiagnosticsContext: () => ({
      jobId: fdmStore.selectedJobId,
      liveSliceInputMeta: fdmStore.sliceResult?.inputMeta ?? null,
      savedJobSliceInputMeta:
        fdmStore.selectedJobId != null
          ? (fdmStore.jobs.find((j) => j.id === fdmStore.selectedJobId)?.sliceInputMeta ?? null)
          : null,
      liveLegacyDebug: fdmStore.sliceResult?.legacyDebug ?? null,
      savedJobLegacyDebug:
        fdmStore.selectedJobId != null
          ? (fdmStore.jobs.find((j) => j.id === fdmStore.selectedJobId)?.sliceLegacyDebug ?? null)
          : null,
    }),
  })
  disposeThree = initThree()

  const jobId = route.query.jobId as string | undefined
  if (jobId) {
    const jobRaw = await getFdmJob(jobId)
    const job = jobRaw ? clonePlain(jobRaw) : null
    if (job) {
      fdmStore.selectJob(job.id)

      // 恢复 Job 保存时的后端选择
      if (job.backend) {
        fdmStore.setBackendKind(job.backend)
      }
      fdmStore.setSliceTelemetryTimeline(job.sliceTelemetryDigest ?? [])

      // 从 Job 模型列表恢复占位条目，提示用户按文件名重新导入
      models.value = job.models.map((m) => ({
        id: m.id,
        name: m.name,
        file: null,
        needsFile: true,
      }))
      selectedModelId.value = null
      objectByModelId.clear()
      transforms.clear()
      clearMeshes()
      modelInfo.value = null
      ElMessage.info(`${FDM_ACTION_SUCCESS.restoredModelListFromJobPrefix}${job.name}`)
    }
  }
})

function drawSlicePreview() {
  const canvas = sliceCanvasRef.value
  const result = sliceResult.value
  if (!canvas || !result) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { preview } = result
  const layer = preview.layers[activeLayerIndex.value]
  if (!layer) return

  const { minX, minY, maxX, maxY } = preview.bounds
  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)
  ctx.save()

  const scaleX = width / (maxX - minX || 1)
  const scaleY = height / (maxY - minY || 1)
  const scale = Math.min(scaleX, scaleY)

  const mapPoint = (x: number, y: number): [number, number] => {
    const nx = (x - minX) * scale
    const ny = (y - minY) * scale
    return [nx, height - ny]
  }

  for (const path of layer.paths) {
    if (path.points.length < 2) continue

    switch (path.type) {
      case 'perimeter':
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        break
      case 'infill':
        ctx.strokeStyle = '#409eff'
        ctx.lineWidth = 1
        break
      case 'support':
        ctx.strokeStyle = '#e6a23c'
        ctx.lineWidth = 1
        break
      case 'travel':
        ctx.strokeStyle = '#909399'
        ctx.lineWidth = 0.5
        ctx.setLineDash([4, 4])
        break
      default:
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1
    }

    const firstPoint = path.points[0]
    if (!firstPoint) continue

    ctx.beginPath()
    const [sx, sy] = mapPoint(firstPoint[0], firstPoint[1])
    ctx.moveTo(sx, sy)
    for (let i = 1; i < path.points.length; i++) {
      const pt = path.points[i]
      if (!pt) continue
      const [x, y] = mapPoint(pt[0], pt[1])
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.restore()
}

watch(
  () => [sliceResult.value, activeLayerIndex.value],
  () => {
    drawSlicePreview()
  }
)

async function buildSliceJobPayload(): Promise<SliceJobPayload | null> {
  const sceneModels: SceneModelPayload[] = []

  for (const m of models.value) {
    const obj = objectByModelId.get(m.id)
    const t = transforms.get(m.id)
    if (!obj || !t) continue

    const box = new THREE.Box3().setFromObject(obj)
    const size = new THREE.Vector3()
    box.getSize(size)

    sceneModels.push({
      id: m.id,
      name: m.name,
      ext: m.name.toLowerCase().split('.').pop() || '',
      transform: t,
      bbox: {
        size: { x: size.x, y: size.y, z: size.z },
        min: { x: box.min.x, y: box.min.y, z: box.min.z },
        max: { x: box.max.x, y: box.max.y, z: box.max.z },
      },
    })
  }

  if (!sceneModels.length) return null

  const cur = await readCurrentKeys()
  const now = Date.now()

  // 汇总所有模型 bbox 得到 Job 的整体尺寸
  const allMins = sceneModels.map((m) => m.bbox.min)
  const allMaxs = sceneModels.map((m) => m.bbox.max)
  const jobMin = {
    x: Math.min(...allMins.map((v) => v.x)),
    y: Math.min(...allMins.map((v) => v.y)),
    z: Math.min(...allMins.map((v) => v.z)),
  }
  const jobMax = {
    x: Math.max(...allMaxs.map((v) => v.x)),
    y: Math.max(...allMaxs.map((v) => v.y)),
    z: Math.max(...allMaxs.map((v) => v.z)),
  }
  const jobSize = {
    x: jobMax.x - jobMin.x,
    y: jobMax.y - jobMin.y,
    z: jobMax.z - jobMin.z,
  }

  return {
    id: `fdm-${now}-${Math.random().toString(36).slice(2)}`,
    name: `FDM Job ${new Date(now).toLocaleString()}`,
    createdAt: now,
    updatedAt: now,
    mode: 'FDM',
    device: cur.device,
    process: cur.process,
    material: cur.material,
    models: sceneModels,
    jobBounds: {
      size: jobSize,
      min: jobMin,
      max: jobMax,
    },
  }
}

async function onSliceClick() {
  if (fdmStore.slicing) return
  fdmStore.setSlicing(true)
  fdmStore.clearSliceTelemetryTimeline()
  try {
    const job = await buildSliceJobPayload()
    if (!job) {
      ElMessage.warning(FDM_ACTION_WARNING.noSliceableModels)
      return
    }

    const cur = await readCurrentKeys()
    const procRaw = await getFdmProcess(cur.process)
    const processConfig: FdmProcess | null = procRaw ? clonePlain(procRaw) : null

    const vertices = exportSceneVerticesWorld()
    if (!vertices.length) {
      ElMessage.warning(FDM_ACTION_WARNING.noSliceableGeometry)
      return
    }

    const backend = getSliceBackend(fdmStore.backendKind)
    const result = await backend.slice(job, vertices, processConfig ?? ({} as FdmProcess), {
      onTelemetry: (event) => {
        fdmStore.pushSliceTelemetryEvent(event)
      },
    })
    fdmStore.setSliceResult(result)
    activeLayerIndex.value = 0
    const currentDiagnostics =
      getSlicerDebugApi(window)?.exportDiagnostics({
        header: `jobId=${job.id}`,
      }) ?? ''

    await fdmStore.saveJob({
      ...(job as FdmJobRecord),
      summary: result.summary,
      backend: result.backend || fdmStore.backendKind,
      sliceTelemetryDigest: buildSliceTelemetryDigestForJob(fdmStore.sliceTelemetryTimeline),
      sliceInputMeta: result.inputMeta,
      sliceLegacyDebug: result.legacyDebug,
      currentDiagnosticsSnapshot: currentDiagnostics || undefined,
      processSnapshot: processConfig ?? undefined,
    })

    ElMessage.success(FDM_ACTION_SUCCESS.sliceSavedJob)
    drawSlicePreview()
  } catch (e) {
    console.error(e)
    ElMessage.error(`${FDM_ACTION_ERROR.sliceFailedPrefix}${(e as Error).message || UNKNOWN_ERROR_MESSAGE}`)
  } finally {
    fdmStore.setSlicing(false)
  }
}

function onPreviewClick() {
  if (!fdmStore.sliceResult) {
    ElMessage.info(FDM_ACTION_INFO.sliceRequired)
    return
  }
  drawSlicePreview()
  ElMessage.info('已刷新 2D 层预览；3D 折线视口随 sliceResult 更新。')
}

function onExportGcodeClick() {
  const result = fdmStore.sliceResult
  if (!result) {
    ElMessage.info(FDM_EXPORT_EMPTY.gcodeRequiresSlice)
    return
  }

  const summary = result.summary
  const job = currentJob.value
  const processDetail = currentProcessDetail.value
  const deviceName = current.device

  const lines: string[] = []
  lines.push('; FDM bridge G-code generated by shape_cam')
  lines.push(`; sliceSource=${sliceSourceTag.value}`)
  for (const trace of buildTraceCommentLines(selectedJobComparisonSourceLabel.value, selectedJobLegacyComparisonSourceFingerprint.value)) {
    lines.push(trace)
  }
  if (result.fallback) {
    lines.push(`; fallbackReason=${result.fallback.reasonCode}`)
    if (result.fallback.warningCode) {
      lines.push(`; fallbackWarningCode=${result.fallback.warningCode}`)
    }
  }
  appendLegacyFdmDebugComments(lines, result.legacyDebug)
  if (includeTelemetryInGcode.value && selectedJobTelemetryDigest.value.length) {
    appendTelemetryDigestComments(lines, selectedJobTelemetryDigest.value)
  }
  if (includeTelemetryInGcode.value && selectedJobDiagnosticsSnapshot.value) {
    appendDiagnosticsSnapshotComments(lines, selectedJobDiagnosticsSnapshot.value)
  }
  if (includeTelemetryInGcode.value) {
    appendSliceInputMetaPairForGcode(lines, result.inputMeta, selectedJobSliceInputMeta.value)
  }
  if (job?.name) lines.push(`; job: ${job.name}`)
  lines.push(`; device: ${deviceName}`)
  lines.push(`; process: ${processDetail?.processName || current.process}`)
  lines.push(`; layers: ${summary.layers}`)
  lines.push(`; est time (min): ${summary.timeMinutes.toFixed(2)}`)
  lines.push(`; est filament (mm): ${summary.filamentMm.toFixed(1)}`)
  lines.push('')
  lines.push('G21 ; set units to mm')
  lines.push('G90 ; absolute positioning')
  lines.push('M82 ; absolute extrusion')
  lines.push('')
  lines.push('; placeholderPath=1 (migration bridge output; real toolpaths pending legacy parity)')
  lines.push('')
  lines.push('M104 S0 ; turn off hotend')
  lines.push('M140 S0 ; turn off bed')
  lines.push('M84 ; disable motors')
  lines.push('')

  const text = lines.join('\n')
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const name = `fdm-${sliceSourceTag.value}-${new Date().toISOString().replace(/[:.]/g, '-')}.gcode`
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)

  ElMessage.success(`${FDM_EXPORT_SUCCESS.gcode}（${sliceSourceTag.value}）`)
}

function onSendToCarveraClick() {
  const baseName = currentJob.value?.name || 'FDM Job'

  const lines: string[] = []
  lines.push('; from workspace (bridge)')
  lines.push('; mode=FDM')
  lines.push(`; job=${baseName}`)
  lines.push(`; sliceSource=${sliceSourceTag.value}`)
  if (sliceResult.value?.fallback) {
    lines.push(`; fallbackReason=${sliceResult.value.fallback.reasonCode}`)
    if (sliceResult.value.fallback.warningCode) {
      lines.push(`; fallbackWarningCode=${sliceResult.value.fallback.warningCode}`)
    }
  }
  appendLegacyFdmDebugComments(lines, sliceResult.value?.legacyDebug)
  if (includeTelemetryInGcode.value && selectedJobTelemetryDigest.value.length) {
    appendTelemetryDigestComments(lines, selectedJobTelemetryDigest.value)
  }
  if (includeTelemetryInGcode.value && selectedJobDiagnosticsSnapshot.value) {
    appendDiagnosticsSnapshotComments(lines, selectedJobDiagnosticsSnapshot.value)
  }
  if (includeTelemetryInGcode.value) {
    appendSliceInputMetaPairForGcode(lines, sliceResult.value?.inputMeta, selectedJobSliceInputMeta.value)
  }

  if (sliceResult.value?.summary) {
    const s = sliceResult.value.summary
    lines.push(`; layers=${s.layers}`)
    lines.push(`; timeMinutes=${s.timeMinutes}`)
    lines.push(`; filamentMm=${s.filamentMm}`)
  } else {
    lines.push('; sliceResult=none')
  }

  lines.push(`; device=${current.device}`)
  lines.push(`; process=${current.process}`)
  lines.push(`; material=${current.material}`)

  // 占位刀路：安全、简单，便于测试通路
  lines.push('G90') // absolute positioning
  lines.push('G0 X0 Y0')
  lines.push('M5')
  lines.push('')

  const gcode = lines.join('\n')
  const ts = new Date()
  const tsName = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}`

  carveraStore.addJob({
    id: `fdm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${baseName}-${tsName}.gcode`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: gcode,
    size: gcode.length,
  })

  router.push('/carvera')
  ElMessage.success(`${FDM_ACTION_SUCCESS.sendToCarvera}（${sliceSourceTag.value}）`)
}

function onSendToGridBotClick() {
  const baseName = currentJob.value?.name || 'FDM Job'

  const lines: string[] = []
  lines.push('; from workspace (bridge)')
  lines.push('; mode=FDM')
  lines.push(`; job=${baseName}`)
  lines.push(`; sliceSource=${sliceSourceTag.value}`)
  if (sliceResult.value?.fallback) {
    lines.push(`; fallbackReason=${sliceResult.value.fallback.reasonCode}`)
    if (sliceResult.value.fallback.warningCode) {
      lines.push(`; fallbackWarningCode=${sliceResult.value.fallback.warningCode}`)
    }
  }
  appendLegacyFdmDebugComments(lines, sliceResult.value?.legacyDebug)
  if (includeTelemetryInGcode.value && selectedJobTelemetryDigest.value.length) {
    appendTelemetryDigestComments(lines, selectedJobTelemetryDigest.value)
  }
  if (includeTelemetryInGcode.value && selectedJobDiagnosticsSnapshot.value) {
    appendDiagnosticsSnapshotComments(lines, selectedJobDiagnosticsSnapshot.value)
  }
  if (includeTelemetryInGcode.value) {
    appendSliceInputMetaPairForGcode(lines, sliceResult.value?.inputMeta, selectedJobSliceInputMeta.value)
  }

  if (sliceResult.value?.summary) {
    const s = sliceResult.value.summary
    lines.push(`; layers=${s.layers}`)
    lines.push(`; timeMinutes=${s.timeMinutes}`)
    lines.push(`; filamentMm=${s.filamentMm}`)
  } else {
    lines.push('; sliceResult=none')
  }

  lines.push(`; device=${current.device}`)
  lines.push(`; process=${current.process}`)
  lines.push(`; material=${current.material}`)

  lines.push('M105')
  lines.push('M114')
  lines.push('G90')
  lines.push('G0 X0 Y0 Z0')
  lines.push('M84')
  lines.push('')

  const gcode = lines.join('\n')
  const ts = new Date()
  const tsName = `${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}`

  const job: GridBotJobRecord = {
    id: `fdm-gridbot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${baseName}-${tsName}.gcode`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: gcode,
  }

  void gridbotStore.saveJob(job)
  router.push('/gridbot')
  ElMessage.success(`${FDM_ACTION_SUCCESS.sendToGridBot}（${sliceSourceTag.value}）`)
}

async function onKiriPocClick() {
  try {
    let vertices = exportSceneVerticesWorld()

    // 如果场景为空，使用一个内置测试立方体（20x20x20）顶点数据
    if (!vertices.length) {
      const size = 20
      const half = size / 2
      const cubeVerts = [
        // 8 corners
        -half, -half, -half,
        half, -half, -half,
        half, half, -half,
        -half, half, -half,
        -half, -half, half,
        half, -half, half,
        half, half, half,
        -half, half, half,
      ]
      vertices = new Float32Array(cubeVerts)
      ElMessage.info(FDM_ACTION_INFO.kiriPocBuiltinCube)
    }

    const job = (await buildSliceJobPayload()) ?? {
      id: 'poc-cube',
      name: 'PoC Cube',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: 'FDM',
      device: 'Any.Generic.Marlin',
      process: 'default',
      material: 'PLA',
      models: [],
    }

    const cur = await readCurrentKeys()
    const procRaw = await getFdmProcess(cur.process)
    const proc = procRaw ? clonePlain(procRaw) : null

    const { runKiriPoc } = await import('@/api/kiri-poc')
    const result = await runKiriPoc(job, vertices, proc as FdmProcess)

    console.log('[Kiri PoC] result', result)
    ElMessage.success(`${FDM_ACTION_SUCCESS.kiriPocPrefix}${result.layerCount}${FDM_ACTION_SUCCESS.kiriPocSuffix}`)
  } catch (e) {
    console.error('[Kiri PoC] failed', e)
    ElMessage.error(`${FDM_ACTION_ERROR.kiriPocFailedPrefix}${(e as Error).message || UNKNOWN_ERROR_MESSAGE}`)
  }
}

onBeforeUnmount(() => {
  uninstallSlicerDebugApi(window)
  disposeThree?.()
  disposeThree = undefined
})
</script>

<style scoped>
.ws-root {
  height: calc(100vh - 60px); /* 60px header from MainLayout */
}
.ws-aside,
.ws-aside-right {
  background: #fff;
  border-right: 1px solid #dcdfe6;
}
.ws-aside-right {
  border-left: 1px solid #dcdfe6;
  border-right: none;
  width: 22%;
  min-width: 300px;
  max-width: 380px;
}
.ws-center {
  background: #f5f7fa;
}
.ws-viewport {
  padding: 12px;
}
.ws-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #dcdfe6;
  background: #fff;
}
.pane-title {
  padding: 10px 12px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
}
.pane-body {
  padding: 12px;
}
.placeholder {
  color: #909399;
}
.viewport {
  height: calc(100% - 36px);
  min-height: 520px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  padding: 0;
}
.viewport-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.slice-preview-canvas {
  width: 100%;
  max-width: 360px;
  height: 300px;
  border: 1px solid #ebeef5;
  background: #fff;
  display: block;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.hint {
  color: #909399;
  margin-left: 8px;
}

:deep(.el-table .is-selected) {
  background-color: #ecf5ff;
}
:deep(.el-table .is-selected td) {
  background-color: #ecf5ff !important;
}

.job-diagnostics-pre {
  margin: 0;
  max-height: 220px;
  overflow: auto;
  padding: 8px;
  font-size: 11px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
</style>
