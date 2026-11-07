/** Names a fork or branch build (e.g. "mike@1dccaca"); null for official builds. */
export const DEV_RELEASE_REF: string | null =
  typeof ORCA_DEV_RELEASE_REF === 'string' && ORCA_DEV_RELEASE_REF ? ORCA_DEV_RELEASE_REF : null
