<template>
  <div class="km-workspace">
    <div class="km-canvas-host">
      <canvas ref="canvasRef" class="viewport-canvas"></canvas>
    </div>

    <div class="km-mode-tools">
      <button type="button" :class="{ selected: workspacePhase === 'arrange' }" @click="onArrangeClick">
        <span class="km-mode-ico" aria-hidden="true">▣</span>
        <span>arrange</span>
      </button>
      <button
        type="button"
        :class="{ selected: workspacePhase === 'slice' }"
        :disabled="isSlicing"
        @click="onSliceModeClick"
      >
        <span class="km-mode-ico" aria-hidden="true">☰</span>
        <span>slice</span>
      </button>
      <button type="button" :class="{ selected: workspacePhase === 'preview' }" @click="onPreviewModeClick">
        <span class="km-mode-ico" aria-hidden="true">⧉</span>
        <span>preview</span>
      </button>
      <button
        type="button"
        :class="{ selected: workspacePhase === 'animate' }"
        :disabled="!sliceResult"
        :title="sliceResult ? 'Play layer stack (Kiri-like)' : 'Slice first'"
        @click="onAnimateModeClick"
      >
        <span class="km-mode-ico" aria-hidden="true">▶</span>
        <span>animate</span>
      </button>
      <div class="km-mode-export-wrap">
        <button type="button" :class="{ selected: workspacePhase === 'export' }" @click="onExportModeClick">
          <span class="km-mode-ico" aria-hidden="true">⇩</span>
          <span>export</span>
        </button>
        <div class="km-export-menu" v-if="workspacePhase === 'export'">
          <button type="button" @click="onExportGcodeClick">Download G-code</button>
          <button type="button" @click="onSendToCarveraClick">{{ sendToCarveraLabel }}</button>
          <button type="button" @click="onSendToGridBotClick">{{ sendToGridBotLabel }}</button>
        </div>
      </div>
    </div>

    <div class="km-mid">
      <div class="km-panel-left">
        <FdmSettingsPanel
          :device="current.device"
          :process="current.process"
          :material="current.material"
          :proc="currentProcessDetail"
          @update:proc="(proc) => (currentProcessDetail = proc)"
          @changed="reload"
        />
      </div>

      <div class="km-mid-center">
        <div
          v-if="sliceResult && (workspacePhase === 'slice' || workspacePhase === 'preview' || workspacePhase === 'animate')"
          class="km-layer-bar"
        >
          <span>Layer</span>
          <input
            type="range"
            class="km-layer-range"
            :min="0"
            :max="Math.max(0, (sliceResult.preview.layers.length || 1) - 1)"
            step="1"
            v-model.number="activeLayerIndex"
          />
          <span v-if="sliceResult.preview.layers[activeLayerIndex]">
            z={{ sliceResult.preview.layers[activeLayerIndex]?.z.toFixed(2) }}
            <template v-if="workspacePhase === 'animate'">
              / {{ activeLayerIndex + 1 }}/{{ sliceResult.preview.layers.length }}
            </template>
          </span>
          <template v-if="workspacePhase === 'animate' || workspacePhase === 'preview'">
            <label class="km-layer-anim-speed" title="Kiri STACKS.setFraction — reveal within top layer">
              frac
              <input
                type="range"
                min="0"
                max="1000"
                step="1"
                :value="Math.round(animateLayerFraction * 1000)"
                @input="onAnimateFractionInput"
              />
            </label>
          </template>
          <template v-if="workspacePhase === 'animate'">
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
                ref="importFileInputRef"
                type="file"
                multiple
                accept=".stl,.obj,.3mf,.STL,.OBJ,.3MF"
                class="km-hidden-file"
                @change="onImportFileInputChange"
              />
              <button type="button" class="km-import-btn" @click="importFileInputRef?.click()">Import</button>
              <div class="km-paint-tools">
                <button
                  type="button"
                  class="km-import-btn"
                  :class="{ active: supportPaintMode === 'add' }"
                  title="Paint manual supports (sliceSupportType=manual)"
                  @click="toggleSupportPaintMode('add')"
                >
                  Paint support
                </button>
                <button
                  type="button"
                  class="km-import-btn"
                  :class="{ active: supportPaintMode === 'erase' }"
                  @click="toggleSupportPaintMode('erase')"
                >
                  Erase paint
                </button>
                <button type="button" class="km-import-btn" :disabled="!selectedModelId" @click="clearSelectedModelPaint">
                  Clear paint
                </button>
                <label v-if="supportPaintMode" class="km-paint-radius" title="Brush radius (mm)">
                  r
                  <input
                    type="range"
                    min="0.5"
                    max="8"
                    step="0.25"
                    v-model.number="supportPaintRadius"
                  />
                  <span>{{ supportPaintRadius.toFixed(2) }}</span>
                </label>
              </div>
              <p v-if="supportPaintMode" class="km-hint">
                Drag on model surface to {{ supportPaintMode === 'add' ? 'paint' : 'erase' }} supports
                (r={{ supportPaintRadius }}mm). Support mode → manual before slice.
              </p>
              <p v-if="models.length === 0" class="km-hint">
                {{ selectedJobId ? 'No models for this job — re-import by filename.' : 'No models imported.' }}
              </p>
              <div
                v-for="m in models"
                :key="m.id"
                class="km-object-row"
                :class="{ active: m.id === selectedModelId || selectedModelIds.has(m.id) }"
                @click="onObjectRowClick($event, m)"
              >
                <span class="name">{{ m.name }}</span>
                <label class="km-obj-ext" @click.stop title="Extruder / tool index (Kiri widget.anno.extruder)">
                  E
                  <select :value="m.extruder ?? 0" @change="onModelExtruderChange(m.id, $event)">
                    <option v-for="ei in extruderIndexOptions" :key="ei" :value="ei">{{ ei }}</option>
                  </select>
                </label>
                <button type="button" class="km-obj-del" @click.stop="removeModel(m.id)">×</button>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>

    <div v-if="showDiagnostics" class="km-diag-float">
      <div class="km-diag-float-card">
        <div class="km-diag-float-head">
          <span>diagnostics</span>
          <button type="button" class="km-diag-close" @click="showDiagnostics = false">×</button>
        </div>
        <div class="km-set-body km-diagnostics">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="Mode">FDM</el-descriptions-item>
            <el-descriptions-item label="Device">{{ current.device }}</el-descriptions-item>
            <el-descriptions-item label="Process">{{ current.process }}</el-descriptions-item>
            <el-descriptions-item label="Material">{{ current.material }}</el-descriptions-item>
            <el-descriptions-item v-if="sliceResult" label="Backend">
              {{ sliceResult.backend || 'mock' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="sliceResult?.inputMeta" label="Input mesh">
              {{ sliceResult.inputMeta.triangleCount }} tri · {{ sliceResult.inputMeta.vertexCount }} vtx · Z
              {{ sliceResult.inputMeta.zSpanMm.toFixed(2) }} mm
            </el-descriptions-item>
            <el-descriptions-item v-if="sliceResult?.legacyDebug" label="Legacy FDM">
              <span>runtime {{ sliceResult.legacyDebug.ready ? 'ready' : 'not ready' }}</span>
              <span style="margin-left: 8px"
                >fdm_slice：{{ sliceResult.legacyDebug.hasSliceImpl ? 'loaded' : 'missing' }}</span
              >
              <el-button size="small" text style="margin-left: 8px" @click="copyLiveLegacyDebugSummary"
                >Copy</el-button
              >
              <el-button size="small" text style="margin-left: 4px" @click="copyLegacyFdmComparisonBundle"
                >Bundle</el-button
              >
              <div v-if="sliceResult.legacyDebug.initErrorMessage" class="km-hint" style="margin-top: 4px">
                init：{{ sliceResult.legacyDebug.initErrorMessage }}
              </div>
              <div
                v-if="sliceResult.legacyDebug.legacyImportErrorMessage"
                class="km-hint"
                style="margin-top: 4px"
              >
                import：{{ sliceResult.legacyDebug.legacyImportErrorMessage }}
              </div>
            </el-descriptions-item>
            <el-descriptions-item v-if="sliceResult?.fallback" label="Fallback">
              {{ getSliceFallbackReasonLabel(sliceResult.fallback.reasonCode) }}
              <span v-if="sliceResult.fallback.warningCode" class="km-hint">
                [{{ sliceResult.fallback.warningCode }}]
              </span>
              - {{ sliceResult.fallback.message }}
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedJobId" label="Job">
              {{ jobs.find((j) => j.id === selectedJobId)?.name || '' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedJobSliceInputMeta" label="Job mesh">
              {{ selectedJobSliceInputMeta.triangleCount }} tri · {{ selectedJobSliceInputMeta.vertexCount }} vtx ·
              Z {{ selectedJobSliceInputMeta.zSpanMm.toFixed(2) }} mm
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedJobSliceLegacyDebug" label="Job Legacy">
              <span>runtime {{ selectedJobSliceLegacyDebug.ready ? 'ready' : 'not ready' }}</span>
              <span style="margin-left: 8px">
                fdm_slice：{{ selectedJobSliceLegacyDebug.hasSliceImpl ? 'loaded' : 'missing' }}
              </span>
              <el-button size="small" text style="margin-left: 8px" @click="copyJobLegacyDebugSummary"
                >Copy</el-button
              >
              <div
                v-if="selectedJobSliceLegacyDebug.initErrorMessage"
                class="km-hint"
                style="margin-top: 4px"
              >
                init：{{ selectedJobSliceLegacyDebug.initErrorMessage }}
              </div>
              <div
                v-if="selectedJobSliceLegacyDebug.legacyImportErrorMessage"
                class="km-hint"
                style="margin-top: 4px"
              >
                import：{{ selectedJobSliceLegacyDebug.legacyImportErrorMessage }}
              </div>
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedJobId" label="comparisonSourceFingerprint">
              <span style="font-family: monospace; font-size: 11px; word-break: break-all">
                {{ selectedJobLegacyComparisonSourceFingerprint }}
              </span>
              <el-button size="small" text style="margin-left: 8px" @click="copyLegacyFdmSourceFingerprint">
                Copy
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
                Copy
              </el-button>
            </el-descriptions-item>
          </el-descriptions>

          <div
            v-if="selectedJobTelemetryDigest.length || selectedJobSliceInputMeta || selectedJobSliceLegacyDebug"
            style="margin-top: 10px"
          >
            <el-collapse>
              <el-collapse-item title="Job telemetry digest" name="job-telemetry-digest">
                <div style="margin-bottom: 8px; display: flex; justify-content: flex-end">
                  <el-button size="small" @click="copyJobTelemetryDigest">Copy</el-button>
                </div>
                <div
                  v-for="event in selectedJobTelemetryDigest"
                  :key="`${event.ts}-${event.code}-${event.reasonCode}`"
                  style="font-size: 12px; margin-bottom: 8px"
                >
                  <div>
                    [{{ new Date(event.ts).toLocaleTimeString() }}]
                    <strong>{{ event.code }}</strong>
                    / {{ getSliceFallbackReasonLabel(event.reasonCode) }}
                  </div>
                  <div class="km-hint">{{ event.message }}</div>
                </div>
                <div
                  v-if="selectedJobSliceInputMeta && !selectedJobTelemetryDigest.length"
                  class="km-hint"
                  style="font-size: 12px"
                >
                  No digest; use Copy to export saved sliceInputMeta.
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div v-if="selectedJobDiagnosticsSnapshot" style="margin-top: 10px">
            <el-collapse>
              <el-collapse-item title="Job diagnostics snapshot" name="job-diagnostics-snapshot">
                <div style="margin-bottom: 8px; display: flex; justify-content: flex-end">
                  <el-button size="small" @click="copyJobDiagnosticsSnapshot">Copy</el-button>
                </div>
                <pre class="job-diagnostics-pre">{{ selectedJobDiagnosticsSnapshot }}</pre>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div v-if="sliceResult?.summary?.estimateMeta" style="margin-top: 10px">
            <el-collapse>
              <el-collapse-item title="Estimate meta" name="estimate-meta">
                <div style="margin-bottom: 8px; display: flex; justify-content: flex-end; gap: 8px">
                  <el-button size="small" @click="copyEstimateMetaCompactSummary">Summary</el-button>
                  <el-button size="small" @click="exportEstimateMetaJson">JSON</el-button>
                  <el-button size="small" @click="copyEstimateMetaJson">Copy JSON</el-button>
                </div>
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="perimeter">
                    {{ sliceResult.summary.estimateMeta.lengths.perimeter.toFixed(2) }} mm
                  </el-descriptions-item>
                  <el-descriptions-item label="infill">
                    {{ sliceResult.summary.estimateMeta.lengths.infill.toFixed(2) }} mm
                  </el-descriptions-item>
                  <el-descriptions-item label="support">
                    {{ sliceResult.summary.estimateMeta.lengths.support.toFixed(2) }} mm
                  </el-descriptions-item>
                  <el-descriptions-item label="travel(in/inter)">
                    {{ sliceResult.summary.estimateMeta.lengths.travelInLayer.toFixed(2) }} /
                    {{ sliceResult.summary.estimateMeta.lengths.travelInterLayer.toFixed(2) }} mm
                  </el-descriptions-item>
                  <el-descriptions-item label="retract">
                    count={{ sliceResult.summary.estimateMeta.retract.estimatedCount }}
                    (trigger={{ sliceResult.summary.estimateMeta.retract.triggerDistance.toFixed(2) }}mm)
                  </el-descriptions-item>
                  <el-descriptions-item label="timeSec">
                    print={{ sliceResult.summary.estimateMeta.timeSec.print.toFixed(2) }}, travel={{
                      sliceResult.summary.estimateMeta.timeSec.travel.toFixed(2)
                    }}, retract={{ sliceResult.summary.estimateMeta.timeSec.retract.toFixed(2) }}, floor={{
                      sliceResult.summary.estimateMeta.timeSec.floor.toFixed(2)
                    }}, final={{ sliceResult.summary.estimateMeta.timeSec.final.toFixed(2) }}
                  </el-descriptions-item>
                </el-descriptions>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div v-if="sliceTelemetryTimeline.length" style="margin-top: 10px">
            <el-collapse>
              <el-collapse-item title="Slice telemetry" name="slice-telemetry">
                <div style="margin-bottom: 8px; display: flex; justify-content: flex-end">
                  <el-button size="small" @click="copyCurrentTimelineDiagnostics">Copy</el-button>
                </div>
                <div
                  v-for="event in sliceTelemetryTimeline"
                  :key="`${event.ts}-${event.code}-${event.reasonCode}`"
                  style="font-size: 12px; margin-bottom: 8px"
                >
                  <div>
                    [{{ new Date(event.ts).toLocaleTimeString() }}]
                    <strong>{{ event.code }}</strong>
                    / {{ event.reasonCode }}
                  </div>
                  <div class="km-hint">{{ event.message }}</div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>

          <div class="km-diag-actions">
            <el-button size="small" @click="go('/config/fdm')">Config</el-button>
            <el-button size="small" @click="go('/devices/fdm')">Devices</el-button>
            <el-button size="small" @click="go('/process/fdm')">Process</el-button>
            <el-button size="small" @click="go('/material/fdm')">Material</el-button>
            <el-button size="small" @click="go('/jobs/fdm')">Jobs</el-button>
          </div>

          <el-divider />

          <div class="km-set-subheader">
            Process snapshot
            <span v-if="currentJob && processChangedFromJob" class="km-hint">(changed vs Job)</span>
          </div>
          <el-empty v-if="!currentProcessDetail" description="No process" :image-size="48" />
          <el-descriptions v-else :column="1" border size="small">
            <el-descriptions-item label="Layer height">
              {{ currentProcessDetail.sliceHeight }} mm
              <span class="km-hint" style="margin-left: 6px"
                >first {{ currentProcessDetail.firstSliceHeight }} mm</span
              >
            </el-descriptions-item>
            <el-descriptions-item label="Shell/Top/Bottom">
              {{ currentProcessDetail.sliceShells }} / {{ currentProcessDetail.sliceTopLayers }} /
              {{ currentProcessDetail.sliceBottomLayers }}
            </el-descriptions-item>
            <el-descriptions-item label="Line width">
              {{ currentProcessDetail.sliceLineWidth }} mm
            </el-descriptions-item>
            <el-descriptions-item label="Fill">
              {{ currentProcessDetail.sliceFillType }}
              <span class="km-hint" style="margin-left: 6px"
                >density {{ currentProcessDetail.sliceFillSparse }}</span
              >
            </el-descriptions-item>
            <el-descriptions-item label="Support">
              {{ currentProcessDetail.sliceSupportEnable ? 'on' : 'off' }}
            </el-descriptions-item>
            <el-descriptions-item label="Retract">
              {{ currentProcessDetail.outputRetractDist }} mm @ {{ currentProcessDetail.outputRetractSpeed }}
            </el-descriptions-item>
            <el-descriptions-item label="Speeds">
              print {{ currentProcessDetail.outputFeedrate }} / seek {{ currentProcessDetail.outputSeekrate }} /
              first {{ currentProcessDetail.firstLayerRate }}
            </el-descriptions-item>
          </el-descriptions>

          <el-divider />

          <div class="km-set-subheader">
            Model info
            <span v-if="selectedModelIds.size > 1" class="km-hint">({{ selectedModelIds.size }} selected)</span>
          </div>
          <el-empty v-if="!modelInfo" description="No selection" :image-size="48" />
          <el-descriptions v-else :column="1" border size="small">
            <el-descriptions-item label="File">{{ modelInfo.name }}</el-descriptions-item>
            <el-descriptions-item label="Format">{{ modelInfo.ext.toUpperCase() }}</el-descriptions-item>
            <el-descriptions-item label="Size">
              {{ modelInfo.size.x }} × {{ modelInfo.size.y }} × {{ modelInfo.size.z }}
            </el-descriptions-item>
            <el-descriptions-item label="Min">
              ({{ modelInfo.min.x }}, {{ modelInfo.min.y }}, {{ modelInfo.min.z }})
            </el-descriptions-item>
            <el-descriptions-item label="Max">
              ({{ modelInfo.max.x }}, {{ modelInfo.max.y }}, {{ modelInfo.max.z }})
            </el-descriptions-item>
            <el-descriptions-item label="Volume">{{ modelInfo.volume }}</el-descriptions-item>
          </el-descriptions>

          <el-divider />

          <el-button size="small" @click="reload" plain>Reload config</el-button>

          <el-divider />

          <div class="km-set-subheader">Slice backend</div>
          <el-radio-group v-model="sliceBackendKind" size="small">
            <el-radio-button value="mock">Mock</el-radio-button>
            <el-radio-button value="kiri">Kiri</el-radio-button>
          </el-radio-group>
          <div style="margin-top: 8px">
            <el-checkbox v-model="includeTelemetryInGcode">
              Include diagnostics in exported G-code
            </el-checkbox>
          </div>
          <p class="km-hint" style="margin-top: 6px">{{ sliceRuntimeHint }}</p>
          <el-button size="small" style="margin-top: 6px" @click="onKiriPocClick">Kiri PoC</el-button>

          <el-divider />

          <div class="km-set-subheader">FDM Jobs</div>
          <div style="padding: 0 0 8px">
            <el-button
              v-if="selectedJobId"
              type="primary"
              size="small"
              plain
              @click="onUpdateJobClick"
            >
              Update current Job
            </el-button>
          </div>
          <el-empty v-if="jobs.length === 0" description="No jobs" :image-size="48" />
          <el-table
            v-else
            :data="jobs"
            size="small"
            border
            height="140"
            @row-click="onJobRowClick"
            :row-class-name="({ row }: { row: FdmJobRecord }) => (row.id === selectedJobId ? 'is-selected' : '')"
          >
            <el-table-column prop="name" label="Name" min-width="120" />
            <el-table-column prop="createdAt" label="Created" min-width="110">
              <template #default="scope">
                {{ new Date(scope.row.createdAt).toLocaleString() }}
              </template>
            </el-table-column>
          </el-table>

          <el-divider />

          <div class="km-set-subheader">Transform</div>
          <el-empty v-if="!activeTransform" description="Select a model" :image-size="48" />
          <div v-else style="padding: 4px 0 0">
            <el-form label-width="52px" size="small">
              <el-form-item label="Pos">
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
              <el-form-item label="Scale">
                <el-input-number
                  v-model="activeTransform.scale.x"
                  :step="0.1"
                  :min="0.01"
                  controls-position="right"
                  @change="applyActiveTransform"
                />
              </el-form-item>
              <el-form-item label="Rot Z">
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
      </div>
    </div>

    <div v-if="isSlicing" class="km-progress">
      <div class="km-progress-card">Slicing…</div>
    </div>
  </div>
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
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { loadPartMeshFromFile } from '@/core/mesh/loadPartMesh'
import {
  computeAabbInSpace,
  exportMeshesVerticesInSpace,
  seatObjectOnBedZ,
} from '@/core/mesh/fdmMeshOrient'
import { trimLayerPathsByFraction } from '@/core/fdm/fdmAnimateLayerFraction'
import {
  appendPaintIfSpaced,
  clonePaintPoints,
  erasePaintNear,
  syncPaintOverlayGroup,
} from '@/core/fdm/fdmSupportPaint'
import { getStockFdmDevice, resolveStockFdmDeviceId } from '@/core/slicer/stock/fdm/stockFdmDevices'
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
import FdmSettingsPanel from '@/components/fdm/FdmSettingsPanel.vue'
import { FDM_WORKSPACE_EVENT } from '@/layouts/workspaceEvents'

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
const workspacePhase = ref<'arrange' | 'slice' | 'preview' | 'animate' | 'export'>('arrange')
const showDiagnostics = ref(false)
const importFileInputRef = ref<HTMLInputElement | null>(null)
const animatePlaying = ref(false)
const animateSpeed = ref(8) // layers per second (approx)
/** 0..1 within top layer — Kiri STACKS.setFraction */
const animateLayerFraction = ref(1)
let animateTimer: ReturnType<typeof setInterval> | null = null
const supportPaintMode = ref<'add' | 'erase' | null>(null)
const supportPaintRadius = ref(2.5)
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
  /** Multi-extruder tool index (Kiri widget.anno.extruder). */
  extruder?: number
  /** Manual support paint (Kiri widget.anno.paint). */
  paint?: Array<{ point: { x: number; y: number; z: number }; radius: number }>
}

const models = ref<ModelItem[]>([])
const selectedModelId = ref<string | null>(null)

const extruderIndexOptions = computed(() => {
  const stock = getStockFdmDevice(resolveStockFdmDeviceId(current.device || ''))
  const n = Math.max(1, stock?.extruders?.length ?? 1)
  // Always offer at least 0..3 for dual/multi experiments even if stock is single.
  const max = Math.max(n, 4) - 1
  return Array.from({ length: max + 1 }, (_, i) => i)
})

function onModelExtruderChange(id: string, ev: Event) {
  const el = ev.target as HTMLSelectElement
  const v = Math.max(0, Math.floor(Number(el.value) || 0))
  const m = models.value.find((x) => x.id === id)
  if (m) m.extruder = v
}

function toggleSupportPaintMode(mode: 'add' | 'erase') {
  supportPaintMode.value = supportPaintMode.value === mode ? null : mode
  if (supportPaintMode.value && currentProcessDetail.value) {
    currentProcessDetail.value = {
      ...currentProcessDetail.value,
      sliceSupportType: 'manual',
      sliceSupportEnable: true,
    }
  }
}

function clearSelectedModelPaint() {
  const id = selectedModelId.value
  if (!id) return
  const m = models.value.find((x) => x.id === id)
  if (m) m.paint = []
  refreshPaintOverlay()
  ElMessage.success('Cleared support paint')
}

function applySupportPaintAt(modelId: string, local: { x: number; y: number; z: number }) {
  const m = models.value.find((x) => x.id === modelId)
  if (!m) return
  const r = supportPaintRadius.value
  if (supportPaintMode.value === 'erase') {
    m.paint = erasePaintNear(clonePaintPoints(m.paint), local, r)
    refreshPaintOverlay()
    return
  }
  const list = clonePaintPoints(m.paint)
  if (!appendPaintIfSpaced(list, local, r)) return
  m.paint = list
  selectedModelId.value = modelId
  refreshPaintOverlay()
}
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
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: any = null
let displayRoot: THREE.Group | null = null
let meshGroup: THREE.Group | null = null
let sliceOverlayGroup: THREE.Group | null = null
let paintOverlayGroup: THREE.Group | null = null
let paintDragging = false
let paintDragModelId: string | null = null

function refreshPaintOverlay() {
  if (!paintOverlayGroup) return
  syncPaintOverlayGroup(paintOverlayGroup, models.value)
}
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
  if (!displayRoot) return new Float32Array()
  return exportMeshesVerticesInSpace(objectByModelId.values(), displayRoot)
}

/** Per-model platform-space meshes for multi-widget / multi-extruder slice. */
function exportSceneModelMeshes(): import('@/core/slicer/sliceModelMeshes').SliceModelMesh[] {
  if (!displayRoot) return []
  const out: import('@/core/slicer/sliceModelMeshes').SliceModelMesh[] = []
  for (const m of models.value) {
    const obj = objectByModelId.get(m.id)
    if (!obj) continue
    const vertices = exportMeshesVerticesInSpace([obj], displayRoot)
    if (!vertices.length) continue
    out.push({
      modelId: m.id,
      vertices,
      extruder: Number.isFinite(m.extruder) ? Math.max(0, Math.floor(Number(m.extruder))) : 0,
      paint: clonePaintPoints(m.paint),
    })
  }
  return out
}

function initThree() {
  const canvas = canvasRef.value
  if (!canvas) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
  camera.position.set(180, 140, 180)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambient)

  const dir = new THREE.DirectionalLight(0xffffff, 0.6)
  dir.position.set(200, 400, 200)
  scene.add(dir)

  displayRoot = new THREE.Group()
  displayRoot.rotation.x = -Math.PI / 2 // Kiri WORLD: Z-up geometry stands on Three Y-up bed
  meshGroup = new THREE.Group()
  displayRoot.add(meshGroup)
  sliceOverlayGroup = new THREE.Group()
  displayRoot.add(sliceOverlayGroup)
  paintOverlayGroup = new THREE.Group()
  paintOverlayGroup.name = 'fdm-paint-overlay'
  displayRoot.add(paintOverlayGroup)
  scene.add(displayRoot)

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

    if (supportPaintMode.value && displayRoot) {
      let target: THREE.Object3D | null = firstHit.object
      while (target && !modelIdByObject.has(target) && target.parent) {
        target = target.parent
      }
      const id = (target && modelIdByObject.get(target)) || selectedModelId.value
      if (id) {
        const local = displayRoot.worldToLocal(firstHit.point.clone())
        applySupportPaintAt(id, { x: local.x, y: local.y, z: local.z })
        paintDragging = true
        paintDragModelId = id
        if (controls) controls.enabled = false
        try {
          renderer.domElement.setPointerCapture(ev.pointerId)
        } catch {
          /* ignore */
        }
        return
      }
    }

    const obj = firstHit.object
    toggleSelection(obj, ev)
  }

  const paintAtClient = (clientX: number, clientY: number) => {
    if (!paintDragging || !paintDragModelId || !renderer || !camera || !meshGroup || !displayRoot) return
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(meshGroup.children, true)
    const hit = hits[0]
    if (!hit) return
    const local = displayRoot.worldToLocal(hit.point.clone())
    applySupportPaintAt(paintDragModelId, { x: local.x, y: local.y, z: local.z })
  }

  const onPointerMove = (ev: PointerEvent) => {
    if (!paintDragging) return
    paintAtClient(ev.clientX, ev.clientY)
  }

  const onPointerUp = (ev: PointerEvent) => {
    if (!paintDragging) return
    paintDragging = false
    paintDragModelId = null
    if (controls) controls.enabled = true
    try {
      renderer?.domElement.releasePointerCapture(ev.pointerId)
    } catch {
      /* ignore */
    }
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
  renderer.domElement.addEventListener('pointermove', onPointerMove)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  renderer.domElement.addEventListener('pointercancel', onPointerUp)

  animate()

  // 返回销毁函数
  return () => {
    window.removeEventListener('resize', resize)
    renderer?.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer?.domElement.removeEventListener('pointermove', onPointerMove)
    renderer?.domElement.removeEventListener('pointerup', onPointerUp)
    renderer?.domElement.removeEventListener('pointercancel', onPointerUp)
    cancelAnimationFrame(raf)
    controls?.dispose()
    renderer?.dispose()
    controls = null
    renderer = null
    scene = null
    camera = null
    if (sliceOverlayGroup) {
      while (sliceOverlayGroup.children.length) {
        const c = sliceOverlayGroup.children.pop()!
        const line = c as THREE.Line
        line.geometry?.dispose?.()
        const mat = line.material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose?.()
      }
    }
    if (paintOverlayGroup) {
      syncPaintOverlayGroup(paintOverlayGroup, [])
    }
    paintOverlayGroup = null
    sliceOverlayGroup = null
    displayRoot = null
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

async function importRawFiles(files: File[]) {
  modelInfo.value = null
  clearSliceOverlay()

  for (const raw of files) {
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
      extruder: 0,
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

async function onFilesSelected(_file: UploadFile, fileList: UploadUserFile[]) {
  const files = fileList.map((uf) => uf.raw).filter((f): f is File => !!f)
  await importRawFiles(files)
}

function onImportFileInputChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  if (!files.length) return
  void importRawFiles(files)
}

function onLayerRangeInput(ev: Event) {
  activeLayerIndex.value = Number((ev.target as HTMLInputElement).value)
}

async function onObjectRowClick(ev: MouseEvent, row: { id: string }) {
  await onRowClick(row, null, ev)
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
  clearSliceOverlay()
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
  const box = displayRoot
    ? computeAabbInSpace(obj, displayRoot)
    : new THREE.Box3().setFromObject(obj)
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
  const mat = new THREE.MeshStandardMaterial({ color: defaultColor, metalness: 0.1, roughness: 0.8 })

  if (lower.endsWith('.stl') || lower.endsWith('.obj')) {
    if (!item.file) {
      ElMessage.warning(FDM_ACTION_WARNING.modelNeedsReimportFromJob)
      return
    }
    // Keep file/Kiri Z-up geometry; displayRoot rotates for Three Y-up view.
    const part = await loadPartMeshFromFile(item.file)
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(part.vertices.slice(), 3))
    geom.computeVertexNormals()
    geom.computeBoundingBox()
    const bb = geom.boundingBox!
    const mesh = new THREE.Mesh(geom, mat)
    // Seat in geometry/platform space before parenting under rotated displayRoot
    mesh.position.set(
      -((bb.min.x + bb.max.x) * 0.5),
      -((bb.min.y + bb.max.y) * 0.5),
      -bb.min.z,
    )
    meshGroup.add(mesh)
    loadedObj = mesh

    const size = new THREE.Vector3()
    bb.getSize(size)
    maxDim = Math.max(size.x, size.y, size.z)
  } else if (lower.endsWith('.3mf')) {
    if (!item.file) {
      ElMessage.warning(FDM_ACTION_WARNING.modelNeedsReimportFromJob)
      return
    }
    const buf = await item.file.arrayBuffer()
    const loader = new ThreeMFLoader()
    const obj = loader.parse(buf)
    obj.traverse((c: any) => {
      if ((c as any).isMesh) {
        const m = c as THREE.Mesh
        if (!Array.isArray(m.material) && !m.material) {
          m.material = mat.clone()
        }
      }
    })
    // Seat while still unparented (identity); then add under displayRoot
    const box = new THREE.Box3().setFromObject(obj)
    const size = new THREE.Vector3()
    box.getSize(size)
    maxDim = Math.max(size.x, size.y, size.z)
    seatObjectOnBedZ(obj)
    meshGroup.add(obj)
    loadedObj = obj
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
    controls?.target.set(0, maxDim * 0.35, 0)
    controls?.update()

    updateModelInfo(item.id, item.name, loadedObj)
  }
}

async function reloadJobs() {
  await fdmStore.loadJobs()
}

onMounted(async () => {
  window.addEventListener(FDM_WORKSPACE_EVENT, onFdmWorkspaceEvent as EventListener)
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
        extruder: Number.isFinite(m.extruder) ? Math.max(0, Math.floor(Number(m.extruder))) : 0,
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

function clearSliceOverlay() {
  if (!sliceOverlayGroup) return
  while (sliceOverlayGroup.children.length) {
    const c = sliceOverlayGroup.children.pop()!
    const line = c as THREE.Line
    line.geometry?.dispose?.()
    const mat = line.material as THREE.Material | THREE.Material[]
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose?.()
  }
}

function pathColor(type: string): number {
  switch (type) {
    case 'perimeter':
      return 0x111111
    case 'infill':
      return 0x409eff
    case 'support':
      return 0xe6a23c
    case 'travel':
      return 0x909399
    default:
      return 0x333333
  }
}

function updateSliceOverlay() {
  clearSliceOverlay()
  if (!sliceOverlayGroup || !displayRoot) return
  const result = sliceResult.value
  if (!result) return
  if (
    workspacePhase.value !== 'slice' &&
    workspacePhase.value !== 'preview' &&
    workspacePhase.value !== 'animate'
  ) {
    return
  }

  const layers = result.preview.layers
  const upTo =
    workspacePhase.value === 'animate'
      ? Math.min(activeLayerIndex.value, layers.length - 1)
      : activeLayerIndex.value
  const from = workspacePhase.value === 'animate' ? 0 : upTo
  if (upTo < 0 || !layers[upTo]) return

  for (let li = from; li <= upTo; li++) {
    const layer = layers[li]
    if (!layer) continue
    const z = layer.z
    const isTop = li === upTo
    const useFraction =
      isTop &&
      (workspacePhase.value === 'animate' || workspacePhase.value === 'preview') &&
      animateLayerFraction.value < 1
    const paths = useFraction
      ? trimLayerPathsByFraction(layer.paths, animateLayerFraction.value)
      : layer.paths.filter((p) => p.type !== 'travel' && p.points.length >= 2)
    for (const path of paths) {
      if (path.points.length < 2) continue
      if (path.type === 'travel') continue
      const positions: number[] = []
      for (const [x, y] of path.points) {
        positions.push(x, y, z) // platform Z-up
      }
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      const mat = new THREE.LineBasicMaterial({
        color: pathColor(path.type),
        depthTest: true,
        transparent: true,
        opacity: isTop ? (path.type === 'infill' ? 0.85 : 1) : 0.35,
      })
      const line = new THREE.Line(geom, mat)
      sliceOverlayGroup.add(line)
    }
  }

  // Ghost solid meshes while showing slices
  for (const obj of objectByModelId.values()) {
    obj.traverse((c) => {
      const m = c as THREE.Mesh
      if (!(m as any).isMesh) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) {
        if (!mat || !(mat as THREE.Material).isMaterial) continue
        const sm = mat as THREE.MeshStandardMaterial
        sm.transparent = true
        sm.opacity = 0.25
        sm.depthWrite = false
        sm.needsUpdate = true
      }
    })
  }
}

function restoreMeshMaterialsSolid() {
  for (const obj of objectByModelId.values()) {
    obj.traverse((c) => {
      const m = c as THREE.Mesh
      if (!(m as any).isMesh) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) {
        if (!mat || !(mat as THREE.Material).isMaterial) continue
        const sm = mat as THREE.MeshStandardMaterial
        // Don't fight selection highlight — only restore if not selected styling
        sm.transparent = false
        sm.opacity = 1
        sm.depthWrite = true
        sm.needsUpdate = true
      }
    })
  }
  syncSelectionHighlight()
}

watch(
  () => [sliceResult.value, activeLayerIndex.value, animateLayerFraction.value],
  () => {
    updateSliceOverlay()
  },
)

watch(workspacePhase, (phase) => {
  if (phase === 'slice' || phase === 'preview' || phase === 'animate') updateSliceOverlay()
  else {
    stopAnimatePlayback()
    clearSliceOverlay()
    restoreMeshMaterialsSolid()
  }
})

watch(animateSpeed, () => {
  if (animatePlaying.value) startAnimatePlayback()
})

function stopAnimatePlayback() {
  animatePlaying.value = false
  if (animateTimer != null) {
    clearInterval(animateTimer)
    animateTimer = null
  }
}

function startAnimatePlayback() {
  stopAnimatePlayback()
  const layers = sliceResult.value?.preview.layers
  if (!layers?.length) return
  animatePlaying.value = true
  // Advance within-layer fraction first (Kiri setFraction), then step layers.
  const ms = Math.max(40, Math.round(1000 / Math.max(1, animateSpeed.value * 4)))
  animateTimer = setInterval(() => {
    const max = Math.max(0, layers.length - 1)
    const step = Math.min(0.12, 0.04 + animateSpeed.value * 0.008)
    if (animateLayerFraction.value < 1 - 1e-6) {
      animateLayerFraction.value = Math.min(1, animateLayerFraction.value + step)
      return
    }
    animateLayerFraction.value = 0
    if (activeLayerIndex.value >= max) {
      activeLayerIndex.value = 0
    } else {
      activeLayerIndex.value += 1
    }
  }, ms)
}

function toggleAnimatePlayback() {
  if (animatePlaying.value) stopAnimatePlayback()
  else startAnimatePlayback()
}

function onAnimateFractionInput(ev: Event) {
  const v = Number((ev.target as HTMLInputElement).value)
  animateLayerFraction.value = Math.max(0, Math.min(1, (Number.isFinite(v) ? v : 1000) / 1000))
}

function onAnimateModeClick() {
  if (!sliceResult.value) {
    ElMessage.info('Slice first to animate')
    return
  }
  workspacePhase.value = 'animate'
  activeLayerIndex.value = 0
  animateLayerFraction.value = 0
  startAnimatePlayback()
}

async function buildSliceJobPayload(): Promise<SliceJobPayload | null> {
  const sceneModels: SceneModelPayload[] = []

  for (const m of models.value) {
    const obj = objectByModelId.get(m.id)
    const t = transforms.get(m.id)
    if (!obj || !t) continue
    if (!displayRoot) continue

    const box = computeAabbInSpace(obj, displayRoot)
    const size = new THREE.Vector3()
    box.getSize(size)

    sceneModels.push({
      id: m.id,
      name: m.name,
      ext: m.name.toLowerCase().split('.').pop() || '',
      transform: t,
      extruder: Number.isFinite(m.extruder) ? Math.max(0, Math.floor(Number(m.extruder))) : 0,
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

function onArrangeClick() {
  stopAnimatePlayback()
  workspacePhase.value = 'arrange'
  clearSliceOverlay()
}

async function onSliceModeClick() {
  stopAnimatePlayback()
  workspacePhase.value = 'slice'
  await onSliceClick()
}

function onPreviewModeClick() {
  stopAnimatePlayback()
  workspacePhase.value = 'preview'
  onPreviewClick()
}

function onExportModeClick() {
  stopAnimatePlayback()
  workspacePhase.value = 'export'
}

function resetCameraHome() {
  if (!camera) return
  camera.position.set(180, 140, 180)
  controls?.target.set(0, 0, 0)
  controls?.update()
}

function setCameraTopView() {
  if (!camera) return
  camera.position.set(0, 320, 0.001)
  controls?.target.set(0, 0, 0)
  controls?.update()
}

function layFlatSelectedModel() {
  const id = selectedModelId.value
  if (!id) {
    ElMessage.info('Select a model to lay flat')
    return
  }
  const obj = objectByModelId.get(id)
  const t = transforms.get(id)
  if (!obj || !t) {
    ElMessage.info('Lay flat: model not loaded')
    return
  }
  if (!displayRoot) return

  // Reset rotation, then re-seat in platform (Z-up) space
  obj.rotation.set(0, 0, 0)
  t.rotation.x = 0
  t.rotation.y = 0
  t.rotation.z = 0
  const box = computeAabbInSpace(obj, displayRoot)
  obj.position.x -= (box.min.x + box.max.x) * 0.5
  obj.position.y -= (box.min.y + box.max.y) * 0.5
  obj.position.z -= box.min.z
  t.position.x = obj.position.x
  t.position.y = obj.position.y
  t.position.z = obj.position.z
  activeTransform.value = t
  updateModelInfo(id, models.value.find((m) => m.id === id)?.name || '', obj)
  ElMessage.success('Model laid flat (rotation reset)')
}

async function duplicateSelectedModel() {
  const id = selectedModelId.value
  const item = models.value.find((m) => m.id === id)
  if (!item) {
    ElMessage.info('Select a model to duplicate')
    return
  }
  if (!item.file) {
    ElMessage.info('Duplicate requires an imported file (re-import Job placeholders first)')
    return
  }
  const copyName = item.name.replace(/(\.[^.]+)$/, '-copy$1')
  const idNew = `${copyName}-${item.file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  models.value.push({
    id: idNew,
    name: copyName,
    file: item.file,
    needsFile: false,
    extruder: item.extruder ?? 0,
  })
  selectedModelId.value = idNew
  selectedModelIds.value.clear()
  selectedModelIds.value.add(idNew)
  await loadSelectedModel()
  const obj = objectByModelId.get(idNew)
  if (obj) {
    obj.position.x += 20
    const t = ensureTransform(idNew, obj)
    t.position.x = obj.position.x
    activeTransform.value = t
  }
  syncSelectionHighlight()
  ElMessage.success('Model duplicated')
}

function setRenderMode(mode: 'solid' | 'wire' | 'ghost') {
  if (!meshGroup) return
  meshGroup.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      if (!mat || !(mat as THREE.Material).isMaterial) continue
      const m = mat as THREE.MeshStandardMaterial
      if (mode === 'wire') {
        m.wireframe = true
        m.transparent = false
        m.opacity = 1
        m.depthWrite = true
      } else if (mode === 'ghost') {
        m.wireframe = false
        m.transparent = true
        m.opacity = 0.35
        m.depthWrite = false
      } else {
        m.wireframe = false
        m.transparent = false
        m.opacity = 1
        m.depthWrite = true
      }
      m.needsUpdate = true
    }
  })
}

function onFdmWorkspaceEvent(ev: Event) {
  const detail = (ev as CustomEvent).detail as { action?: string; files?: File[] } | undefined
  const action = detail?.action
  if (!action) return
  switch (action) {
    case 'import-files':
      if (detail?.files?.length) void importRawFiles(detail.files)
      break
    case 'export':
      workspacePhase.value = 'export'
      break
    case 'lay-flat':
      layFlatSelectedModel()
      break
    case 'duplicate':
      void duplicateSelectedModel()
      break
    case 'delete':
      if (selectedModelId.value) removeModel(selectedModelId.value)
      else ElMessage.info('Select a model to delete')
      break
    case 'home':
      resetCameraHome()
      break
    case 'top':
      setCameraTopView()
      break
    case 'diagnostics':
      showDiagnostics.value = !showDiagnostics.value
      break
    case 'render-solid':
      setRenderMode('solid')
      break
    case 'render-wire':
      setRenderMode('wire')
      break
    case 'render-ghost':
      setRenderMode('ghost')
      break
    default:
      break
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

    const modelMeshes = exportSceneModelMeshes()
    if (!modelMeshes.length) {
      ElMessage.warning(FDM_ACTION_WARNING.noSliceableGeometry)
      return
    }

    const backend = getSliceBackend(fdmStore.backendKind)
    const result = await backend.slice(job, modelMeshes, processConfig ?? ({} as FdmProcess), {
      onTelemetry: (event) => {
        fdmStore.pushSliceTelemetryEvent(event)
      },
    })
    fdmStore.setSliceResult(result)
    activeLayerIndex.value = 0
    workspacePhase.value = 'slice'
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
  workspacePhase.value = 'preview'
  updateSliceOverlay()
}

function onExportGcodeClick() {
  workspacePhase.value = 'export'
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
  stopAnimatePlayback()
  window.removeEventListener(FDM_WORKSPACE_EVENT, onFdmWorkspaceEvent as EventListener)
  uninstallSlicerDebugApi(window)
  disposeThree?.()
  disposeThree = undefined
})
</script>

<style scoped>
.viewport-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.km-hidden-file {
  display: none;
}

.km-import-btn {
  width: 100%;
  margin-bottom: 6px;
  padding: 4px 8px;
  border: 1px solid var(--km-border, #ccc);
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
  font: inherit;
}

.km-import-btn:hover {
  background: #f0f0f0;
}

.km-import-btn.active {
  background: rgba(126, 153, 183, 0.45);
  border-color: #7e99b7;
}

.km-paint-tools {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.km-paint-radius {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.km-paint-radius input[type='range'] {
  flex: 1;
  min-width: 80px;
}

.km-obj-del {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #888;
  padding: 0 4px;
}

.km-obj-ext {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
}

.km-obj-ext select {
  max-width: 44px;
  font: inherit;
  font-size: 11px;
}

.km-obj-del:hover {
  color: #c00;
}

.km-layer-range {
  flex: 1;
}

.km-mode-export-wrap {
  position: relative;
  pointer-events: all;
}
.km-export-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 180px;
  margin-top: 2px;
  padding: 4px;
  background: #fff;
  border: 1px solid var(--km-border, #ccc);
  border-radius: 0 0 4px 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}
.km-export-menu > button {
  font: inherit;
  font-size: 12px;
  text-align: left;
  padding: 4px 8px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
}
.km-export-menu > button:hover {
  background: var(--km-blue-4, #dde4ea);
}

.km-diagnostics {
  font-size: 12px;
}

.km-diag-float {
  position: absolute;
  inset: 36px 12px 12px auto;
  width: min(440px, 42vw);
  z-index: 35;
  pointer-events: all;
}
.km-diag-float-card {
  max-height: calc(100vh - 56px);
  overflow: auto;
  background: rgba(245, 245, 245, 0.97);
  border: 1px solid var(--km-border, #ccc);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 0 0 8px;
}
.km-diag-float-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(126, 153, 183, 0.55);
  padding: 4px 8px;
  font-weight: 600;
  text-transform: capitalize;
}
.km-diag-close {
  border: 0;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  color: #444;
}

.km-diag-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.km-set-subheader {
  font-weight: 600;
  padding: 4px 0;
  font-size: 13px;
}

:deep(.el-table .is-selected) {
  background-color: #ecf5ff;
}
:deep(.el-table .is-selected td) {
  background-color: #ecf5ff !important;
}

.job-diagnostics-pre {
  margin: 0;
  max-height: 180px;
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
