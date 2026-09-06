<template>
  <el-container class="carvera-root">
    <!-- Left: job / file list -->
    <el-aside width="260px" class="carvera-aside">
      <div class="pane-title">作业 / G-code 文件</div>
      <div class="pane-body">
        <el-empty v-if="jobs.length === 0" description="尚未添加任何作业" />
        <el-table
          v-else
          :data="jobs"
          size="small"
          border
          height="260"
          highlight-current-row
          :current-row-key="selectedJobId || undefined"
          row-key="id"
          @row-click="onJobRowClick"
        >
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="createdAt" label="创建时间" min-width="140">
            <template #default="scope">
              {{ new Date(scope.row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>
        </el-table>
        <div class="pane-body" style="padding-top: 8px">
          <el-button type="primary" size="small" plain @click="onImportClick">导入 G-code</el-button>
          <el-button size="small" plain :disabled="jobs.length === 0" @click="onClearJobs">清空</el-button>
          <el-button size="small" plain :disabled="!selectedJobId" @click="onDeleteSelectedJob">删除</el-button>
          <el-button size="small" plain :disabled="!selectedJobId" @click="onRenameSelectedJob">重命名</el-button>
          <el-button size="small" plain :disabled="!selectedJobId" @click="onExportSelectedJob">导出</el-button>
          <el-button size="small" plain :disabled="!currentJobContent" @click="onCopyCurrentJobGcode">复制 G-code</el-button>
          <span class="hint" style="margin-left: 8px">（仅保存在当前浏览器）</span>
          <input
            ref="fileInputRef"
            type="file"
            accept=".gcode,.nc,.tap,.txt"
            style="display: none"
            @change="onFileChange"
          />
        </div>
      </div>
    </el-aside>

    <!-- Center: machine preview / workspace -->
    <el-container class="carvera-center">
      <el-main class="carvera-main">
        <GcodePreviewPanel
          kind="carvera"
          :job-gcode="currentJobContent"
          :tool-position="toolPosition"
          :stem-color="stemColor"
          title="机床预览 / Work Coordinate"
          :footnote="`WCS + ${carveraEnvelopeHint} 包络；carvera.obj + grip matcap 配色（同 carve-control）；G0/G1/G2/G3。缺资源时 npm run sync:grip-carvera-assets`"
          show-path-hint-in-overlay
        />
      </el-main>
    </el-container>

    <!-- Right: device state / controls -->
    <el-aside width="320px" class="carvera-aside-right">
      <div class="pane-title">设备状态</div>
      <div class="pane-body">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="连接状态">
            <el-tag :type="connected ? 'success' : 'info'">
              {{ connected ? '已连接' : '未连接' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="端点">
            <div style="display: flex; gap: 8px; align-items: center; width: 100%">
              <el-input
                v-model="endpointEditable"
                size="small"
                placeholder="ws://localhost:9999/carvera"
                style="flex: 1"
                @change="onEndpointChange"
              />
              <el-button size="small" plain @click="onResetBridgeEndpoint">默认</el-button>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="Bridge TCP">
            <el-tag
              v-if="bridge.tcpState === 'connected'"
              type="success"
              size="small"
            >已连接</el-tag>
            <el-tag
              v-else-if="bridge.tcpState === 'error'"
              type="danger"
              size="small"
            >错误</el-tag>
            <el-tag
              v-else-if="bridge.tcpState === 'closed'"
              type="info"
              size="small"
            >已关闭</el-tag>
            <el-tag
              v-else
              type="info"
              size="small"
            >未知</el-tag>
            <span v-if="bridge.lastMessage" class="hint" style="margin-left: 8px">
              {{ bridge.lastMessage }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="当前作业">
            <span>{{ currentJobName || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="FDM 元信息">
            <div v-if="fdmBridgeMeta">
              <div v-if="fdmBridgeMeta.mode || fdmBridgeMeta.job">
            <span v-if="fdmBridgeMeta.mode" style="margin-right: 8px">mode: {{ fdmBridgeMeta.mode }}</span>
            <span v-if="fdmBridgeMeta.job">job: {{ fdmBridgeMeta.job }}</span>
          </div>
              <div v-if="fdmBridgeMeta.layers !== undefined">
                layers: {{ fdmBridgeMeta.layers }} time: {{ fdmBridgeMeta.timeMinutes ?? '—' }} min
              </div>
              <div v-if="fdmBridgeMeta.filamentMm !== undefined">filament: {{ fdmBridgeMeta.filamentMm }} mm</div>
              <div v-if="fdmBridgeMeta.device || fdmBridgeMeta.process || fdmBridgeMeta.material">
                dev/proc/mat:
                {{ fdmBridgeMeta.device || '—' }} /
                {{ fdmBridgeMeta.process || '—' }} /
                {{ fdmBridgeMeta.material || '—' }}
              </div>
            </div>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="坐标 MPos (机床)">
            X: {{ machineState.x.toFixed(3) }}
            Y: {{ machineState.y.toFixed(3) }}
            Z: {{ machineState.z.toFixed(3) }}
            <template v-if="machineState.wa != null"> · A: {{ machineState.wa.toFixed(3) }}</template>
          </el-descriptions-item>
          <el-descriptions-item label="坐标 WPos (工件)">
            <span v-if="machineState.wx != null">
              X: {{ machineState.wx.toFixed(3) }}
              Y: {{ machineState.wy!.toFixed(3) }}
              Z: {{ machineState.wz!.toFixed(3) }}
            </span>
            <span v-else class="hint">—</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="machineState.feedCurrent != null" label="进给 F">
            {{ machineState.feedCurrent?.toFixed(0) }}
            <template v-if="machineState.feedTarget != null"> / {{ machineState.feedTarget.toFixed(0) }}</template>
            <template v-if="machineState.feedOverridePct != null">
              ({{ machineState.feedOverridePct }}%)
            </template>
          </el-descriptions-item>
          <el-descriptions-item v-if="machineState.laserCurrent != null" label="激光 L">
            {{ machineState.laserCurrent?.toFixed(0) }}
            <template v-if="machineState.laserTarget != null"> / {{ machineState.laserTarget.toFixed(0) }}</template>
            <template v-if="machineState.laserScale != null"> · scale {{ machineState.laserScale }}</template>
          </el-descriptions-item>
          <el-descriptions-item v-if="machineState.probeVoltage != null" label="探针 W">
            {{ machineState.probeVoltage?.toFixed(3) }} V
          </el-descriptions-item>
          <el-descriptions-item v-if="machineState.spinCurrent != null" label="主轴 S">
            {{ machineState.spinCurrent?.toFixed(0) }}
            <template v-if="machineState.spinTarget != null"> / {{ machineState.spinTarget.toFixed(0) }}</template>
            rpm
          </el-descriptions-item>
          <el-descriptions-item v-if="machineState.playLine != null" label="作业 P">
            行 {{ machineState.playLine }}
            <template v-if="machineState.playPercent != null"> · {{ machineState.playPercent.toFixed(1) }}%</template>
            <template v-if="machineState.playSeconds != null">
              · {{ Math.floor(machineState.playSeconds / 60) }}:{{ String(Math.floor(machineState.playSeconds % 60)).padStart(2, '0') }}
            </template>
          </el-descriptions-item>
          <el-descriptions-item v-if="machineState.setupState != null" label="准备 A">
            {{ machineState.setupState }}
          </el-descriptions-item>
          <el-descriptions-item v-if="machineState.haltCode != null" label="停机 H">
            {{ machineState.haltCode }}
          </el-descriptions-item>
          <el-descriptions-item label="机床状态">
            <span :style="machineState.state === 'ALARM' ? 'color:#f56c6c;font-weight:600' : ''">
              {{ machineState.state }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="主轴">
            {{ machineState.spindleOn ? `ON @ ${machineState.spindleRpm}rpm` : 'OFF' }}
          </el-descriptions-item>
          <el-descriptions-item label="四轴夹具预览">
            <el-switch
              v-model="fourthFixtureVisible"
              size="small"
              active-text="显示"
              inactive-text="隐藏"
            />
          </el-descriptions-item>
          <el-descriptions-item label="告警">
            <span v-if="lastAlarm" style="color: #f56c6c; font-weight: 600">
              {{ lastAlarm }}
              <template v-if="machineState.alarmCode != null"> ({{ machineState.alarmCode }})</template>
            </span>
            <span v-else>—</span>
            <el-button
              v-if="lastAlarm"
              size="small"
              plain
              style="margin-left: 8px"
              @click="onClearAlarm"
            >
              清除
            </el-button>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">连接 / 控制</div>
        <div class="actions">
          <el-button
            v-if="!connected"
            type="primary"
            size="small"
            @click="onConnect"
            :loading="connecting"
          >
            连接设备
          </el-button>
          <el-button v-else type="warning" size="small" @click="onDisconnect">断开</el-button>

          <el-button size="small" :disabled="!connected" @click="onReset">复位</el-button>
          <el-button size="small" :disabled="!connected" @click="onHome">回零</el-button>
          <el-button size="small" :disabled="!connected" @click="onFeedHold">急停/暂停</el-button>
          <el-button size="small" :disabled="!connected" @click="onCycleStart">继续</el-button>
          <el-button
            size="small"
            type="success"
            :disabled="!connected || !currentJobContent || store.sending"
            @click="onSendCurrentJob"
          >
            发送当前 G-code（逐行，占位）
          </el-button>
          <el-button
            size="small"
            plain
            :disabled="!connected || !store.sending || store.sendPaused"
            @click="onPauseSend"
          >
            暂停发送
          </el-button>
          <el-button
            size="small"
            plain
            :disabled="!connected || !store.sending || !store.sendPaused"
            @click="onResumeSend"
          >
            继续发送
          </el-button>
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="!connected || !store.sending"
            @click="onCancelSend"
          >
            停止发送
          </el-button>
          <JobSendProgress
            :sending="store.sending"
            :sent="store.sendSentLines"
            :total="store.sendTotalLines"
          />
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">调试发送（占位）</div>
        <div class="pane-body" style="padding-top: 4px">
          <div style="display: flex; gap: 8px; align-items: center">
            <el-input
              v-model="debugLine"
              size="small"
              placeholder="例如：? / $H / G0 X0 Y0"
              @keyup.enter="onSendDebugLine"
            />
            <el-select
              v-model="debugLine"
              size="small"
              style="width: 140px"
              placeholder="历史"
              clearable
              @change="onSelectDebugHistory"
            >
              <el-option v-for="h in debugHistory" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px">
            <el-button size="small" type="primary" plain :disabled="!canSendDebugLine" @click="onSendDebugLine">
              发送一行
            </el-button>
            <el-button
              v-for="macro in deviceMacros"
              :key="macro.id"
              size="small"
              plain
              :disabled="!connected"
              @click="onSendMacro(macro.line)"
            >
              {{ macro.label }}
            </el-button>
            <span class="hint">需要已连接且 WebSocket OPEN。</span>
          </div>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">消息日志（占位）</div>
        <div class="pane-body" style="padding-top: 4px; max-height: 240px; overflow: auto">
          <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center">
            <span class="hint">方向:</span>
            <el-select v-model="logDirFilter" size="small" style="width: 110px">
              <el-option label="全部" value="all" />
              <el-option label="入站(in)" value="in" />
              <el-option label="出站(out)" value="out" />
              <el-option label="信息(info)" value="info" />
            </el-select>
            <span class="hint">类型:</span>
            <el-select v-model="logKindFilter" size="small" style="width: 130px">
              <el-option label="全部" value="all" />
              <el-option label="状态(status)" value="status" />
              <el-option label="告警(alarm)" value="alarm" />
              <el-option label="其他(other)" value="other" />
            </el-select>
          </div>

          <div v-if="!filteredLogs.length" class="hint">当前暂无匹配的消息。</div>
          <ul v-else class="log-list">
            <li
              v-for="entry in filteredLogs"
              :key="entry.id"
              class="log-item"
              :class="{ 'log-alarm': entry.kind === 'alarm', 'log-status': entry.kind === 'status' }"
            >
              <span class="log-time">{{ new Date(entry.time).toLocaleTimeString() }}</span>
              <span v-if="entry.seq" class="log-seq">#{{ entry.seq }}</span>
              <span
                class="log-dir"
                :class="{
                  'log-in': entry.direction === 'in',
                  'log-out': entry.direction === 'out',
                  'log-info': entry.direction === 'info',
                }"
              >
                {{ entry.direction === 'in' ? '⟵' : entry.direction === 'out' ? '⟶' : '·' }}
              </span>
              <span class="log-text">{{ entry.text }}</span>
            </li>
          </ul>
          <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap">
            <el-button size="small" plain :disabled="!logs.length" @click="onClearLogs">清空日志</el-button>
            <el-button size="small" plain :disabled="!filteredLogs.length" @click="onExportLogsTxt">导出TXT</el-button>
            <el-button size="small" plain :disabled="!filteredLogs.length" @click="onExportLogsJson">导出JSON</el-button>
            <span class="hint">导出当前筛选结果。</span>
          </div>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">解析视图</div>
        <div class="pane-body" style="padding-top: 4px; max-height: 220px; overflow: auto">
          <pre class="debug-json">{{ debugSnapshot }}</pre>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">G-code 预览（占位）</div>
        <div class="pane-body" style="padding-top: 4px; max-height: 200px; overflow: auto">
          <pre class="gcode-preview">{{
            (currentJobContent || '')
              .split('\n')
              .slice(0, 200)
              .join('\n')
          }}</pre>
          <div v-if="!currentJobContent" class="hint">未选择作业或作业未包含内容。</div>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">手动操作（占位）</div>
        <div class="pane-body" style="padding-top: 4px">
          <div class="hint" style="margin-bottom: 8px">
            简单 JOG：相对模式 G91 / G0 / 再 G90（速度/限位保护由控制器负责）。
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px">
            <span class="hint">步长 (mm):</span>
            <el-select v-model="jogStep" size="small" style="width: 100px">
              <el-option :value="0.1" label="0.1" />
              <el-option :value="1" label="1" />
              <el-option :value="10" label="10" />
            </el-select>
            <span class="hint" style="margin-left: 12px">进给 (可选):</span>
            <el-input-number
              v-model="jogFeed"
              :min="0"
              :step="100"
              size="small"
              style="width: 140px"
              placeholder="默认 G0 速度"
            />
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-width: 220px">
            <span />
            <el-button size="small" :disabled="!connected" @click="onJog('Y+', jogStep)">Y+</el-button>
            <span />

            <el-button size="small" :disabled="!connected" @click="onJog('X-', jogStep)">X-</el-button>
            <span />
            <el-button size="small" :disabled="!connected" @click="onJog('X+', jogStep)">X+</el-button>

            <span />
            <el-button size="small" :disabled="!connected" @click="onJog('Y-', jogStep)">Y-</el-button>
            <span />

            <el-button size="small" :disabled="!connected" @click="onJog('Z+', jogStep)">Z+</el-button>
            <span />
            <el-button size="small" :disabled="!connected" @click="onJog('Z-', jogStep)">Z-</el-button>
          </div>
        </div>
      </div>
    </el-aside>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type LogDirFilter = 'all' | 'in' | 'out' | 'info'
type LogKindFilter = 'all' | 'status' | 'alarm' | 'other'

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCarveraStore } from '@/stores/useCarveraStore'
import type { CarveraJobRecord } from '@/api/jobs'
import { useExportActions } from '@/composables/useExportActions'
import { gcodeForClipboard } from '@/core/gcode/gcodeForClipboard'
import { DEVICE_GCODE_MACROS } from '@/core/devices/deviceGcodeMacros'
import { defaultDeviceBridgeEndpoint } from '@/core/devices/deviceEndpointReset'
import { useFileImportActions } from '@/composables/useFileImportActions'
import GcodePreviewPanel from '@/components/gcode/GcodePreviewPanel.vue'
import JobSendProgress from '@/components/devices/JobSendProgress.vue'
import {
  machinePositionLooksLive,
  useGcodeToolPositionWithMachineFallback,
} from '@/composables/useGcodeToolPositionWithMachineFallback'
import {
  MAKERA_CARVERA_MACHINE_ENVELOPE,
  formatMachineEnvelopeHint,
} from '@/core/devices/carveraMachineEnvelope'
import { setCarveraFourthFixtureVisible } from '@/core/devices/carveraMachinePreviewBridge'

const carveraEnvelopeHint = formatMachineEnvelopeHint(MAKERA_CARVERA_MACHINE_ENVELOPE)
const fourthFixtureVisible = ref(true)
watch(fourthFixtureVisible, (v) => setCarveraFourthFixtureVisible(v), { immediate: true })

const store = useCarveraStore()
const { copyText, exportText } = useExportActions()
const { importTextFromInput } = useFileImportActions()
store.loadFromLocal()

const debugSnapshot = computed(() => {
  return JSON.stringify(
    {
      machine: machineState.value,
      bridge: bridge.value,
      connected: connected.value,
      lastAlarm: lastAlarm.value,
    },
    null,
    2,
  )
})

const {
  jobs,
  selectedJobId,
  connected,
  connecting,
  machine: machineState,
  currentJobName,
  currentJobContent,
  currentJob,
  endpoint,
  logs,
  lastAlarm,
  bridge,
} = storeToRefs(store)

const endpointEditable = ref(endpoint.value)
watch(endpoint, (v) => {
  endpointEditable.value = v
})

const logDirFilter = ref<LogDirFilter>('all')
const logKindFilter = ref<LogKindFilter>('all')

const filteredLogs = computed(() => {
  return logs.value.filter((entry) => {
    if (logDirFilter.value !== 'all' && entry.direction !== logDirFilter.value) return false
    if (logKindFilter.value !== 'all' && entry.kind !== logKindFilter.value) return false
    return true
  })
})

type FdmBridgeMeta = {
  mode?: string
  job?: string
  layers?: number
  timeMinutes?: number
  filamentMm?: number
  device?: string
  process?: string
  material?: string
}

function parseFdmBridgeMeta(content: string): FdmBridgeMeta | null {
  if (!content) return null
  const head = content.split(/\r?\n/).slice(0, 40)
  const isBridge = head.some((l) => l.includes('from workspace (bridge)'))
  if (!isBridge) return null

  const meta: FdmBridgeMeta = {}
  for (const raw of head) {
    const line = raw.trim()
    if (!line.startsWith(';')) continue

    const m = line.match(/^;\s*([^=]+)=(.*)$/)
    if (!m) continue
    const key = m[1]?.trim()
    const val = m[2]?.trim()
    if (!key) continue

    if (key === 'mode') meta.mode = val
    else if (key === 'job') meta.job = val
    else if (key === 'layers') meta.layers = Number(val)
    else if (key === 'timeMinutes') meta.timeMinutes = Number(val)
    else if (key === 'filamentMm') meta.filamentMm = Number(val)
    else if (key === 'device') meta.device = val
    else if (key === 'process') meta.process = val
    else if (key === 'material') meta.material = val
  }

  return meta
}

const fdmBridgeMeta = computed(() => {
  return currentJobContent.value ? parseFdmBridgeMeta(currentJobContent.value) : null
})

const LS_DEBUG_HISTORY = 'ws-carvera-debug-history'

function readDebugHistory(): string[] {
  try {
    const raw = localStorage.getItem(LS_DEBUG_HISTORY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeDebugHistory(list: string[]) {
  localStorage.setItem(LS_DEBUG_HISTORY, JSON.stringify(list.slice(0, 20)))
}

const deviceMacros = DEVICE_GCODE_MACROS
const debugLine = ref('')
const debugHistory = ref<string[]>(readDebugHistory())
const canSendDebugLine = computed(() => {
  const s = debugLine.value.trim()
  return connected.value && s.length > 0 && store.isSocketOpen()
})

function pushDebugHistory(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return
  const next = [trimmed, ...debugHistory.value.filter((x) => x !== trimmed)].slice(0, 20)
  debugHistory.value = next
  writeDebugHistory(next)
}

function onSelectDebugHistory(v: string) {
  debugLine.value = v
}

const jogStep = ref(1)
const jogFeed = ref<number | null>(null)

const preferMachineTool = computed(() =>
  machinePositionLooksLive(connected.value, {
    x: machineState.value.x,
    y: machineState.value.y,
    z: machineState.value.z,
  }),
)
const toolPosition = useGcodeToolPositionWithMachineFallback(
  currentJobContent,
  machineState,
  preferMachineTool,
)
const stemColor = computed(() => (machineState.value.spindleOn ? 0x67c23a : 0xe6a23c))
type JogDir = 'X+' | 'X-' | 'Y+' | 'Y-' | 'Z+' | 'Z-'

function onJog(dir: JogDir, step: number | undefined) {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  const s = Number(step ?? 0)
  if (!s || !Number.isFinite(s)) return

  let axis: 'X' | 'Y' | 'Z' = 'X'
  let delta = s

  if (dir.startsWith('Y')) axis = 'Y'
  if (dir.startsWith('Z')) axis = 'Z'
  if (dir.endsWith('-')) delta = -s

  const feed = jogFeed.value ?? undefined
  store.jogRelative(axis, delta, feed)
}

function onSendDebugLine() {
  const line = debugLine.value.trim()
  if (!line) return
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }

  store.basicCommandSend(line)
  pushDebugHistory(line)
  debugLine.value = ''
  ElMessage.success('已发送')
}

function onSendMacro(line: string) {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  store.basicCommandSend(line)
  pushDebugHistory(line)
  ElMessage.success(`已发送 ${line}`)
}

const fileInputRef = ref<HTMLInputElement | null>(null)

function onImportClick() {
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  await importTextFromInput(e, {
    readFailedMessage: '读取文件失败',
    onSuccess: (text, file) => {
    const now = Date.now()
    const record: CarveraJobRecord = {
      id: newId(),
      name: file.name,
      createdAt: now,
      updatedAt: now,
      size: file.size,
      content: text,
    }
    store.addJob(record)
    ElMessage.success(`已导入：${file.name}（${file.size} 字节，已保存内容）`)
    },
  })
}

function onClearJobs() {
  store.clearJobs()
  ElMessage.info('已清空作业列表（仅本机浏览器）')
}

async function onDeleteSelectedJob() {
  if (!selectedJobId.value) return
  const job = store.currentJob
  try {
    await ElMessageBox.confirm(`确定删除作业：${job?.name || selectedJobId.value} ？`, '删除作业', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  store.deleteJob(selectedJobId.value)
  ElMessage.success('已删除作业')
}

async function onRenameSelectedJob() {
  const job = store.currentJob
  if (!job) return
  let name: string
  try {
    name = await ElMessageBox.prompt('请输入新的作业名称', '重命名作业', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: job.name,
    }).then((r) => r.value)
  } catch {
    return
  }
  const next = name.trim()
  if (!next) return
  store.renameJob(job.id, next)
  ElMessage.success('已重命名')
}

function onExportSelectedJob() {
  const job = store.currentJob
  if (!job) return
  exportText(job.name || 'job.gcode', job.content || '', '已导出（浏览器下载）', 'text/plain;charset=utf-8')
}

async function onCopyCurrentJobGcode() {
  if (!currentJobContent.value) {
    ElMessage.warning('当前作业没有 G-code')
    return
  }
  const { text, truncated } = gcodeForClipboard(currentJobContent.value)
  await copyText(text, truncated ? '已复制 G-code（已截断）' : '已复制 G-code')
}

function onJobRowClick(row: CarveraJobRecord) {
  store.selectJob(row.id)
  ElMessage.info(`选中作业：${row.name}`)
}

function onEndpointChange() {
  store.setEndpoint(endpointEditable.value.trim() || defaultDeviceBridgeEndpoint('carvera'))
  ElMessage.success('已保存端点配置（仅本机浏览器）')
}

function onResetBridgeEndpoint() {
  const url = defaultDeviceBridgeEndpoint('carvera')
  endpointEditable.value = url
  store.setEndpoint(url)
  ElMessage.success('已恢复默认 device-bridge 端点')
}

async function onConnect() {
  if (connecting.value) return
  await store.connect()
  if (connected.value) {
    ElMessage.success(`已连接到 Carvera（${endpoint.value}）`)
  } else {
    ElMessage.error('连接失败')
  }
}

function onDisconnect() {
  store.disconnect()
  ElMessage.info('已断开 Carvera 连接')
}

function onClearLogs() {
  store.clearLogs()
  ElMessage.info('已清空日志')
}

function onClearAlarm() {
  store.clearAlarm()
  ElMessage.info('已清除告警')
}

function onSendCurrentJob() {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  if (!currentJob.value || !currentJobContent.value) {
    ElMessage.warning('当前没有可发送的 G-code 作业')
    return
  }
  if (!store.isSocketOpen()) {
    ElMessage.warning('WebSocket 未就绪')
    return
  }

  const job = currentJob.value
  void store.sendJobLines(currentJobContent.value, 20)
  ElMessage.success(`开始发送作业：${job.name}（逐行，占位）`)
}

function onPauseSend() {
  if (!store.sending || store.sendPaused) return
  store.pauseSend()
  ElMessage.info('已暂停发送')
}

function onResumeSend() {
  if (!store.sending || !store.sendPaused) return
  store.resumeSend()
  ElMessage.info('已继续发送')
}

function onCancelSend() {
  if (!store.sending) return
  store.cancelSend()
  ElMessage.info('已请求停止发送，当前行发送完后将停止')
}

function onReset() {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  store.resetController()
  ElMessage.info('已发送复位指令')
}

function onHome() {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  store.homeAll()
  ElMessage.info('已发送回零指令')
}

function onFeedHold() {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  store.feedHold()
  ElMessage.info('已发送急停/暂停指令')
}

function onCycleStart() {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  store.cycleStart()
  ElMessage.info('已发送继续指令')
}

function formatLogLine(entry: any) {
  const t = new Date(entry.time).toLocaleTimeString()
  const seq = entry.seq ? `#${entry.seq} ` : ''
  return `[${t}] ${seq}${entry.direction} ${entry.kind ?? ''} ${entry.text}`.trim()
}

function onExportLogsTxt() {
  const toExport = filteredLogs.value
  if (!toExport.length) return
  const name = `carvera-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  const text = toExport.map(formatLogLine).join('\n') + '\n'
  exportText(name, text, `已导出日志（${toExport.length} 条）`)
}

function onExportLogsJson() {
  const toExport = filteredLogs.value
  if (!toExport.length) return
  const name = `carvera-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const text = JSON.stringify(toExport, null, 2)
  exportText(name, text, `已导出日志（${toExport.length} 条）`, 'application/json;charset=utf-8')
}
</script>

<style scoped>
.carvera-root {
  height: calc(100vh - 60px);
}
.carvera-aside,
.carvera-aside-right {
  background: #fff;
  border-right: 1px solid #dcdfe6;
}
.carvera-aside-right {
  border-left: 1px solid #dcdfe6;
  border-right: none;
}
.carvera-center {
  background: #f5f7fa;
}
.carvera-main {
  padding: 12px;
}
.pane-title {
  padding: 10px 12px;
  font-weight: 600;
  border-bottom: 1px solid #ebeef5;
}
.pane-body {
  padding: 12px;
}
.viewport {
  position: relative;
  height: calc(100% - 36px);
  min-height: 520px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  padding: 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.hint {
  color: #909399;
}
.gcode-preview {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre;
}

.debug-json {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 2px;
}

.log-time {
  flex: 0 0 auto;
  color: #c0c4cc;
}

.log-seq {
  flex: 0 0 auto;
  color: #c0c4cc;
  font-variant-numeric: tabular-nums;
}

.log-dir {
  flex: 0 0 auto;
  width: 1.5em;
  text-align: center;
}

.log-text {
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1 1 auto;
}

.log-in {
  color: #67c23a;
}

.log-out {
  color: #409eff;
}

.log-info {
  color: #909399;
}

.log-alarm .log-text {
  color: #f56c6c;
  font-weight: 600;
}

.log-status .log-text {
  color: #67c23a;
}
</style>
