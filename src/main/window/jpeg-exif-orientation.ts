const ORIENTATION_TAG = 0x0112

/** The EXIF orientation (1 to 8) of a JPEG, or 1 when it has none. */
export function readJpegExifOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) {
    return 1
  }
  let offset = 2
  while (offset + 4 <= bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1]
    const length = view.getUint16(offset + 2)
    if (marker === 0xda) {
      return 1
    }
    if (
      marker === 0xe1 &&
      Buffer.from(bytes.subarray(offset + 4, offset + 10)).toString('latin1') === 'Exif\0\0'
    ) {
      return readTiffOrientation(view, offset + 10, offset + 2 + length)
    }
    offset += 2 + length
  }
  return 1
}

function readTiffOrientation(view: DataView, tiff: number, end: number): number {
  if (tiff + 8 > end || end > view.byteLength) {
    return 1
  }
  const littleEndian = view.getUint16(tiff) === 0x4949
  const directory = tiff + view.getUint32(tiff + 4, littleEndian)
  if (directory + 2 > end) {
    return 1
  }
  const entries = view.getUint16(directory, littleEndian)
  for (let index = 0; index < entries; index += 1) {
    const entry = directory + 2 + index * 12
    if (entry + 12 > end) {
      return 1
    }
    if (view.getUint16(entry, littleEndian) === ORIENTATION_TAG) {
      const value = view.getUint16(entry + 8, littleEndian)
      return value >= 1 && value <= 8 ? value : 1
    }
  }
  return 1
}

export type OrientedPixels = { pixels: Uint32Array; width: number; height: number }

/** Bakes an EXIF orientation into row-major 32-bit pixels. */
export function applyExifOrientation(
  source: Uint32Array,
  width: number,
  height: number,
  orientation: number
): OrientedPixels {
  const swapsAxes = orientation >= 5
  const outWidth = swapsAxes ? height : width
  const outHeight = swapsAxes ? width : height
  const pixels = new Uint32Array(source.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [outX, outY] = orientedPosition(x, y, width, height, orientation)
      pixels[outY * outWidth + outX] = source[y * width + x]
    }
  }
  return { pixels, width: outWidth, height: outHeight }
}

function orientedPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: number
): [number, number] {
  switch (orientation) {
    case 2:
      return [width - 1 - x, y]
    case 3:
      return [width - 1 - x, height - 1 - y]
    case 4:
      return [x, height - 1 - y]
    case 5:
      return [y, x]
    case 6:
      return [height - 1 - y, x]
    case 7:
      return [height - 1 - y, width - 1 - x]
    case 8:
      return [y, width - 1 - x]
    default:
      return [x, y]
  }
}
