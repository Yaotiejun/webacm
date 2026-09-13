/** Vite-bundled grip FDM legacy entry (slice + prepare + export). */
import './kiriLegacyPolyfills'
import './legacy/ext/clip2.esm.js'
import './legacy/kiri/core/consts.js'
import './legacy/kiri/core/layers.js'
import './legacy/kiri/core/utils.js'
import './legacy/kiri/core/slice.js'
import './legacy/kiri/core/print.js'

export { fdm_slice, sliceAll } from './legacy/kiri/mode/fdm/slice.js'
export { fdm_prepare } from './legacy/kiri/mode/fdm/work/prepare.js'
export { fdm_export } from './legacy/kiri/mode/fdm/work/export.js'
export { FDM } from './legacy/kiri/mode/fdm/work/init-work.js'
