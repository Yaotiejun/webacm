import { defineStore } from 'pinia'
import { DEFAULT_GRIDBOT_BRIDGE_ENDPOINT } from '@/core/migration/deviceBridgeDefaultEndpoint'
import * as deviceApi from '@/api/device'
import {
  listGridBotJobs,
  saveGridBotJob,
  deleteGridBotJob,
  type GridBotJobRecord,
} from '@/api/jobs'
import { clonePlain } from '@/core/clonePlain'
import { waitUnlessSendCanceled } from '@/core/devices/deviceJobSendLoop'
import {
  parseGridbotErrorLine,
  parseGridbotM105Line,
  parseGridbotM114Line,
  parseGridbotResendLine,
} from '@/core/devices/gridbotLineParse'
import { GridbotAckSendQueue } from '@/core/devices/gridbotAckSendQueue'
import type { GridbotAdvancedOkSlots } from '@/core/devices/gridbotAdvancedOk'
import { classifyGridbotIncomingLogLine, type GridbotLogKind } from '@/core/devices/gridbotLogClassify'
import {
  computeGridbotPrintElapsedMs,
  formatGridbotPrintElapsed,
  gridbotPrintElapsedPhase,
} from '@/core/devices/gridbotPrintElapsed'
import { isGridbotPrintRunActive } from '@/core/devices/gridbotPrintRun'
import { parseDeviceBridgeTcpEndpoint } from '@/core/migration/deviceBridgeBackendModes'
import {
  filterNonEmptyGcodeLines,
  GRIDBOT_CANCEL_SAFETY_SCRIPT,
  GRIDBOT_ESTOP_SCRIPT,
  GRIDBOT_PAUSE_PARK_SCRIPT,
  GRIDBOT_RESUME_UNPARK_SCRIPT,
} from '@/core/devices/gridbotSafetyScripts'

let jobSendQueue: GridbotAckSendQueue | null = null
let jobSendWakeOk: (() => void) | null = null
let jobSendPendingOks = 0

function wakeJobSendOk() {
  if (jobSendWakeOk) {
    jobSendWakeOk()
    jobSendWakeOk = null
  } else {
    jobSendPendingOks += 1
  }
}

export interface GridBotSendFlowState {
  bufFree: number | null
  plnFree: number | null
  bufMax: number
  plnMax: number
  blocked: boolean
  timeoutRecovery: 'planner' | 'buffer' | null
}

function snapshotSendFlow(queue: GridbotAckSendQueue): GridBotSendFlowState {
  const s: GridbotAdvancedOkSlots = queue.getFlowSlots()
  return {
    bufFree: Number.isFinite(s.bufFree) ? s.bufFree : null,
    plnFree: Number.isFinite(s.plnFree) ? s.plnFree : null,
    bufMax: s.bufMax,
    plnMax: s.plnMax,
    blocked: queue.isFlowBlocked(),
    timeoutRecovery: queue.getFlowTimeoutRecovery(),
  }
}

function emitGridbotJobLine(
  store: {
    appendLog: (d: 'out', t: string) => void
    sendSentLines: number
    printMarkAt: number | null
  },
  line: string,
) {
  deviceApi.sendGridBotLine(line)
  store.appendLog('out', line)
  store.sendSentLines += 1
  store.printMarkAt = Date.now()
}

export interface GridBotLogEntry {
  id: string
  time: number
  direction: 'out' | 'in' | 'info'
  text: string
  kind: GridbotLogKind
}

export interface GridBotMachineState {
  pos: { x: number; y: number; z: number; e: number } | null
  temp: {
    nozzle: number | null
    bed: number | null
    nozzleTarget: number | null
    bedTarget: number | null
  } | null
  lastStatusLine: string | null
}

export interface GridBotBridgeState {
  tcpState: 'unknown' | 'connected' | 'error' | 'closed'
  lastMessage: string | null
  updatedAt: number | null
}

