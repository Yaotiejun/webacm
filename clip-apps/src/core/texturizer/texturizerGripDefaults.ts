/**
 * Default UI parameters from grip `stlTexturizer-main/js/main.js` `settings` object.
 * shape_cam adds `frequency` (not in grip UI) with product default 1.
 */
export const GRIP_STL_TEXTURIZER_UI_DEFAULTS = Object.freeze({
  mappingMode: 5,
  scaleU: 0.5,
  scaleV: 0.5,
  amplitude: 0.5,
  frequency: 1,
  offsetU: 0,
  offsetV: 0,
  rotationDeg: 0,
  mappingBlend: 1,
  seamBandWidth: 0.5,
  capAngle: 20,
  topAngleLimit: 0,
  bottomAngleLimit: 5,
  symmetricDisplacement: false,
  subdivisionLevels: 0,
  decimationRatio: 1,
  exclusionMode: 'exclude' as const,
})

export type TexturizerGripDefaultsTarget = {
  amplitude: number
  frequency: number
  mappingMode: number
  scaleU: number
  scaleV: number
  offsetU: number
  offsetV: number
  rotationDeg: number
  mappingBlend: number
  seamBandWidth: number
  capAngle: number
  topAngleLimit: number
  bottomAngleLimit: number
  exclusionMode: 'exclude' | 'include'
  subdivisionLevels: number
  decimationRatio: number
  symmetricDisplacement: boolean
}

export function applyGripTexturizerUiDefaults(target: TexturizerGripDefaultsTarget): void {
  const d = GRIP_STL_TEXTURIZER_UI_DEFAULTS
  target.amplitude = d.amplitude
  target.frequency = d.frequency
  target.mappingMode = d.mappingMode
  target.scaleU = d.scaleU
  target.scaleV = d.scaleV
  target.offsetU = d.offsetU
  target.offsetV = d.offsetV
  target.rotationDeg = d.rotationDeg
  target.mappingBlend = d.mappingBlend
  target.seamBandWidth = d.seamBandWidth
  target.capAngle = d.capAngle
  target.topAngleLimit = d.topAngleLimit
  target.bottomAngleLimit = d.bottomAngleLimit
  target.exclusionMode = d.exclusionMode
  target.subdivisionLevels = d.subdivisionLevels
  target.decimationRatio = d.decimationRatio
  target.symmetricDisplacement = d.symmetricDisplacement
}
