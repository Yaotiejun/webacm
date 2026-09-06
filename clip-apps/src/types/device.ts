export interface FdmDevice {
  deviceName: string
  mode: 'FDM'
  bedWidth: number
  bedDepth: number
  bedHeight: number
  bedRound: boolean
  bedBelt: boolean
  originCenter: boolean
  maxHeight: number
  gcodeTime: number
  gcodeChange: string[]
  gcodePre: string[]
  gcodePost: string[]
  gcodeProc: string
  gcodeFan: string[]
  gcodeFeature: string[]
  gcodeTrack: string[]
  gcodeLayer: string[]
  gcodeFExt: string
  extruders: Array<{
    extFilament: number
    extNozzle: number
    extOffsetX: number
    extOffsetY: number
  }>
}

export interface DeviceSummary {
  name: string
  mode: 'FDM'
  isLocal: boolean
}
