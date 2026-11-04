/** A locally built fork installer waiting beside its build, newer than the running app. */
export type PendingDevUpdate = {
  commit: string
  version: string
  installer: string
  builtAt: string
}

export const PENDING_DEV_UPDATE_CHANGED_CHANNEL = 'devUpdate:changed'
