export interface ControllerSettings {
  animesh: string
  antiAlias: boolean
  assembly: boolean
  autoLayout: boolean
  autoSave: boolean
  dark: boolean
  detail: string
  devel: boolean
  drawer: boolean
  edgeangle: number
  exportOcto: boolean
  exportPreview: boolean
  exportThumb: boolean
  freeLayout: boolean
  healMesh: boolean
  lineType: string
  manifold: boolean
  ortho: boolean
  reverseZoom: boolean
  scrolls: boolean
  shiny: boolean
  showOrigin: boolean
  showRulers: boolean
  showSpeeds: boolean
  spaceLayout: number
  spaceRandoX: boolean
  threaded: boolean
  units: string
  view: string | null
  webGPU: boolean
  zoomSpeed: number
}

export interface AppSettings {
  controller: ControllerSettings
}
