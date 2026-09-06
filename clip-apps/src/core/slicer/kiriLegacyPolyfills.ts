/**
 * grip grid-apps legacy expects global `THREE` (geo/polygon.js, geo/point.js, …).
 * Worker + browser bundles do not load grip ext/three.js automatically.
 */
import './legacy/add/array.js'
import * as ThreeModule from 'three'

function gripComputeFaceNormal(
  a: ThreeModule.Vector3,
  b: ThreeModule.Vector3,
  c: ThreeModule.Vector3,
) {
  const n = new ThreeModule.Vector3()
  new ThreeModule.Triangle(a, b, c).getNormal(n)
  return n
}

type GripThreeNamespace = typeof ThreeModule & {
  computeFaceNormal: typeof gripComputeFaceNormal
}

const globalScope = globalThis as typeof globalThis & { THREE?: GripThreeNamespace }

if (!globalScope.THREE) {
  // ESM namespace objects are frozen; use a Proxy instead of assigning properties.
  globalScope.THREE = new Proxy(ThreeModule, {
    get(target, prop, receiver) {
      if (prop === 'computeFaceNormal') {
        return gripComputeFaceNormal
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value
    },
  }) as GripThreeNamespace
}

