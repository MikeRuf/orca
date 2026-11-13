import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { claudeDispatchMessageContent } from './claude-structured-dispatch-content'
import { installOversizeImageShrinker } from './oversize-image-shrinker'
import { userMessage } from './claude-structured-dispatch-test-support'

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

describe('oversize image dispatch', () => {
  afterEach(() => installOversizeImageShrinker(null))

  it('sends the shrunk bytes with their own media type', async () => {
    let target = 0
    installOversizeImageShrinker((_bytes, maxBytes) => {
      target = maxBytes
      return { bytes: Buffer.from('small'), mediaType: 'image/jpeg' }
    })
    await withImage(6 * 1024 * 1024, async (path) => {
      const content = await claudeDispatchMessageContent(userMessage([{ type: 'image-ref', path }]))
      expect(content[0]).toEqual({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: 'c21hbGw=' }
      })
    })
    expect(target).toBe(3932160)
  })

  it('leaves an image within the cap untouched', async () => {
    installOversizeImageShrinker(() => {
      throw new Error('must not shrink')
    })
    await withImage(4, async (path) => {
      const content = await claudeDispatchMessageContent(userMessage([{ type: 'image-ref', path }]))
      expect(content[0]).toEqual({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: 'AAAAAA==' }
      })
    })
  })

  it('sends the original for Claude to shrink when the shrinker cannot help', async () => {
    installOversizeImageShrinker(() => null)
    await withImage(6 * 1024 * 1024, async (path) => {
      const content = await claudeDispatchMessageContent(userMessage([{ type: 'image-ref', path }]))
      expect(content[0]).toMatchObject({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png' }
      })
      expect((content[0] as { source: { data: string } }).source.data).toHaveLength(8 * 1024 * 1024)
    })
  })
})
