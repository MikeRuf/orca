/** A locally built fork installer waiting beside its build, newer than the running app. */
export type PendingDevUpdate = {
  commit: string
  version: string
  installer: string
  builtAt: string
  /** The unpacked app copied beside the install while Orca ran; after quit it is only swapped in. */
  staged?: string
}

export const PENDING_DEV_UPDATE_CHANGED_CHANNEL = 'devUpdate:changed'
/** Main asks the window to run the install flow (from the tray menu). */
export const PENDING_DEV_UPDATE_INSTALL_REQUESTED_CHANNEL = 'devUpdate:installRequested'
