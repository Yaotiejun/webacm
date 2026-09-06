<template>
  <el-container class="gridbot-root">
    <el-aside width="260px" class="gridbot-aside">
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

    <el-container class="gridbot-center">
      <el-main class="gridbot-main">
        <GcodePreviewPanel
          kind="gridbot"
          :job-gcode="currentJobContent"
          :tool-position="toolPosition"
          :stem-color="stemColor"
          title="G-code 预览 / 机床示意"
          footnote="FDM WCS：G0/G1/G2/G3（G17–G19）折线；Three 场景 Y 对应 G-code Z。"
          show-path-hint-in-overlay
        />
      </el-main>
    </el-container>

    <el-aside width="320px" class="gridbot-aside-right">
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
                placeholder="ws://localhost:9999/gridbot"
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
          <el-descriptions-item label="FDM 元信息">
            <span v-if="fdmBridgeMeta">
              <span v-if="fdmBridgeMeta.mode" style="margin-right: 8px">mode: {{ fdmBridgeMeta.mode }}</span>
            <span v-if="fdmBridgeMeta.job">job: {{ fdmBridgeMeta.job }}</span>
              <span v-if="fdmBridgeMeta.layers !== undefined" style="margin-left: 8px">
                layers: {{ fdmBridgeMeta.layers }}
              </span>
              <span v-if="fdmBridgeMeta.timeMinutes !== undefined" style="margin-left: 8px">
                time: {{ fdmBridgeMeta.timeMinutes }} min
              </span>
              <span v-if="fdmBridgeMeta.filamentMm !== undefined" style="margin-left: 8px">
                filament: {{ fdmBridgeMeta.filamentMm }} mm
              </span>
              <div v-if="fdmBridgeMeta.device || fdmBridgeMeta.process || fdmBridgeMeta.material">
                dev/proc/mat:
                {{ fdmBridgeMeta.device || '—' }} /
                {{ fdmBridgeMeta.process || '—' }} /
                {{ fdmBridgeMeta.material || '—' }}
              </div>
            </span>
            <span v-else>—</span>
          </el-descriptions-item>

          <el-descriptions-item label="坐标 (X/Y/Z/E)">
            <span v-if="machine.pos">
              X: {{ machine.pos.x.toFixed(2) }}
              Y: {{ machine.pos.y.toFixed(2) }}
              Z: {{ machine.pos.z.toFixed(2) }}
              E: {{ machine.pos.e.toFixed(2) }}
            </span>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="温度 (喷嘴/热床)">
            <span v-if="machine.temp">
              T: {{ machine.temp.nozzle ?? '—' }}
              <template v-if="machine.temp.nozzleTarget != null"> / {{ machine.temp.nozzleTarget }}</template>
              °C · B: {{ machine.temp.bed ?? '—' }}
              <template v-if="machine.temp.bedTarget != null"> / {{ machine.temp.bedTarget }}</template>
              °C
            </span>
            <span v-else>—</span>
          </el-descriptions-item>
          <el-descriptions-item label="print.run">
            <el-tag :type="store.printRun ? 'success' : 'info'" size="small">
              {{ store.printRun ? '运行中' : '空闲' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="showPrintElapsed || store.sending" label="打印进度">
            <span v-if="store.sendTotalLines">{{ store.printProgressPct }}%</span>
            <span v-else class="hint">—</span>
            <span v-if="store.sending" class="hint" style="margin-left: 8px">
              ({{ store.sendSentLines }}/{{ store.sendTotalLines }} 行)
            </span>
          </el-descriptions-item>
          <el-descriptions-item v-if="showPrintElapsed" label="打印耗时">
            <span class="print-elapsed">{{ livePrintElapsedLabel }}</span>
            <span v-if="printElapsedPhaseHint" class="hint" style="margin-left: 8px">
              {{ printElapsedPhaseHint }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item v-if="store.sending || store.sendFlow" label="ADVANCED_OK (B/P)">
            <span v-if="store.sendFlow">
              B: {{ formatAdvSlot(store.sendFlow.bufFree) }}
              <span v-if="store.sendFlow.bufMax > 0"> (max {{ store.sendFlow.bufMax }})</span>
              · P: {{ formatAdvSlot(store.sendFlow.plnFree) }}
              <span v-if="store.sendFlow.plnMax > 0"> (max {{ store.sendFlow.plnMax }})</span>
              <el-tag
                v-if="store.sendFlow.blocked"
                type="warning"
                size="small"
                style="margin-left: 8px"
              >流控等待</el-tag>
              <span
                v-if="store.sendFlow.timeoutRecovery"
                class="hint"
                style="margin-left: 8px"
              >超时恢复 ({{ store.sendFlow.timeoutRecovery }})</span>
            </span>
            <span v-else class="hint">—</span>
          </el-descriptions-item>
          <el-descriptions-item label="固件错误">
            <span v-if="store.lastError" style="color: #f56c6c; font-weight: 600">{{ store.lastError }}</span>
            <span v-else>—</span>
            <el-button
              v-if="store.lastError"
              size="small"
              plain
              style="margin-left: 8px"
              @click="store.clearLastError()"
            >
              清除
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item label="最后状态行">
            <span class="hint">{{ machine.lastStatusLine || '—' }}</span>
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
          <el-button size="small" :disabled="!connected" @click="onRequestStatus">请求状态</el-button>
          <el-button
            size="small"
            type="success"
            :disabled="!connected || !currentJobContent || store.sending"
            @click="onSendCurrentJob"
          >
            发送当前 G-code（逐行）
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
          <el-switch v-model="autoPoll" :disabled="!connected" active-text="自动" inactive-text="手动" />
          <JobSendProgress
            :sending="store.sending"
            :sent="store.sendSentLines"
            :total="store.sendTotalLines"
          />
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">调试发送</div>
        <div class="pane-body" style="padding-top: 4px">
          <div style="display: flex; gap: 8px; align-items: center">
            <el-input
              v-model="debugLine"
              size="small"
              placeholder="例如：M105 / G28 / M114"
              @keyup.enter="onSendDebugLine"
            />
            <el-select v-model="debugLine" size="small" style="width: 140px" placeholder="历史" clearable>
              <el-option v-for="h in debugHistory" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; align-items: center">
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

        <div class="pane-title" style="padding: 8px 0; border: none">解析视图</div>
        <div class="pane-body" style="padding-top: 4px; max-height: 220px; overflow: auto">
          <pre class="debug-json">{{ debugSnapshot }}</pre>
        </div>

        <el-divider />

        <div class="pane-title" style="padding: 8px 0; border: none">消息日志</div>
        <div class="pane-body" style="padding-top: 4px; max-height: 320px; overflow: auto">
          <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center; flex-wrap: wrap">
            <span class="hint">方向:</span>
            <el-select v-model="logDirFilter" size="small" style="width: 110px">
              <el-option label="全部" value="all" />
              <el-option label="入站(in)" value="in" />
              <el-option label="出站(out)" value="out" />
              <el-option label="信息(info)" value="info" />
            </el-select>
            <span class="hint">类型:</span>
            <el-select v-model="logKindFilter" size="small" style="width: 120px">
              <el-option label="全部" value="all" />
              <el-option label="ok" value="ok" />
              <el-option label="error" value="error" />
              <el-option label="温度" value="temp" />
              <el-option label="坐标" value="position" />
              <el-option label="其他" value="other" />
            </el-select>
          </div>

          <div v-if="!filteredLogs.length" class="hint">暂无匹配的日志。</div>
          <ul v-else class="log-list">
            <li
              v-for="entry in filteredLogs"
              :key="entry.id"
              class="log-item"
              :class="{
                'log-error': entry.kind === 'error',
                'log-temp': entry.kind === 'temp',
                'log-position': entry.kind === 'position',
              }"
            >
              <span class="log-time">{{ new Date(entry.time).toLocaleTimeString() }}</span>
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
          <div style="margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap">
            <el-button size="small" plain :disabled="!logs.length" @click="onClearLogs">清空日志</el-button>
            <el-button size="small" plain :disabled="!filteredLogs.length" @click="onExportLogsTxt">导出TXT</el-button>
            <el-button size="small" plain :disabled="!filteredLogs.length" @click="onExportLogsJson">导出JSON</el-button>
            <span class="hint">导出当前筛选结果。</span>
          </div>
        </div>
      </div>
    </el-aside>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useGridBotStore, type GridBotLogEntry } from '@/stores/useGridBotStore'
import { useExportActions } from '@/composables/useExportActions'
import { gcodeForClipboard } from '@/core/gcode/gcodeForClipboard'
import { DEVICE_GCODE_MACROS } from '@/core/devices/deviceGcodeMacros'
import { defaultDeviceBridgeEndpoint } from '@/core/devices/deviceEndpointReset'
import { useFileImportActions } from '@/composables/useFileImportActions'
import type { GridBotJobRecord } from '@/api/jobs'
import GcodePreviewPanel from '@/components/gcode/GcodePreviewPanel.vue'
import JobSendProgress from '@/components/devices/JobSendProgress.vue'
import {
  machinePositionLooksLive,
  useGcodeToolPositionWithMachineFallback,
} from '@/composables/useGcodeToolPositionWithMachineFallback'
import {
  computeGridbotPrintElapsedMs,
  formatGridbotPrintElapsed,
  gridbotPrintElapsedPhase,
} from '@/core/devices/gridbotPrintElapsed'

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

type LogDirFilter = 'all' | 'in' | 'out' | 'info'
type LogKindFilter = 'all' | 'ok' | 'error' | 'temp' | 'position' | 'other'

const store = useGridBotStore()
const { copyText, exportText } = useExportActions()

function formatAdvSlot(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '∞'
  return String(n)
}

const elapsedTick = ref(0)
let elapsedTimer: ReturnType<typeof setInterval> | null = null

watch(
  () => store.printTimingActive,
  (active) => {
    if (elapsedTimer) {
      clearInterval(elapsedTimer)
      elapsedTimer = null
    }
    if (active) {
      elapsedTimer = setInterval(() => {
        elapsedTick.value += 1
      }, 1000)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (elapsedTimer) clearInterval(elapsedTimer)
})

const showPrintElapsed = computed(() => store.printPrepAt != null)

const livePrintElapsedLabel = computed(() => {
  if (store.printTimingActive) void elapsedTick.value
  return formatGridbotPrintElapsed(
    computeGridbotPrintElapsedMs({
      prepAt: store.printPrepAt,
      bodyStartedAt: store.printBodyStartedAt,
      endedAt: store.printEndedAt,
      markAt: store.printMarkAt,
      now: store.printEndedAt == null ? Date.now() : undefined,
    }),
  )
})

const printElapsedPhaseHint = computed(() => {
  const phase = gridbotPrintElapsedPhase({
    prepAt: store.printPrepAt,
    bodyStartedAt: store.printBodyStartedAt,
    endedAt: store.printEndedAt,
    markAt: store.printMarkAt,
  })
  if (phase === 'head') return '发送头'
  if (phase === 'body') return '打印主体'
  if (phase === 'done') return '已结束'
  return ''
})
const { importTextFromInput } = useFileImportActions()
void store.loadJobs()

const deviceMacros = DEVICE_GCODE_MACROS
const fileInputRef = ref<HTMLInputElement | null>(null)

const { connected, connecting, endpoint, logs, machine, bridge, jobs, selectedJobId } = storeToRefs(store)

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

const currentJobContent = computed(() => {
  const job = store.jobs.find((j) => j.id === store.selectedJobId)
  return job?.content ?? ''
})

const machinePosition = computed(() => ({
  x: machine.value.pos?.x ?? 0,
  y: machine.value.pos?.y ?? 0,
  z: machine.value.pos?.z ?? 0,
}))
const preferMachineTool = computed(() =>
  machinePositionLooksLive(connected.value, machinePosition.value),
)
const toolPosition = useGcodeToolPositionWithMachineFallback(
  currentJobContent,
  machinePosition,
  preferMachineTool,
)
const stemColor = computed(() => 0x409eff)

const fdmBridgeMeta = computed(() => {
  return currentJobContent.value ? parseFdmBridgeMeta(currentJobContent.value) : null
})

const debugSnapshot = computed(() => {
  return JSON.stringify(
    {
      machine: machine.value,
      bridge: bridge.value,
      connected: connected.value,
      fdmBridgeMeta: fdmBridgeMeta.value,
      print: {
        elapsed: livePrintElapsedLabel.value,
        phase: printElapsedPhaseHint.value,
        prepAt: store.printPrepAt,
        bodyStartedAt: store.printBodyStartedAt,
        endedAt: store.printEndedAt,
      },
    },
    null,
    2,
  )
})

const autoPoll = ref(false)
let pollTimer: number | null = null

const logDirFilter = ref<LogDirFilter>('all')
const logKindFilter = ref<LogKindFilter>('all')

const filteredLogs = computed(() => {
  return logs.value.filter((entry) => {
    if (logDirFilter.value !== 'all' && entry.direction !== logDirFilter.value) return false
    if (logKindFilter.value !== 'all' && entry.kind !== logKindFilter.value) return false
    return true
  })
})

const endpointEditable = ref(endpoint.value)
watch(endpoint, (v) => {
  endpointEditable.value = v
})

const LS_DEBUG_HISTORY = 'ws-gridbot-debug-history'

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

function onImportClick() {
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  await importTextFromInput(e, {
    readFailedMessage: '读取文件失败',
    onSuccess: async (text, file) => {
      const now = Date.now()
      const record: GridBotJobRecord = {
        id: newId(),
        name: file.name,
        createdAt: now,
        updatedAt: now,
        content: text,
      }
      await store.saveJob(record)
      ElMessage.success(`已导入：${file.name}（${file.size} 字节）`)
    },
  })
}

async function onCopyCurrentJobGcode() {
  if (!currentJobContent.value) {
    ElMessage.warning('当前作业没有 G-code')
    return
  }
  const { text, truncated } = gcodeForClipboard(currentJobContent.value)
  await copyText(text, truncated ? '已复制 G-code（已截断）' : '已复制 G-code')
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

function onSendCurrentJob() {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  if (!currentJobContent.value) {
    ElMessage.warning('当前没有可发送的 G-code 作业')
    return
  }
  if (!store.isSocketOpen()) {
    ElMessage.warning('WebSocket 未就绪')
    return
  }
  const job = store.jobs.find((j) => j.id === store.selectedJobId)
  void store.sendJobLines(currentJobContent.value, 20)
  ElMessage.success(`开始发送作业：${job?.name ?? '未命名'}（逐行）`)
}

function onPauseSend() {
  if (!store.sending || store.sendPaused) return
  store.pauseSend()
  ElMessage.info('已暂停发送（当前行完成后生效）')
}

function onResumeSend() {
  if (!store.sending || !store.sendPaused) return
  store.resumeSend()
  ElMessage.info('已继续发送')
}

function onCancelSend() {
  if (!store.sending) return
  store.cancelSend()
  ElMessage.info('已请求停止发送')
}

function onResetBridgeEndpoint() {
  const url = defaultDeviceBridgeEndpoint('gridbot')
  endpointEditable.value = url
  store.setEndpoint(url)
  ElMessage.success('已恢复默认 device-bridge 端点')
}

function onEndpointChange() {
  store.setEndpoint(endpointEditable.value.trim() || defaultDeviceBridgeEndpoint('gridbot'))
  ElMessage.success('已保存端点配置（仅本机浏览器）')
}

async function onConnect() {
  if (connecting.value) return
  await store.connect()
  if (connected.value) {
    ElMessage.success(`已连接到 GridBot（${endpoint.value}）`)
    if (autoPoll.value && !pollTimer) {
      startAutoPoll()
    }
  } else {
    ElMessage.error('连接失败')
  }
}

function onDisconnect() {
  stopAutoPoll()
  store.disconnect()
  ElMessage.info('已断开 GridBot 连接')
}

function onRequestStatus() {
  if (!connected.value) {
    ElMessage.warning('尚未连接设备')
    return
  }
  // 常见状态请求：M105 温度, M114 位置
  store.basicCommandSend('M105')
  store.basicCommandSend('M114')
  ElMessage.info('已请求状态 (M105/M114)')
}

function startAutoPoll() {
  if (pollTimer !== null) return
  pollTimer = window.setInterval(() => {
    if (!connected.value) {
      stopAutoPoll()
      return
    }
    store.basicCommandSend('M105')
  }, 2000)
}

function stopAutoPoll() {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(autoPoll, (val) => {
  if (val && connected.value) {
    startAutoPoll()
  } else {
    stopAutoPoll()
  }
})

function onJobRowClick(row: { id: string; name: string }) {
  store.selectJob(row.id)
  ElMessage.info(`选中作业：${row.name}`)
}

function onClearJobs() {
  if (!jobs.value.length) return
  void store.clearJobs()
  ElMessage.info('已清空作业列表（仅本机浏览器）')
}

async function onDeleteSelectedJob() {
  if (!selectedJobId.value) return
  const job = store.jobs.find((j) => j.id === selectedJobId.value)
  try {
    await ElMessageBox.confirm(`确定删除作业：${job?.name || selectedJobId.value} ？`, '删除作业', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  await store.deleteJob(selectedJobId.value)
  ElMessage.success('已删除作业')
}

function onExportSelectedJob() {
  if (!selectedJobId.value) return
  const job = store.jobs.find((j) => j.id === selectedJobId.value)
  if (!job || !job.content) {
    ElMessage.warning('当前作业没有可导出的内容')
    return
  }
  const name = job.name || 'gridbot-job.gcode'
  exportText(name, job.content, '已导出作业（浏览器下载）', 'text/plain;charset=utf-8')
}

function onClearLogs() {
  store.clearLogs()
  ElMessage.info('已清空日志')
}

function formatLogLine(entry: GridBotLogEntry) {
  const t = new Date(entry.time).toLocaleTimeString()
  return `[${t}] ${entry.direction} ${entry.text}`.trim()
}

function onExportLogsTxt() {
  const toExport = filteredLogs.value
  if (!toExport.length) return
  const name = `gridbot-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  const text = toExport.map(formatLogLine).join('\n') + '\n'
  exportText(name, text, `已导出日志（${toExport.length} 条）`)
}

function onExportLogsJson() {
  const toExport = filteredLogs.value
  if (!toExport.length) return
  const name = `gridbot-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const text = JSON.stringify(toExport, null, 2)
  exportText(name, text, `已导出日志（${toExport.length} 条）`, 'application/json;charset=utf-8')
}
</script>

<style scoped>
.gridbot-root {
  height: calc(100vh - 60px);
}
.gridbot-aside,
.gridbot-aside-right {
  background: #fff;
  border-right: 1px solid #dcdfe6;
}
.gridbot-aside-right {
  border-left: 1px solid #dcdfe6;
  border-right: none;
}
.gridbot-center {
  background: #f5f7fa;
}
.gridbot-main {
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
  height: calc(100% - 36px);
  min-height: 520px;
  background: #fff;
  border: 1px dashed #dcdfe6;
  padding: 0;
}
.viewport-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
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
.print-elapsed {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
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
.log-error .log-text {
  color: #f56c6c;
  font-weight: 600;
}
.log-temp .log-text {
  color: #e6a23c;
}
.log-position .log-text {
  color: #67c23a;
}
</style>
