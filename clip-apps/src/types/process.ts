export interface FdmProcess {
  processName: string

  // temps
  outputTemp: number
  outputBedTemp: number
  firstLayerNozzleTemp: number
  firstLayerBedTemp: number

  // speeds
  outputFeedrate: number
  outputSeekrate: number
  firstLayerRate: number

  // layers
  sliceHeight: number
  firstSliceHeight: number
  sliceTopLayers: number
  sliceBottomLayers: number
  sliceShells: number
  sliceLineWidth: number
  sliceAdaptive?: boolean
  sliceMinHeight?: number

  // infill
  sliceFillSparse: number
  sliceFillType: 'none' | 'grid' | 'linear' | 'hex'
  sliceFillOverlap: number

  // support (minimal subset)
  sliceSupportEnable: boolean
  sliceSupportDensity: number
  sliceSupportOffset: number
  sliceSupportSize: number
  sliceSupportAngle: number
  // advanced support
  sliceSupportZGap?: number
  sliceSupportXYExpand?: number
  sliceSupportInterfaceLayers?: number
  sliceSupportOutlineOnly?: boolean

  // brim / raft
  enableBrim?: boolean
  brimCount?: number
  brimOffset?: number
  enableRaft?: boolean
  raftSpacing?: number

  // walls / thin / compensation
  sliceDetectThin?: number
  sliceCompInner?: number
  sliceCompOuter?: number

  // extrusion multipliers
  outputShellMult?: number
  outputFillMult?: number
  outputSparseMult?: number

  // retract
  outputRetractDist: number
  outputRetractSpeed: number

  // cooling
  outputFanSpeed: number
  outputFanLayer: number

  // misc
  outputMinLayerTime: number
  zHopDistance: number

  // ranges (layer overrides)
  ranges?: FdmProcessRange[]
}

export interface FdmProcessRange {
  fromLayer: number
  toLayer: number
  sliceHeight?: number
  outputTemp?: number
  outputFeedrate?: number
  outputFanSpeed?: number
  outputRetractDist?: number
}

export interface ProcessSummary {
  name: string
  mode: 'FDM'
  isLocal: boolean
}
