import type * as THREE from 'three'

let machineRoot: THREE.Group | null = null

export function registerCarveraMachineModel(root: THREE.Group | null) {
  machineRoot = root
}

export function setCarveraFourthFixtureVisible(visible: boolean) {
  const fourth = machineRoot?.getObjectByName('fourth')
  if (fourth) fourth.visible = visible
}

export function getCarveraMachineModelRegistered(): boolean {
  return machineRoot != null
}