export interface GridBotState {
  endpoint: string
  socket: WebSocket | null
  connected: boolean
  connecting: boolean
  logs: GridBotLogEntry[]
  machine: GridBotMachineState
  jobs: GridBotJobRecord[]
  selectedJobId: string | null
  bridge: GridBotBridgeState
  sending: boolean
  sendPaused: boolean
  sendCanceled: boolean
  sendTotalLines: number
  sendSentLines: number
  lastError: string | null
  lastResendFrom: number | null
  sendFlow: GridBotSendFlowState | null
  /** grip `status.print.prep` / job enqueue time before `M117 Start` ack. */
  printPrepAt: number | null
  /** grip `status.print.start` after `M117 Start` is acked. */
  printBodyStartedAt: number | null
  /** grip `status.print.end` when job send queue drains or stops. */
  printEndedAt: number | null
  /** grip `status.print.mark` — last outbound line time for live elapsed. */
  printMarkAt: number | null
}

const LS_KEY = 'ws-gridbot'

function readLocalEndpoint(): string | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { endpoint?: string }
    return typeof parsed.endpoint === 'string' ? parsed.endpoint : undefined
  } catch {
    return undefined
  }
}

function writeLocalEndpoint(endpoint: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ endpoint }))
  } catch {
    // ignore
  }
}

