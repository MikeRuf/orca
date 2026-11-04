/** What a runtime was built from: shown in the status bar for the app and each connected server. */
export type RuntimeBuildInfo = {
  version: string
  /** Full commit the build was made from; empty when unknown. */
  commit: string
  /** ISO time the build was made; empty when unknown. */
  builtAt: string
  /** Set by a fork or branch build script (e.g. "mike@1dccaca"); null for official builds. */
  devRef: string | null
}
