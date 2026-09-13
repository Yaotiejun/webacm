/**
 * CTB RLE encode/decode (ported from legacy x_ctb.js).
 * Input plane is 0/1 (or grayscale); quantize maps to 0..0x7f.
 */

export function quantizeCtbPixel(value: number): number {
  return value ? Math.max(1, Math.min(0x7f, Math.round(value / 2))) : 0
}

function writeRun(output: number[], color: number, length: number): void {
  if (length === 1) {
    output.push(color)
    return
  }

  output.push(color | 0x80)
  if (length < 0x80) {
    output.push(length)
  } else if (length < 0x4000) {
    output.push(0x80 | (length >> 8), length & 0xff)
  } else if (length < 0x200000) {
    output.push(0xc0 | (length >> 16), (length >> 8) & 0xff, length & 0xff)
  } else if (length < 0x10000000) {
    output.push(
      0xe0 | (length >> 24),
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff,
    )
  } else {
    throw new Error("CTB RLE run too long (" + length + ")")
  }
}

/** Encode 0/1 (or grayscale) plane to CTB RLE bytes. */
export function encodeCtbRle(input: Uint8Array): Uint8Array {
  if (!input.length) return new Uint8Array(0)
  const output: number[] = []
  let color = quantizeCtbPixel(input[0]!)
  let run = 1

  for (let offset = 1; offset < input.length; offset++) {
    const next = quantizeCtbPixel(input[offset]!)
    if (next === color) {
      run++
      continue
    }
    writeRun(output, color, run)
    color = next
    run = 1
  }

  writeRun(output, color, run)
  return new Uint8Array(output)
}

function requireBytes(input: Uint8Array, offset: number, length: number): void {
  if (offset + length > input.length) {
    throw new Error("truncated CTB RLE run length")
  }
}

function readRunLength(input: Uint8Array, offset: number): { length: number; bytes: number } {
  const slen = input[offset]
  if (slen === undefined) throw new Error("truncated CTB RLE run length")

  if ((slen & 0x80) === 0) {
    return { length: slen, bytes: 1 }
  }
  if ((slen & 0xc0) === 0x80) {
    requireBytes(input, offset, 2)
    return {
      length: ((slen & 0x3f) << 8) | input[offset + 1]!,
      bytes: 2,
    }
  }
  if ((slen & 0xe0) === 0xc0) {
    requireBytes(input, offset, 3)
    return {
      length: ((slen & 0x1f) << 16) | (input[offset + 1]! << 8) | input[offset + 2]!,
      bytes: 3,
    }
  }
  if ((slen & 0xf0) === 0xe0) {
    requireBytes(input, offset, 4)
    return {
      length:
        (((slen & 0x0f) << 24) |
          (input[offset + 1]! << 16) |
          (input[offset + 2]! << 8) |
          input[offset + 3]!) >>>
        0,
      bytes: 4,
    }
  }

  throw new Error("unsupported CTB RLE run length prefix 0x" + slen.toString(16))
}

/** Decode CTB RLE to grayscale plane (0 or odd values matching encode invert). */
export function decodeCtbRle(input: Uint8Array, pixelCount: number): Uint8Array {
  const output = new Uint8Array(pixelCount)
  let offset = 0
  let out = 0

  while (offset < input.length && out < pixelCount) {
    let code = input[offset++]!
    const repeat = (code & 0x80) !== 0
    code &= 0x7f

    let runLen = 1
    if (repeat) {
      const stride = readRunLength(input, offset)
      offset += stride.bytes
      runLen = stride.length
    }

    const value = code === 0 ? 0 : (code << 1) | 1
    const end = out + runLen
    if (end > pixelCount) {
      throw new Error("CTB RLE overrun in decoded layer (" + end + " > " + pixelCount + ")")
    }
    output.fill(value, out, end)
    out = end
  }

  if (out !== pixelCount) {
    throw new Error("CTB RLE underrun in decoded layer (" + out + " < " + pixelCount + ")")
  }

  return output
}
