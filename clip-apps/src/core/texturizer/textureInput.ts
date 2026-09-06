export interface TexturizerTextureInput {
  width: number
  height: number
  gray: Uint8Array
}

function buildDefaultCheckerGray(width: number, height: number): Uint8Array {
  const arr = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0 ? 64 : 192
      arr[y * width + x] = v
    }
  }
  return arr
}

export function resolveTextureInput(texture?: Partial<TexturizerTextureInput>): TexturizerTextureInput {
  const width = texture?.width ?? 128
  const height = texture?.height ?? 128
  const gray = texture?.gray ?? buildDefaultCheckerGray(width, height)
  return { width, height, gray }
}
