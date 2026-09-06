/** Geo helpers for legacy Kiri — always loads polyfills before grip geo modules. */
import './kiriLegacyPolyfills'

export { newPoint } from './legacy/geo/point.js'
export { slice as geoSlice, sliceZ } from './legacy/geo/slicer.js'
