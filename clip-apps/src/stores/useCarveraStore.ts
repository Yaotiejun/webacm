import { defineStore } from 'pinia'
import { DEFAULT_CARVERA_BRIDGE_ENDPOINT } from '@/core/migration/deviceBridgeDefaultEndpoint'
import { connectCarvera, disconnectCarvera, isCarveraConnected, listCarveraSd, playCarveraSd, removeCarveraSd, sendCarveraLine, subscribeCarveraControl, subscribeCarveraLines, uploadCarveraSdAndMaybePlay } from '@/api/device'
import {
  listCarveraJobs,
  saveCarveraJob,
  deleteCarveraJob,
  type CarveraJobRecord,
} from '@/api/jobs'
import { clonePlain } from '@/core/clonePlain'
import { waitUnlessSendCanceled } from '@/core/devices/deviceJobSendLoop'
import {
  CarveraAckSendQueue,
  isCarveraOkLine,
} from '@/core/devices/carveraAckSendQueue'
import {
  parseGrblAlarmLine,
  parseGrblAxisLine,
  parseGrblSpindleLine,
  parseGrblStatusReport,
} from '@/core/devices/grblLineParse'
import { parseDeviceBridgeTcpEndpoint } from '@/core/migration/deviceBridgeBackendModes'
import { classifyGrblIncomingLogLine } from '@/core/devices/grblLogClassify'
import { carveraSdPathFromJobName } from '@/core/devices/carveraSdPath'
import {
  isCarveraSdDirName,
  joinCarveraSdPath,
  parentCarveraSdPath,
  type CarveraSdEntry,
} from '@/core/devices/carveraSdBrowser'

let jobSendQueue: CarveraAckSendQueue | null = null
let jobSendWakeOk: (() => void) | null = null

function wakeJobSendOk() {
  const w = jobSendWakeOk
  jobSendWakeOk = null
  w?.()
}

function emitCarveraJobLine(store: { sendSeq: number; pendingSeq: number | null; appendLog: (d: 'out', t: string, seq?: number) => void; sendSentLines: number }, line: string) {
  sendCarveraLine(line)
  const seq = (store.sendSeq += 1)
  store.pendingSeq = seq
  store.appendLog('out', line, seq)
  store.sendSentLines += 1
}

export interface CarveraMachineState {
  x: number
  y: number
  z: number
  /** Work coordinates (grip `wpos`). */
  wx?: number
  wy?: number
  wz?: number
  wa?: number
  feedCurrent?: number
  feedTarget?: number
  feedOverridePct?: number
  laserCurrent?: number
  laserTarget?: number
  laserScale?: number
  probeVoltage?: number
  spinCurrent?: number
  spinTarget?: number
  spinScale?: number
  playLine?: number
  playPercent?: number
  playSeconds?: number
  setupState?: number
  haltCode?: number
  plannerBuf?: number
  alarmCode?: number
  spindleOn: boolean
  spindleRpm: number
  state: 'UNKNOWN' | 'IDLE' | 'RUN' | 'PAUSE' | 'ALARM' | 'HOLD' | 'DOOR'
}

export interface CarveraLogEntry {
  id: string
  time: number
  direction: 'out' | 'in' | 'info'
  text: string
  kind?: 'status' | 'alarm' | 'other'
  seq?: number
}

export interface CarveraBridgeState {
  tcpState: 'unknown' | 'connected' | 'error' | 'closed'
  lastMessage: string | null
  updatedAt: number | null
}

export interface CarveraState {
  jobs: CarveraJobRecord[]
  selectedJobId: string | null
  connected: boolean
  connecting: boolean
  machine: CarveraMachineState
  endpoint: string
  logs: CarveraLogEntry[]
  sending: boolean
  sendPaused: boolean
  lastAlarm: string | null
  coordSampleCount: number
  sendSeq: number
  pendingSeq: number | null
  sendCanceled: boolean
  sendTotalLines: number
  sendSentLines: number
  bridge: CarveraBridgeState
  /** SD XMODEM upload in progress */
  sdUploading: boolean
  sdUploadPath: string | null
  sdUploadBlock: number
  sdUploadTotal: number
  sdLastMd5: string | null
  /** Machine SD browser */
  sdListing: boolean
  sdPath: string
  sdDir: string[]
  sdList: CarveraSdEntry[]
  sdSelectedPath: string | null
}

