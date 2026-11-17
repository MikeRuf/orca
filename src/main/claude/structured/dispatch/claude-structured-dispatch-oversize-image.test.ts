import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readSendableImage } from './claude-structured-dispatch-content'
import { installOversizeImageShrinker } from './oversize-image-shrinker'

async function withImage(bytes: number, run: (path: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'orca-oversize-image-'))
  try {
    const path = join(directory, 'photo.png')
    await writeFile(path, Buffer.alloc(bytes))
    await run(path)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

describe('readSendableImage', () => {
  afterEach(() => installOversizeImageShrinker(null))

  it('sends a 6 MB image untouched to a receiver that shrinks images itself', async () => {
    installOversizeImageShrinker(() => {
      throw new Error('must not shrink')
    })
    await withImage(6 * 1024 * 1024, async (path) => {
      const image = await readSendableImage(path)
      expect(image.bytes.byteLength).toBe(6 * 1024 * 1024)
      expect(image.shrunkMediaType).toBeUndefined()
    })
  })

  it("shrinks an image over the receiver's cap to that cap", async () => {
    let target = 0
    installOversizeImageShrinker((_bytes, maxBytes) => {
      target = maxBytes
      return { bytes: Buffer.from('small'), mediaType: 'image/jpeg' }
    })
    await withImage(5000, async (path) => {
      const image = await readSendableImage(path, 4000)
      expect(image).toEqual({ bytes: Buffer.from('small'), shrunkMediaType: 'image/jpeg' })
    })
    expect(target).toBe(4000)
  })

  it("refuses an image over the receiver's cap when it cannot be shrunk", async () => {
    installOversizeImageShrinker(() => null)
    await withImage(5000, async (path) => {
      await expect(readSendableImage(path, 4000)).rejects.toThrow('no larger than 4000 bytes')
    })
  })
})
