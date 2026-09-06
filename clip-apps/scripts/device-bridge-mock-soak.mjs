#!/usr/bin/env node
/**
 * Spawn device-bridge (mock) and run WS soak script.
 * Usage: npm run soak:device-bridge:mock
 * Optional: PORT=19999 (defaults to 9999; fails fast if bridge cannot bind)
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const clipRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bridgeRoot = path.resolve(clipRoot, '../device-bridge')

function pickEphemeralPort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, () => {
      const addr = s.address()
      const p = typeof addr === 'object' && addr ? addr.port : 0
      s.close((err) => (err ? reject(err) : resolve(p)))
    })
    s.on('error', reject)
  })
}

const preferred = process.env.PORT != null ? Number(process.env.PORT) : 9999
const port = Number.isFinite(preferred) && preferred > 0 ? preferred : await pickEphemeralPort()

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

let bridge = spawn('npx', ['tsx', 'src/main.ts'], {
  cwd: bridgeRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
  env: { ...process.env, PORT: String(port) },
})

async function waitForBridge(child, listenPort) {
  let ready = false
  let bindFailed = false
  child.stdout?.on('data', (buf) => {
    const t = String(buf)
    process.stdout.write(t)
    if (t.includes('/gridbot')) ready = true
  })
  child.stderr?.on('data', (buf) => {
    const t = String(buf)
    process.stderr.write(t)
    if (t.includes('EADDRINUSE')) bindFailed = true
  })
  for (let i = 0; i < 30 && !ready && !bindFailed; i += 1) {
    await sleep(200)
  }
  if (bindFailed || !ready) {
    try {
      child.kill()
    } catch {
      /* ignore */
    }
    return { ok: false, bindFailed }
  }
  return { ok: true, listenPort }
}

let bridgeResult = await waitForBridge(bridge, port)
let listenPort = port

if (!bridgeResult.ok && process.env.PORT == null) {
  listenPort = await pickEphemeralPort()
  console.log(`[device-bridge-mock-soak] retrying on ephemeral port ${listenPort}`)
  bridge = spawn('npx', ['tsx', 'src/main.ts'], {
    cwd: bridgeRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    env: { ...process.env, PORT: String(listenPort) },
  })
  bridgeResult = await waitForBridge(bridge, listenPort)
}

if (!bridgeResult.ok) {
  console.error(
    `[device-bridge-mock-soak] bridge did not start` +
      (bridgeResult.bindFailed ? ' (EADDRINUSE — stop the old listener or set PORT)' : ' (timeout)'),
  )
  process.exit(1)
}

const soak = spawn('node', ['scripts/mock-bridge-soak.mjs'], {
  cwd: bridgeRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, PORT: String(listenPort) },
})

const code = await new Promise((resolve) => {
  soak.on('close', (c) => resolve(c ?? 1))
})

try {
  bridge.kill()
} catch {
  /* ignore */
}

process.exit(code)
