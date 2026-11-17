export type ShrunkImage = { bytes: Buffer; mediaType: 'image/jpeg' | 'image/png' }
export type OversizeImageShrinker = (bytes: Buffer, maxBytes: number) => ShrunkImage | null

let shrinker: OversizeImageShrinker | null = null

/** Injected because orcad and the daemon run as plain Node, where importing electron is fatal. */
export function installOversizeImageShrinker(next: OversizeImageShrinker | null): void {
  shrinker = next
}

export function oversizeImageShrinker(): OversizeImageShrinker | null {
  return shrinker
}
