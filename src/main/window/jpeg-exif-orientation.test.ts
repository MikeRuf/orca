import { describe, expect, it } from 'vitest'
import { applyExifOrientation, readJpegExifOrientation } from './jpeg-exif-orientation'

describe('readJpegExifOrientation', () => {
  it('reads the tag from a big-endian APP1 segment', () => {
    const exif = [0x45, 0x78, 0x69, 0x66, 0, 0]
    const tiff = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0]
    const length = 2 + exif.length + tiff.length
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0, length, ...exif, ...tiff, 0xff, 0xda])
    expect(readJpegExifOrientation(jpeg)).toBe(6)
  })

  it('treats a JPEG without EXIF as upright', () => {
    expect(readJpegExifOrientation(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1)
  })
})

describe('applyExifOrientation', () => {
  // 1 2 3
  // 4 5 6
  const source = Uint32Array.from([1, 2, 3, 4, 5, 6])

  it.each([
    [3, 3, [6, 5, 4, 3, 2, 1]],
    [6, 2, [4, 1, 5, 2, 6, 3]],
    [8, 2, [3, 6, 2, 5, 1, 4]]
  ])('orientation %i', (orientation, width, pixels) => {
    const result = applyExifOrientation(source, 3, 2, orientation)
    expect(result.width).toBe(width)
    expect([...result.pixels]).toEqual(pixels)
  })
})
