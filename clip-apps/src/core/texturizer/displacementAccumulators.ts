export type Vec3Tuple = [number, number, number]
export type Vec3Map = Map<string, Vec3Tuple>

export function accumulateVec3Weighted(map: Vec3Map, key: string, x: number, y: number, z: number, weight: number) {
  const acc = map.get(key)
  if (acc) {
    acc[0] += x * weight
    acc[1] += y * weight
    acc[2] += z * weight
  } else {
    map.set(key, [x * weight, y * weight, z * weight])
  }
}

export function accumulateTuple(map: Vec3Map, key: string, a: number, b: number, c: number) {
  const acc = map.get(key)
  if (acc) {
    acc[0] += a
    acc[1] += b
    acc[2] += c
  } else {
    map.set(key, [a, b, c])
  }
}

export function normalizeVec3Map(map: Vec3Map) {
  map.forEach((v, key) => {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1
    map.set(key, [v[0] / len, v[1] / len, v[2] / len])
  })
}