const LS_KEY = 'ws-carvera'

type CarveraLocalState = {
  endpoint?: string
  jobs?: CarveraJobRecord[]
  selectedJobId?: string | null
  logs?: CarveraLogEntry[]
  lastAlarm?: string | null
  machine?: Partial<CarveraMachineState>
  coordSampleCount?: number
  sendSeq?: number
}

function readLocal(): CarveraLocalState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CarveraLocalState
  } catch {
    return {}
  }
}

function writeLocal(patch: CarveraLocalState) {
  const cur = readLocal()
  localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, ...patch }))
}

function newLogId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const useCarveraStore = defineStore('carvera', {
  state: (): CarveraState => ({
    jobs: [],
    selectedJobId: null,
    connected: false,
    connecting: false,
    machine: {
      x: 0,
      y: 0,
      z: 0,
      spindleOn: false,
      spindleRpm: 0,
      state: 'UNKNOWN',
    },
    endpoint: readLocal().endpoint ?? DEFAULT_CARVERA_BRIDGE_ENDPOINT,
    logs: [],
    sending: false,
    sendPaused: false,
    lastAlarm: null,
    coordSampleCount: 0,
    sendSeq: 0,
    pendingSeq: null,
    sendCanceled: false,
    sendTotalLines: 0,
    sendSentLines: 0,
    bridge: {
      tcpState: 'unknown',
      lastMessage: null,
      updatedAt: null,
    },
    sdUploading: false,
    sdUploadPath: null,
    sdUploadBlock: 0,
    sdUploadTotal: 0,
    sdLastMd5: null,
    sdListing: false,
    sdPath: '/sd/gcodes',
    sdDir: ['sd', 'gcodes'],
    sdList: [],
    sdSelectedPath: null,
  }),
  getters: {
    currentJobName(state): string {
      const job = state.jobs.find((j) => j.id === state.selectedJobId)
      return job?.name ?? ''
    },
    currentJobContent(state): string {
      const job = state.jobs.find((j) => j.id === state.selectedJobId)
      return job?.content ?? ''
    },
    currentJob(state): CarveraJobRecord | null {
      const job = state.jobs.find((j) => j.id === state.selectedJobId)
      return job ?? null
    },
  },
  actions: {
    appendLog(direction: CarveraLogEntry['direction'], text: string, seq?: number) {
      const entry: CarveraLogEntry = {
        id: newLogId(),
        time: Date.now(),
        direction,
        text,
        kind: classifyGrblIncomingLogLine(text, direction),
        seq,
      }
      this.logs.push(entry)
      if (entry.kind === 'alarm') {
        this.lastAlarm = entry.text
      }
      if (this.logs.length > 200) {
        this.logs.splice(0, this.logs.length - 200)
      }
      writeLocal({ logs: this.logs.slice(-200), lastAlarm: this.lastAlarm })
    },
    clearLogs() {
      this.logs = []
      writeLocal({ logs: [] })
    },
    clearAlarm() {
      this.lastAlarm = null
      writeLocal({ lastAlarm: null })
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
    handleIncomingLine(line: string) {
      const pos = parseGrblAxisLine(line)
      if (pos) {
        this.updateMachine(pos)
      }

      const spindle = parseGrblSpindleLine(line)
      if (spindle) {
        this.updateMachine(spindle)
      }

      const trimmed = line.trim()
      const lower = trimmed.toLowerCase()

      if (trimmed.startsWith('Grbl ')) {
        this.updateMachine({ state: 'IDLE' })
      }

      if (trimmed.startsWith('ALARM:')) {
        const alarmCode = parseGrblAlarmLine(trimmed) ?? undefined
        this.updateMachine({ state: 'ALARM', alarmCode })
        this.lastAlarm = trimmed
        writeLocal({ lastAlarm: this.lastAlarm })
      } else if (trimmed.startsWith('error:')) {
        this.updateMachine({ state: 'ALARM' })
        this.lastAlarm = trimmed
        writeLocal({ lastAlarm: this.lastAlarm })
      } else if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
        const status = parseGrblStatusReport(trimmed)
        if (status?.mpos) {
          this.updateMachine({
            x: status.mpos.x ?? this.machine.x,
            y: status.mpos.y ?? this.machine.y,
            z: status.mpos.z ?? this.machine.z,
            wa: status.mpos.a,
          })
        }
        if (status?.wpos) {
          this.updateMachine({
            wx: status.wpos.x,
            wy: status.wpos.y,
            wz: status.wpos.z,
            wa: status.wpos.a ?? this.machine.wa,
          })
        }
        if (status?.feed) {
          this.updateMachine({
            feedCurrent: status.feed.current,
            feedTarget: status.feed.target,
            feedOverridePct: status.feed.overridePct,
          })
        }
        if (status?.buf != null) {
          this.updateMachine({ plannerBuf: status.buf })
          if (jobSendQueue && !jobSendQueue.isFinished()) wakeJobSendOk()
        }
        if (status?.laser) {
          this.updateMachine({
            laserCurrent: status.laser.current,
            laserTarget: status.laser.target,
            laserScale: status.laser.scale,
          })
        }
        if (status?.probe) {
          this.updateMachine({ probeVoltage: status.probe.voltage })
        }
        if (status?.spin) {
          this.updateMachine({
            spinCurrent: status.spin.current,
            spinTarget: status.spin.target,
            spinScale: status.spin.scale,
            spindleRpm: status.spin.current ?? this.machine.spindleRpm,
            spindleOn: (status.spin.current ?? 0) > 0,
          })
        }
        if (status?.play) {
          this.updateMachine({
            playLine: status.play.line,
            playPercent: status.play.percent,
            playSeconds: status.play.seconds,
          })
        }
        if (status?.setup?.state != null) {
          this.updateMachine({ setupState: status.setup.state })
        }
        if (status?.halt?.code != null) {
          this.updateMachine({ haltCode: status.halt.code })
        }
        if (status?.runState) this.updateMachine({ state: status.runState })
      } else if (lower.startsWith('stat:') || lower.startsWith('state:')) {
        if (lower.includes('idle')) this.updateMachine({ state: 'IDLE' })
        else if (lower.includes('run')) this.updateMachine({ state: 'RUN' })
        else if (lower.includes('pause')) this.updateMachine({ state: 'PAUSE' })
      }

      writeLocal({ machine: this.machine })
    },
    isSocketOpen(): boolean {
      return isCarveraConnected()
    },
    basicCommandSend(line: string) {
      if (!this.isSocketOpen()) {
        this.appendLog('info', `无法发送指令（连接未就绪）：${line}`)
        return
      }
      const trimmed = line.trim()
      // GRBL realtime: no `ok` response
      if (trimmed === '!' || trimmed === '~' || trimmed === '?') {
        try {
          sendCarveraLine(trimmed)
          this.appendLog(
            'out',
            trimmed === '!' ? '[feed-hold]' : trimmed === '~' ? '[cycle-start]' : '?',
          )
        } catch (e: any) {
          this.appendLog('info', `发送指令失败：${e?.message ?? String(e)}`)
        }
        return
      }
      try {
        sendCarveraLine(trimmed)
        const seq = (this.sendSeq += 1)
        this.pendingSeq = seq
        writeLocal({ sendSeq: this.sendSeq })
        this.appendLog('out', trimmed, seq)
      } catch (e: any) {
        this.appendLog('info', `发送指令失败：${e?.message ?? String(e)}`)
      }
    },
    resetController() {
      const cmd = '$X'
      this.basicCommandSend(cmd)
    },
    homeAll() {
      const cmd = '$H'
      this.basicCommandSend(cmd)
    },
    feedHold() {
      const cmd = '!'
      if (!this.isSocketOpen()) {
        this.appendLog('info', '无法发送急停/暂停，连接未就绪')
        return
      }
      try {
        sendCarveraLine(cmd)
        this.appendLog('out', '[feed-hold]')
      } catch (e: any) {
        this.appendLog('info', `发送急停/暂停失败：${e?.message ?? String(e)}`)
      }
    },
    cycleStart() {
      const cmd = '~'
      if (!this.isSocketOpen()) {
        this.appendLog('info', '无法发送继续指令，连接未就绪')
        return
      }
      try {
        sendCarveraLine(cmd)
        this.appendLog('out', '[cycle-start]')
      } catch (e: any) {
        this.appendLog('info', `发送继续指令失败：${e?.message ?? String(e)}`)
      }
    },
    jogRelative(axis: 'X' | 'Y' | 'Z' | 'A', delta: number, feed?: number) {
      // carve-control uses compact `G91G0X…`; we restore G90 for safety.
      const unit = axis === 'A' ? '°' : 'mm'
      const cmds: string[] = ['G91']
      if (feed && Number.isFinite(feed)) {
        cmds.push(`G1 ${axis}${delta} F${feed}`)
      } else {
        cmds.push(`G0 ${axis}${delta}`)
      }
      cmds.push('G90')
      for (const c of cmds) {
        this.basicCommandSend(c)
      }
      this.appendLog(
        'info',
        `[JOG] ${axis} ${delta}${unit}${feed && Number.isFinite(feed) ? ` F${feed}` : ''}`,
      )
    },
    /** carve-control WCS zero / origin / clear helpers */
    setWcsZero(axis: 'X' | 'Y' | 'Z' | 'A') {
      if (axis === 'A') {
        this.basicCommandSend('G92.4A0')
      } else {
        this.basicCommandSend(`G10L20P0${axis}0`)
      }
    },
    setOriginFromMpos() {
      const { x, y } = this.machine
      this.basicCommandSend(`G10 L2 P0 X${x} Y${y}`)
      this.appendLog('info', `[origin] G10 L2 P0 X${x} Y${y}`)
    },
    setFeedOverridePct(pct: number) {
      const v = Math.max(10, Math.min(200, Math.round(pct)))
      this.basicCommandSend(`M220 S${v}`)
    },
    setSpinOverridePct(pct: number) {
      const v = Math.max(10, Math.min(200, Math.round(pct)))
      this.basicCommandSend(`M223 S${v}`)
    },
    setLaserOverridePct(pct: number) {
      const v = Math.max(0, Math.min(200, Math.round(pct)))
      this.basicCommandSend(`M325 S${v}`)
    },
    async sendJobLines(content: string, delayMs = 20) {
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

      const queue = new CarveraAckSendQueue({ minPlannerBuf: 1, maxInFlight: 1 })
      jobSendQueue = queue
      queue.enqueue(lines)

      const send = (line: string) => {
        emitCarveraJobLine(this, line)
        writeLocal({ sendSeq: this.sendSeq })
      }

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

      this.appendLog(
        'info',
        `开始 ack 发送（等 ok${delayMs > 0 ? `，${delayMs}ms` : ''}；Buf 门控）`,
      )

      try {
        queue.pump(send, this.machine.plannerBuf)
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

          if (queue.unackedCount > 0 || queue.needsFlowWait(this.machine.plannerBuf)) {
            const gotOk = await waitOk(60_000)
            if (!gotOk) {
              this.appendLog('info', '等待固件 ok / 缓冲释放超时，停止发送')
              break
            }
          }

          const n = queue.pump(send, this.machine.plannerBuf)
          if (n > 0 && delayMs > 0) {
            await new Promise((r) => setTimeout(r, delayMs))
          } else if (n === 0 && queue.pendingCount > 0 && !this.sendCanceled) {
            // Buf held with nothing in flight — poll status then wait again
            try {
              sendCarveraLine('?')
            } catch {
              // ignore
            }
            await waitOk(2_000)
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
        this.sending = false
        this.sendPaused = false
      }
    },
    pauseSend() {
      if (this.sending) this.sendPaused = true
    },
    resumeSend() {
      this.sendPaused = false
    },
    cancelSend() {
      if (this.sending) {
        this.sendCanceled = true
        this.sendPaused = false
      }
    },
    async uploadAndPlayJob(content: string, jobName: string, play = true) {
      if (this.sending || this.sdUploading) {
        this.appendLog('info', '已有发送/上传任务在进行中')
        return
      }
      if (!this.isSocketOpen()) {
        this.appendLog('info', 'Socket 未就绪，无法 SD 上传')
        return
      }
      const path = carveraSdPathFromJobName(jobName)
      this.sdUploading = true
      this.sdUploadPath = path
      this.sdUploadBlock = 0
      this.sdUploadTotal = 0
      this.appendLog('info', `SD ${play ? 'upload+play' : 'upload'}: ${path}`)
      try {
        const result = await uploadCarveraSdAndMaybePlay({ path, content, play })
        this.sdLastMd5 = result.md5 ?? null
        this.appendLog('info', `SD 完成：${result.path}${result.md5 ? ` md5=${result.md5}` : ''}`)
        void this.refreshSdList(this.sdPath)
      } catch (e: any) {
        this.appendLog('info', `SD 失败：${e?.message ?? String(e)}`)
        throw e
      } finally {
        this.sdUploading = false
      }
    },
    async refreshSdList(path?: string) {
      if (!this.isSocketOpen()) {
        this.appendLog('info', 'Socket 未就绪，无法列出 SD')
        return
      }
      if (this.sdUploading || this.sdListing) {
        this.appendLog('info', 'SD 忙，稍后再列目录')
        return
      }
      const target = path ?? this.sdPath
      this.sdListing = true
      try {
        const result = await listCarveraSd({ path: target })
        this.sdPath = result.path
        this.sdDir = result.dir
        this.sdList = result.list
        this.appendLog('info', `SD 列表 ${result.path}（${result.list.length}）`)
      } catch (e: any) {
        this.appendLog('info', `SD 列表失败：${e?.message ?? String(e)}`)
        throw e
      } finally {
        this.sdListing = false
      }
    },
    async openSdEntry(entry: CarveraSdEntry) {
      if (isCarveraSdDirName(entry.name)) {
        const next = joinCarveraSdPath(this.sdPath, entry.name)
        this.sdSelectedPath = null
        await this.refreshSdList(next)
        return
      }
      this.sdSelectedPath = joinCarveraSdPath(this.sdPath, entry.name)
    },
    async goSdParent() {
      const parent = parentCarveraSdPath(this.sdPath)
      this.sdSelectedPath = null
      await this.refreshSdList(parent)
    },
    async playSelectedSd() {
      const path = this.sdSelectedPath
      if (!path) {
        this.appendLog('info', '未选择 SD 文件')
        return
      }
      try {
        const result = await playCarveraSd({ path })
        this.appendLog('info', `SD 播放：${result.path}`)
      } catch (e: any) {
        this.appendLog('info', `SD 播放失败：${e?.message ?? String(e)}`)
        throw e
      }
    },
    async removeSelectedSd() {
      const path = this.sdSelectedPath
      if (!path) {
        this.appendLog('info', '未选择 SD 文件')
        return
      }
      try {
        const result = await removeCarveraSd({ path })
        this.appendLog('info', `SD 已删除：${result.path}`)
        this.sdSelectedPath = null
        await this.refreshSdList(this.sdPath)
      } catch (e: any) {
        this.appendLog('info', `SD 删除失败：${e?.message ?? String(e)}`)
        throw e
      }
    },
    async loadJobs() {
      this.jobs = clonePlain(await listCarveraJobs()) as CarveraJobRecord[]
    },
    async setJobs(list: CarveraJobRecord[]) {
      this.jobs = clonePlain(list) as CarveraJobRecord[]
      for (const job of this.jobs) {
        await saveCarveraJob(job)
      }
    },
    setConnecting(flag: boolean) {
      this.connecting = flag
    },
    setConnected(flag: boolean) {
      this.connected = flag
    },
    updateMachine(partial: Partial<CarveraMachineState>) {
      this.machine = { ...this.machine, ...partial }
    },
    setEndpoint(url: string) {
      this.endpoint = url
      writeLocal({ endpoint: url })
    },
    async loadFromLocal() {
      const local = readLocal()
      if (local.endpoint) this.endpoint = local.endpoint
      await this.loadJobs()
      if (typeof local.selectedJobId !== 'undefined') this.selectedJobId = local.selectedJobId
      if (Array.isArray(local.logs)) this.logs = local.logs.slice(-200)
      if (typeof local.lastAlarm !== 'undefined') this.lastAlarm = local.lastAlarm ?? null
      if (local.machine) this.machine = { ...this.machine, ...local.machine }
      if (typeof local.coordSampleCount === 'number') this.coordSampleCount = local.coordSampleCount
      if (typeof local.sendSeq === 'number') this.sendSeq = local.sendSeq

      // Guard: if selected job no longer exists, clear selection.
      if (this.selectedJobId && this.jobs && this.jobs.some && !this.jobs.some((j) => j.id === this.selectedJobId)) {
        this.selectedJobId = null
      }
    },
    async addJob(job: CarveraJobRecord) {
      const snap = clonePlain(job) as CarveraJobRecord
      await saveCarveraJob({ ...snap, updatedAt: snap.updatedAt ?? Date.now() })
      await this.loadJobs()
      this.selectedJobId = snap.id
      writeLocal({ selectedJobId: this.selectedJobId })
    },
    async deleteJob(id: string) {
      await deleteCarveraJob(id)
      await this.loadJobs()
      if (this.selectedJobId === id) {
        this.selectedJobId = this.jobs[0]?.id ?? null
        writeLocal({ selectedJobId: this.selectedJobId })
      }
    },
    async renameJob(id: string, name: string) {
      const job = this.jobs.find((j) => j.id === id)
      if (!job) return
      await saveCarveraJob({ ...job, name })
      await this.loadJobs()
    },
    async clearJobs() {
      for (const j of this.jobs) {
        await deleteCarveraJob(j.id)
      }
      this.jobs = []
      this.selectedJobId = null
      writeLocal({ selectedJobId: this.selectedJobId })
    },
    // override to persist
    selectJob(id: string) {
      this.selectedJobId = id
      writeLocal({ selectedJobId: id })
    },
    disconnect() {
      if (this.connected) {
        this.appendLog('info', '=== session end (manual disconnect) ===')
      }
      this.sending = false
      this.pendingSeq = null
      try {
        disconnectCarvera()
      } catch {
        // ignore
      }
            this.connected = false
      this.connecting = false
    },
    async connect() {
      if (this.connecting || this.connected) return
      this.connecting = true

      try {
        const url = this.endpoint

        this.appendLog('info', '=== session start (connecting) ===')
        this.pendingSeq = null

        await connectCarvera(url)

        subscribeCarveraControl((ev) => {
          if (ev.type === 'xmodem') {
            this.sdUploading = ev.phase === 'start' || ev.phase === 'progress'
            this.sdUploadBlock = ev.block ?? this.sdUploadBlock
            this.sdUploadTotal = ev.total ?? this.sdUploadTotal
            if (ev.path) this.sdUploadPath = ev.path
            if (ev.phase === 'error') {
              this.appendLog('info', `XMODEM error: ${ev.message ?? 'unknown'}`)
            }
            return
          }
          if (ev.type === 'uploaded') {
            this.sdLastMd5 = ev.md5
            this.sdUploadPath = ev.path
            this.appendLog('info', `uploaded ${ev.path} md5=${ev.md5}`)
            return
          }
          if (ev.type === 'played') {
            this.appendLog('info', `play ${ev.path}`)
            return
          }
          if (ev.type === 'error') {
            this.appendLog('info', `bridge: ${ev.message}`)
          }
        })

        // 订阅行流
        subscribeCarveraLines((rawLine) => {
          const lines = rawLine.split(/\r?\n/)
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            if (this.handleBridgeLine(trimmed)) {
              this.appendLog('info', trimmed)
              continue
            }

            // 纯坐标行会高频刷屏：只更新 machineState；每 N 条写一条摘要
            if (/^X-?\d.*Y-?\d.*Z-?\d\s*$/i.test(trimmed)) {
              this.handleIncomingLine(trimmed)
              this.coordSampleCount += 1
              if (this.coordSampleCount % 20 === 0) {
                this.appendLog(
                  'info',
                  `pos updated x${this.coordSampleCount} (X=${this.machine.x.toFixed(3)} Y=${this.machine.y.toFixed(3)} Z=${this.machine.z.toFixed(3)})`,
                )
                writeLocal({ coordSampleCount: this.coordSampleCount })
              }
              continue
            }

            if (isCarveraOkLine(trimmed)) {
              if (jobSendQueue?.handleOk()) {
                wakeJobSendOk()
              }
              if (this.pendingSeq !== null) {
                this.appendLog('in', trimmed, this.pendingSeq)
                this.pendingSeq = null
              } else {
                this.appendLog('in', trimmed)
              }
            } else {
              this.appendLog('in', trimmed)
            }

            this.handleIncomingLine(trimmed)
          }
        })

                this.connected = true
        this.appendLog('info', `连接到 ${this.endpoint}`)
      } catch (e: any) {
        this.appendLog('info', `连接失败：${this.endpoint} (${e?.message ?? String(e)})`)
        this.connected = false
        this.pendingSeq = null
      } finally {
        this.connecting = false
      }
    },
  },
})
