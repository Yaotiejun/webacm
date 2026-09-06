#!/usr/bin/env node
/**
 * Mock device-bridge WS soak (no real TCP machine).
 * Run with bridge already listening: npm run dev
 */
import { WebSocket } from 'ws'

const port = Number(process.env.PORT ?? 9999)
const carveraUrl = `ws://127.0.0.1:${port}/carvera`
const gridbotUrl = `ws://127.0.0.1:${port}/gridbot`

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function collectLines(url, sendLines, ms = 4000) {
  return new Promise((resolve, reject) => {
    const lines = []
    const ws = new WebSocket(url)
    const timer = setTimeout(() => {
      try {
        ws.close()
      } catch {
        /* ignore */
      }
      resolve(lines)
    }, ms)
    ws.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    ws.on('message', (data) => {
      const text = String(data)
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim()
        if (t) lines.push(t)
      }
    })
    ws.on('open', async () => {
      for (const cmd of sendLines) {
        ws.send(`${cmd}\n`)
        await sleep(200)
      }
    })
    ws.on('close', () => {
      clearTimeout(timer)
      resolve(lines)
    })
  })
}

const carveraLines = await collectLines(
  carveraUrl,
  Array.from({ length: 8 }, () => '?'),
)
const gridbotLines = await collectLines(gridbotUrl, ['M105', 'M114', 'N1 G1 X1'])

const carveraOk = carveraLines.some((l) => l.startsWith('<') && l.includes('MPos'))
const gridbotOk =
  gridbotLines.some((l) => l.startsWith('ok T:')) &&
  gridbotLines.some((l) => l.startsWith('X:')) &&
  gridbotLines.some((l) => /^ok(\s+N\d+)?\s+B\d+\s+P\d+/.test(l))

console.log('[mock-bridge-soak]', {
  carveraLines: carveraLines.length,
  gridbotLines: gridbotLines.length,
  carveraOk,
  gridbotOk,
})

if (!carveraOk || !gridbotOk) {
  console.error('last carvera:', carveraLines.slice(-3))
  console.error('last gridbot:', gridbotLines.slice(-6))
  process.exit(1)
}

console.log('[mock-bridge-soak] ok')
