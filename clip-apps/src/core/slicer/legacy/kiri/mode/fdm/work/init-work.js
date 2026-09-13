/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

import { util } from '../../../../geo/base.js'
import { fdm_prepare } from './prepare.js'
import { fdm_export } from './export.js'

// noz = nozzle diameter
// fil = filament diameter
// slice = slice height
function extrudePerMM(noz, fil, slice) {
  return ((Math.PI * util.sqr(noz / 2)) / (Math.PI * util.sqr(fil / 2))) * (slice / noz)
}

// dist = distance between extrusion points
// perMM = amount extruded per MM (from extrudePerMM)
// factor = scaling factor (usually 1.0)
function extrudeMM(dist, perMM, factor) {
  return dist * perMM * factor
}

function init() {
  /* worker dispatch hooks deferred */
}

export const FDM = {
  init,
  extrudePerMM,
  extrudeMM,
  slicePre: undefined,
  slice: undefined,
  slicePost: undefined,
  prepare: fdm_prepare,
  export: fdm_export,
}