function newLogId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const useGridBotStore = defineStore('gridbot', {
  state: (): GridBotState => ({
    endpoint: readLocalEndpoint() ?? DEFAULT_GRIDBOT_BRIDGE_ENDPOINT,
    socket: null,
    connected: false,
    connecting: false,
    logs: [],
    machine: {
      pos: null,
      temp: null,
      lastStatusLine: null,
    },
    jobs: [],
    selectedJobId: null,
    bridge: {
      tcpState: 'unknown',
      lastMessage: null,
      updatedAt: null,
    },
    sending: false,
    sendPaused: false,
    sendCanceled: false,
    sendTotalLines: 0,
    sendSentLines: 0,
    lastError: null,
    lastResendFrom: null,
    sendFlow: null,
    printPrepAt: null,
    printBodyStartedAt: null,
    printEndedAt: null,
    printMarkAt: null,
  }),
  getters: {
    printElapsedMs(state): number {
      return computeGridbotPrintElapsedMs({
        prepAt: state.printPrepAt,
        bodyStartedAt: state.printBodyStartedAt,
        endedAt: state.printEndedAt,
        markAt: state.printMarkAt,
      })
    },
    printElapsedLabel(): string {
      return formatGridbotPrintElapsed(this.printElapsedMs)
    },
    printElapsedPhase(): ReturnType<typeof gridbotPrintElapsedPhase> {
      return gridbotPrintElapsedPhase({
        prepAt: this.printPrepAt,
        bodyStartedAt: this.printBodyStartedAt,
        endedAt: this.printEndedAt,
        markAt: this.printMarkAt,
      })
    },
    printTimingActive(): boolean {
      return this.printPrepAt != null && this.printEndedAt == null
    },
    /** grip `status.print.run` */
    printRun(): boolean {
      return isGridbotPrintRunActive({
        sending: this.sending,
        printPrepAt: this.printPrepAt,
        printEndedAt: this.printEndedAt,
      })
    },
    /** grip `status.print.progress` (line send % during job). */
    printProgressPct(): string {
      if (!this.sendTotalLines) return '0.00'
      const pct = Math.min(100, (this.sendSentLines / this.sendTotalLines) * 100)
      return pct.toFixed(2)
    },
  },
  actions: {
    syncJobSendFlow() {
      this.sendFlow = jobSendQueue ? snapshotSendFlow(jobSendQueue) : null
    },
    processIncomingLine(trimmed: string) {
      const err = parseGridbotErrorLine(trimmed)
      if (err) this.lastError = err

      const resend = parseGridbotResendLine(trimmed)
      if (resend != null) {
        this.lastResendFrom = resend
        this.lastError = `Resend from line ${resend}`
      }

      const tempRaw = parseGridbotM105Line(trimmed)
      if (tempRaw) {
        this.machine.temp = tempRaw
        this.machine.lastStatusLine = trimmed
      }

      const pos = parseGridbotM114Line(trimmed)
      if (pos) {
        this.machine.pos = pos
        this.machine.lastStatusLine = trimmed
      }

      if (/^(ok\s+)?(M105|M114)/i.test(trimmed) || /X:.*Y:.*Z:/i.test(trimmed)) {
        this.machine.lastStatusLine = trimmed
      }
    },
    clearLastError() {
      this.lastError = null
      this.lastResendFrom = null
    },
    handleBridgeLine(trimmed: string): boolean {
      if (!trimmed.startsWith('[bridge]')) return false
      this.bridge.lastMessage = trimmed
      this.bridge.updatedAt = Date.now()

      const lower = trimmed.toLowerCase()
      const tcpEndpoint = parseDeviceBridgeTcpEndpoint(trimmed)
      if (tcpEndpoint) {
        this.bridge.lastMessage = `${trimmed} → ${tcpEndpoint}`
      }
      if (lower.includes('tcp connected')) {
        this.bridge.tcpState = 'connected'
      } else if (lower.includes('tcp closed')) {
        this.bridge.tcpState = 'closed'
      } else if (lower.includes('tcp error')) {
        this.bridge.tcpState = 'error'
      }

      return true
    },
    appendLog(direction: GridBotLogEntry['direction'], text: string) {
      const entry: GridBotLogEntry = {
        id: newLogId(),
        time: Date.now(),
        direction,
        text,
        kind: classifyGridbotIncomingLogLine(text, direction),
      }
      this.logs.push(entry)
      if (this.logs.length > 200) {
        this.logs.splice(0, this.logs.length - 200)
      }
    },
    clearLogs() {
      this.logs = []
    },
    setEndpoint(url: string) {
      this.endpoint = url
      writeLocalEndpoint(url)
    },
    isSocketOpen(): boolean {
      return this.connected
    },
    async loadJobs() {
      this.jobs = clonePlain(await listGridBotJobs()) as GridBotJobRecord[]
    },
    async saveJob(job: GridBotJobRecord) {
      const snap = clonePlain(job) as GridBotJobRecord
      await saveGridBotJob(snap)
      await this.loadJobs()
      this.selectedJobId = snap.id
    },
    async deleteJob(id: string) {
      await deleteGridBotJob(id)
      await this.loadJobs()
      if (this.selectedJobId === id) {
        this.selectedJobId = this.jobs[0]?.id ?? null
      }
    },
    async clearJobs() {
      for (const j of this.jobs) {
        await deleteGridBotJob(j.id)
      }
      this.jobs = []
      this.selectedJobId = null
    },
    selectJob(id: string | null) {
      this.selectedJobId = id
    },
    async connect() {
      if (this.connecting || this.connected) return
      this.connecting = true

      try {
        const url = this.endpoint
        this.appendLog('info', '=== gridbot session start (connecting) ===')

        await deviceApi.connectGridBot(url)

        deviceApi.subscribeGridBotLines((rawLine) => {
          const lines = rawLine.split(/\r?\n/)
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            if (this.handleBridgeLine(trimmed)) {
              this.appendLog('info', trimmed)
              continue
            }

            this.appendLog('in', trimmed)
            if (jobSendQueue?.handleIncoming(trimmed, (line) => emitGridbotJobLine(this, line))) {
              wakeJobSendOk()
              this.syncJobSendFlow()
            }
            this.processIncomingLine(trimmed)
          }
        })

        this.socket = null
        this.connected = true
        this.appendLog('info', `连接到 ${this.endpoint}`)
      } catch (e: any) {
        this.appendLog('info', `连接失败：${this.endpoint} (${e?.message ?? String(e)})`)
        this.connected = false
      } finally {
        this.connecting = false
      }
    },
    disconnect() {
      if (this.connected) {
        this.appendLog('info', '=== gridbot session end (manual disconnect) ===')
      }
      try {
        deviceApi.disconnectGridBot()
      } catch {
        // ignore
      }
      this.socket = null
      this.connected = false
      this.connecting = false
    },
    basicCommandSend(line: string) {
      const trimmed = line.trim()
      if (!trimmed) return
      if (!this.isSocketOpen()) {
        this.appendLog('info', `无法发送指令（socket 未就绪）：${trimmed}`)
        return
      }
      try {
        deviceApi.sendGridBotLine(trimmed)
        this.appendLog('out', trimmed)
      } catch (e: any) {
        this.appendLog('info', `发送指令失败：${e?.message ?? String(e)}`)
      }
    },
    /** Fire-and-forget script (park / safety); does not use job ack queue. */
    sendScriptLines(lines: readonly string[]) {
      for (const line of filterNonEmptyGcodeLines(lines)) {
        this.basicCommandSend(line)
      }
    },
    setNozzleTemp(celsius: number) {
      const s = Math.max(0, Math.round(Number(celsius) || 0))
      this.basicCommandSend(`M104 S${s}`)
      this.basicCommandSend('M105')
    },
    setBedTemp(celsius: number) {
      const s = Math.max(0, Math.round(Number(celsius) || 0))
      this.basicCommandSend(`M140 S${s}`)
      this.basicCommandSend('M105')
    },
    preheat(nozzle = 200, bed = 60) {
      this.setNozzleTemp(nozzle)
      this.setBedTemp(bed)
      this.appendLog('info', `预热 T${nozzle} / B${bed}`)
    },
    cooldown() {
      this.setNozzleTemp(0)
      this.setBedTemp(0)
      this.basicCommandSend('M107')
      this.appendLog('info', '冷却：加热关闭')
    },
    setFeedOverridePct(pct: number) {
      const s = Math.max(10, Math.min(200, Math.round(Number(pct) || 100)))
      this.basicCommandSend(`M220 S${s}`)
    },
    jogRelative(axis: 'X' | 'Y' | 'Z' | 'E', delta: number, feed?: number) {
      if (!Number.isFinite(delta) || delta === 0) return
      const f = Number.isFinite(feed) && (feed as number) > 0 ? Math.round(feed as number) : 1200
      const a = axis.toUpperCase()
      this.sendScriptLines(['G91', `G0 ${a}${delta} F${f}`, 'G90'])
    },
    homeAxes(axes?: 'X' | 'Y' | 'Z' | 'XY' | 'XYZ') {
      if (!axes || axes === 'XYZ') this.basicCommandSend('G28')
      else this.basicCommandSend(`G28 ${axes.split('').join(' ')}`)
    },
    estop() {
      this.sendCanceled = true
      this.sendPaused = false
      this.sendScriptLines(GRIDBOT_ESTOP_SCRIPT)
      this.appendLog('info', 'E-stop：已发送急停脚本')
    },
    async sendJobLines(content: string, delayMs = 20, useChecksum = false) {
      if (this.sending) {
        this.appendLog('info', '已有发送任务在进行中，忽略新的发送请求')
        return
      }
      if (!this.isSocketOpen()) {
        this.appendLog('info', 'Socket 未就绪，无法发送')
        return
      }

      this.sending = true
      this.sendPaused = false
      this.sendCanceled = false
      this.sendSentLines = 0

      const lines = content
        .split(/\r?\n/)
        .map((x) => x.trim())
        .filter(Boolean)

      this.sendTotalLines = lines.length
      this.printPrepAt = Date.now()
      this.printBodyStartedAt = null
      this.printEndedAt = null
      this.printMarkAt = null

      const queue = new GridbotAckSendQueue({ bufmax: 8, useChecksum, advancedOk: true })
      queue.setFlowRecoveredHandler(() => {
        wakeJobSendOk()
        this.syncJobSendFlow()
      })
      queue.setPrintBodyStartHandler(() => {
        this.printBodyStartedAt = Date.now()
        this.appendLog('info', 'M117 Start：打印主体已开始')
      })
      jobSendQueue = queue
      this.syncJobSendFlow()
      this.appendLog(
        'info',
        `开始 ack 发送（bufmax=8，ADVANCED_OK B/P${useChecksum ? '，checksum' : ''}${delayMs > 0 ? `，${delayMs}ms` : ''}）`,
      )

      queue.enqueue(lines)
      const send = (line: string) => emitGridbotJobLine(this, line)

      const waitOk = (timeoutMs: number) =>
        new Promise<boolean>((resolve) => {
          const t = setTimeout(() => {
            if (jobSendWakeOk) jobSendWakeOk = null
            resolve(false)
          }, timeoutMs)
          jobSendWakeOk = () => {
            clearTimeout(t)
            resolve(true)
          }
        })

      try {
        queue.pump(send)
        this.syncJobSendFlow()
        await new Promise<void>((r) => queueMicrotask(r))

        while (!queue.isFinished() && !this.sendCanceled) {
          if (!(await waitUnlessSendCanceled(() => this.sendCanceled, () => this.sendPaused))) {
            this.appendLog('info', '用户已取消发送，停止作业发送')
            break
          }
          if (!this.isSocketOpen()) {
            this.appendLog('info', '连接中断，停止发送')
            break
          }
          if (queue.isFinished()) break

          if (queue.needsFlowWait()) {
            this.syncJobSendFlow()
            const gotFlowOk = await waitOk(120_000)
            if (!gotFlowOk) {
              this.appendLog('info', '等待 ADVANCED_OK 缓冲释放超时，停止发送')
              break
            }
            queue.pump(send)
            this.syncJobSendFlow()
            continue
          }

          if (jobSendPendingOks > 0) {
            jobSendPendingOks -= 1
            if (delayMs > 0) {
              await new Promise((r) => setTimeout(r, delayMs))
            }
            continue
          }

          const gotOk = await waitOk(120_000)
          if (!gotOk) {
            this.appendLog('info', '等待固件 ok 超时，停止发送')
            break
          }
          if (delayMs > 0) {
            await new Promise((r) => setTimeout(r, delayMs))
          }
        }

        if (!this.sendCanceled && queue.isFinished()) {
          this.appendLog('info', '作业发送完成')
        }
      } catch (e: any) {
        this.appendLog('info', `发送过程中出错：${e?.message ?? String(e)}`)
      } finally {
        jobSendQueue?.dispose()
        jobSendQueue = null
        jobSendWakeOk = null
        jobSendPendingOks = 0
        this.sendFlow = null
        this.sending = false
        this.sendPaused = false
        if (this.printPrepAt != null && this.printEndedAt == null) {
          this.printEndedAt = Date.now()
        }
      }
    },
    pauseSend() {
      if (!this.sending || this.sendPaused) return
      this.sendPaused = true
      this.sendScriptLines(GRIDBOT_PAUSE_PARK_SCRIPT)
      this.appendLog('info', '已暂停发送并抬升 Z（park）')
    },
    resumeSend() {
      if (!this.sending || !this.sendPaused) return
      this.sendScriptLines(GRIDBOT_RESUME_UNPARK_SCRIPT)
      this.sendPaused = false
      this.appendLog('info', '已继续发送并回落 Z（unpark）')
    },
    cancelSend() {
      if (!this.sending) return
      this.sendCanceled = true
      this.sendPaused = false
      this.sendScriptLines(GRIDBOT_CANCEL_SAFETY_SCRIPT)
      this.appendLog('info', '已请求停止并发送安全关断脚本')
    },
  },
})
