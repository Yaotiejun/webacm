/**
 * Vite-bundled Kiri CAM legacy entry (slice + export).
 * Mirrors FDM `kiriLegacyFdmBootstrap` so production builds include cam_slice/cam_export.
 */
import '@/core/cam/legacy/kiri/add/array.js'
import '@/core/cam/legacy/kiri/add/class.js'
import '@/core/cam/legacy/kiri/add/three.js'

export { cam_slice } from '@/core/cam/legacy/kiri/mode/cam/slice.js'
export { cam_export } from '@/core/cam/legacy/kiri/mode/cam/export.js'
