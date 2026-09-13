/**
 * TypeScript polyfill of kiri-sla.c exports (render + rle_encode).
 * Used when emcc-built kiri-sla.wasm is missing or fails to instantiate.
 */
export type SlaWasmApi = {
  heap: Uint8Array
  memory: { buffer: ArrayBuffer; grow: (pages: number) => number }
  render: (m: number, i: number, o: number) => number
  rle_encode: (m: number, inn: number, ilen: number, mask: number, out: number, type: number) => number
}

type PolyHeader = {
  length: number
  inners: number
  points: number
  minx: number
  maxx: number
  miny: number
  maxy: number
}

const PH_SIZE = 14 // 7 * Uint16
const PT_SIZE = 8 // 2 * float32

function u16(dv: DataView, off: number): number {
  return dv.getUint16(off, true)
}

function f32(dv: DataView, off: number): number {
  return dv.getFloat32(off, true)
}

function checkCross(x: number, y: number, p1x: number, p1y: number, p2x: number, p2y: number): boolean {
  return (p1y >= y) !== (p2y >= y) && x < ((p2x - p1x) * (y - p1y)) / (p2y - p1y) + p1x
}

function readPoly(dv: DataView, off: number): PolyHeader {
  return {
    length: u16(dv, off),
    inners: u16(dv, off + 2),
    points: u16(dv, off + 4),
    minx: u16(dv, off + 6),
    maxx: u16(dv, off + 8),
    miny: u16(dv, off + 10),
    maxy: u16(dv, off + 12),
  }
}

function isInsidePoly(heap: Uint8Array, dv: DataView, x: number, y: number, startOff: number): {
  inside: boolean
  nextOff: number
} {
  const poly = readPoly(dv, startOff)
  const nextOff = startOff + poly.length
  let off = startOff + PH_SIZE
  const pfx = f32(dv, off)
  const pfy = f32(dv, off + 4)
  off += PT_SIZE
  let p1x = pfx
  let p1y = pfy
  let side = 0
  for (let i = 1; i < poly.points; i++) {
    const p2x = f32(dv, off)
    const p2y = f32(dv, off + 4)
    off += PT_SIZE
    if (checkCross(x, y, p1x, p1y, p2x, p2y)) side = 1 - side
    p1x = p2x
    p1y = p2y
  }
  if (checkCross(x, y, p1x, p1y, pfx, pfy)) side = 1 - side
  return { inside: side === 1, nextOff }
}

function rasterizePoly(heap: Uint8Array, dv: DataView, outBase: number, height: number, startOff: number): number {
  const poly = readPoly(dv, startOff)
  const nextOff = startOff + poly.length
  let off = startOff + PH_SIZE
  const pfx = f32(dv, off)
  const pfy = f32(dv, off + 4)
  off += PT_SIZE
  const pstart = off

  for (let x = poly.minx; x < poly.maxx; x++) {
    for (let y = poly.miny; y < poly.maxy; y++) {
      let side = 0
      off = pstart
      let p1x = pfx
      let p1y = pfy
      for (let i = 1; i < poly.points; i++) {
        const p2x = f32(dv, off)
        const p2y = f32(dv, off + 4)
        off += PT_SIZE
        if (checkCross(x, y, p1x, p1y, p2x, p2y)) side = 1 - side
        p1x = p2x
        p1y = p2y
      }
      if (checkCross(x, y, p1x, p1y, pfx, pfy)) side = 1 - side

      if (side) {
        let probe = off
        for (let i = 0; i < poly.inners; i++) {
          const inner = isInsidePoly(heap, dv, x, y, probe)
          probe = inner.nextOff
          if (inner.inside) {
            side = 0
            break
          }
        }
      }

      if (side) {
        const impos = y + x * height
        heap[outBase + impos] = 255
      }
    }
  }
  return nextOff
}

function rleByte(color: number, count: number, type: number): number {
  if (type === 0) {
    return (count & 0x7f) | ((color << 7) & 0x80)
  }
  const run = count - 1
  return (
    (run & 1 ? 128 : 0) |
    (run & 2 ? 64 : 0) |
    (run & 4 ? 32 : 0) |
    (run & 8 ? 16 : 0) |
    (run & 16 ? 8 : 0) |
    (run & 32 ? 4 : 0) |
    (run & 64 ? 2 : 0) |
    color
  )
}

/** Create an in-memory WASM-like API backed by ArrayBuffer (polyfill). */
export function createSlaWasmPolyfill(initialBytes = 8 * 1024 * 1024): SlaWasmApi {
  let buffer = new ArrayBuffer(initialBytes)
  let heap = new Uint8Array(buffer)

  const memory = {
    get buffer() {
      return buffer
    },
    grow(pages: number) {
      const next = new ArrayBuffer(buffer.byteLength + pages * 65536)
      new Uint8Array(next).set(heap)
      buffer = next
      heap = new Uint8Array(buffer)
      return pages
    },
  }

  function render(_m: number, i: number, o: number): number {
    const dv = new DataView(buffer)
    const width = u16(dv, i)
    const height = u16(dv, i + 2)
    const polys = u16(dv, i + 4)
    heap.fill(0, o, o + width * height)
    let readoff = i + 6 // sizeof info (3*u16) - note C uses 6 bytes if packed; check alignment
    // struct info is 3 Uint16 = 6 bytes
    for (let p = 0; p < polys; p++) {
      readoff = rasterizePoly(heap, dv, o, height, readoff)
    }
    return readoff
  }

  function rle_encode(_m: number, inn: number, ilen: number, mask: number, out: number, type: number): number {
    let inPos = inn
    let rem = ilen
    let color = heap[inPos++]! & mask ? 1 : 0
    let count = 1
    const cmax = type === 0 ? 125 : 128
    let opos = out
    while (--rem > 0) {
      const next = heap[inPos++]! & mask ? 1 : 0
      if (color !== next || count === cmax) {
        heap[opos++] = rleByte(color, count, type)
        count = 0
      }
      count++
      color = next
    }
    if (count > 0) heap[opos++] = rleByte(color, count, type)
    return opos - out
  }

  return { heap, memory, render, rle_encode }
}
