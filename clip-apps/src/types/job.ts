export interface Transform {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
}

export interface SceneModelPayload {
  id: string
  name: string
  ext: string
  transform: Transform
  bbox: {
    size: { x: number; y: number; z: number }
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
}

export interface SliceJobPayload {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  mode: 'FDM'
  device: string
  process: string
  material: string
  models: SceneModelPayload[]
  jobBounds?: {
    size: { x: number; y: number; z: number }
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
}
