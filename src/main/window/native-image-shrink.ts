import { nativeImage, type NativeImage } from 'electron'
import type { ShrunkImage } from '../claude/structured/oversize-image-shrinker'
import { readRasterImageDimensions } from '../../shared/file-preview/raster-image-dimensions'
import { applyExifOrientation, readJpegExifOrientation } from './jpeg-exif-orientation'

// Why: the API downscales past this edge anyway, so a larger send only costs bytes.
const FIRST_LONG_EDGE = 2576
const FALLBACK_LONG_EDGE = 1568
const JPEG_QUALITIES = [85, 70]
// Why: decoding is uncapped and a crash here ends every chat; this admits 108 MP phone photos.
const MAX_DECODED_PIXELS = 120_000_000

function fitLongEdge(image: NativeImage, longEdge: number): NativeImage {
  const { width, height } = image.getSize()
  if (Math.max(width, height) <= longEdge) {
    return image
  }
  return image.resize({
    ...(width >= height ? { width: longEdge } : { height: longEdge }),
    quality: 'best'
  })
}

// Why: nativeImage ignores EXIF and its encoders drop it, so a portrait phone photo would turn sideways.
function bakeOrientation(image: NativeImage, orientation: number): NativeImage {
  if (orientation === 1) {
    return image
  }
  const { width, height } = image.getSize()
  const bitmap = image.toBitmap()
  const source = new Uint32Array(bitmap.buffer, bitmap.byteOffset, width * height)
  const oriented = applyExifOrientation(source, width, height, orientation)
  return nativeImage.createFromBitmap(Buffer.from(oriented.pixels.buffer), {
    width: oriented.width,
    height: oriented.height
  })
}

export function shrinkImageWithNativeImage(bytes: Buffer, maxBytes: number): ShrunkImage | null {
  const dimensions = readRasterImageDimensions(bytes)
  if (!dimensions || dimensions.width * dimensions.height > MAX_DECODED_PIXELS) {
    return null
  }
  const decoded = nativeImage.createFromBuffer(bytes)
  if (decoded.isEmpty()) {
    return null
  }
  const first = bakeOrientation(
    fitLongEdge(decoded, FIRST_LONG_EDGE),
    readJpegExifOrientation(bytes)
  )
  if (bytes[0] === 0x89) {
    const png = first.toPNG()
    if (png.byteLength <= maxBytes) {
      return { bytes: png, mediaType: 'image/png' }
    }
  }
  for (const image of [first, fitLongEdge(first, FALLBACK_LONG_EDGE)]) {
    for (const quality of JPEG_QUALITIES) {
      const jpeg = image.toJPEG(quality)
      if (jpeg.byteLength <= maxBytes) {
        return { bytes: jpeg, mediaType: 'image/jpeg' }
      }
    }
  }
  return null
}
