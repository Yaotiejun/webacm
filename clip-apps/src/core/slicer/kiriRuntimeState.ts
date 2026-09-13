export interface KiriRuntimeState {
  ready: boolean
  initError: Error | null
  initPromise: Promise<void> | null
  fdmSliceImpl: any | null
  fdmPrepareImpl: any | null
  fdmExportImpl: any | null
  fakeDeviceProfile: any | null
  fakeControllerProfile: any | null
  legacySliceRunning: boolean
  /** Dynamic import of FDM legacy stack failed (`auto` mode); same thread as slicer worker (or tests). */
  lastLegacyFdmImportError: string | null
}

const state: KiriRuntimeState = {
  ready: false,
  initError: null,
  initPromise: null,
  fdmSliceImpl: null,
  fdmPrepareImpl: null,
  fdmExportImpl: null,
  fakeDeviceProfile: null,
  fakeControllerProfile: null,
  legacySliceRunning: false,
  lastLegacyFdmImportError: null,
}

export function getKiriRuntimeState(): KiriRuntimeState {
  return state
}

export function clearLegacyImplBindings(): void {
  state.fdmSliceImpl = null
  state.fdmPrepareImpl = null
  state.fdmExportImpl = null
  state.fakeDeviceProfile = null
  state.fakeControllerProfile = null
}

export function bindLegacyImpl(input: {
  fdmSliceImpl: any
  fdmPrepareImpl?: any
  fdmExportImpl?: any
  fakeDeviceProfile: any
  fakeControllerProfile: any
}): void {
  state.fdmSliceImpl = input.fdmSliceImpl
  state.fdmPrepareImpl = input.fdmPrepareImpl ?? null
  state.fdmExportImpl = input.fdmExportImpl ?? null
  state.fakeDeviceProfile = input.fakeDeviceProfile
  state.fakeControllerProfile = input.fakeControllerProfile
  state.lastLegacyFdmImportError = null
}

export async function runWithLegacySliceGuard<T>(run: () => Promise<T>): Promise<T> {
  if (state.legacySliceRunning) {
    throw new Error('legacy slice already running')
  }
  state.legacySliceRunning = true
  try {
    return await run()
  } finally {
    state.legacySliceRunning = false
  }
}
