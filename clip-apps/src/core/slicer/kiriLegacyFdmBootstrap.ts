/** Vite-bundled grip FDM legacy entry (replaces raw dynamic URL imports). */
import './kiriLegacyPolyfills'
import './legacy/ext/clip2.esm.js'
import './legacy/kiri/core/consts.js'
import './legacy/kiri/core/layers.js'
import './legacy/kiri/core/utils.js'
import './legacy/kiri/core/slice.js'

export { fdm_slice } from './legacy/kiri/mode/fdm/slice.js'
