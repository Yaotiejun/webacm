/**
 * CTB per-layer XOR crypt (ported from legacy x_ctb_crypto.js; no AES).
 */

export const CTB_V3_MAGIC = 0x12fd0086

/** Deterministic seed ('SCXT') for TS MVP CTB exports. */
export const CTB_MVP_SEED = 0x53435854

export function ctbLayerCryptInPlace(
  seed: number,
  layerIndex: number,
  input: Uint8Array,
): Uint8Array {
  if (!seed) return input

  let init = (Math.imul(seed >>> 0, 0x2d83cdac) + 0xd8a83423) >>> 0
  let keySeed = (Math.imul(layerIndex >>> 0, 0x1e1530cd) + 0xec3d47cd) >>> 0
  let key = Math.imul(keySeed, init) >>> 0
  let index = 0

  for (let i = 0; i < input.length; i++) {
    input[i]! ^= (key >>> (8 * index)) & 0xff
    index++
    if ((index & 3) === 0) {
      key = (key + init) >>> 0
      index = 0
    }
  }

  return input
}

export function ctbLayerCrypt(seed: number, layerIndex: number, input: Uint8Array): Uint8Array {
  const output = new Uint8Array(input)
  ctbLayerCryptInPlace(seed, layerIndex, output)
  return output
}
