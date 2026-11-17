import { useCallback, useState } from 'react'

const STORAGE_KEY = 'orca.nativeChat.processList.size'
const MIN = { width: 320, height: 160 }
const DEFAULT = { width: 640, height: 420 }

type Size = { width: number; height: number }

function clamp(size: Size): Size {
  return {
    width: Math.round(Math.max(MIN.width, Math.min(size.width, window.innerWidth - 32))),
    height: Math.round(Math.max(MIN.height, Math.min(size.height, window.innerHeight - 96)))
  }
}

function readSaved(): Size {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Size | null
    if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)) {
      return clamp(saved)
    }
  } catch {}
  return clamp(DEFAULT)
}

/**
 * The list opens above its button, right edge and bottom pinned, so it grows from the top-left
 * corner; a native CSS resize handle sits bottom-right, where the popover can't grow.
 */
export function useProcessListSize(): {
  size: Size
  startResize: (event: React.PointerEvent<HTMLElement>) => void
} {
  const [size, setSize] = useState(readSaved)
  const startResize = useCallback(
    (event: React.PointerEvent<HTMLElement>): void => {
      event.preventDefault()
      const handle = event.currentTarget
      handle.setPointerCapture(event.pointerId)
      const start = { x: event.clientX, y: event.clientY, ...size }
      let latest = size
      const onMove = (move: PointerEvent): void => {
        latest = clamp({
          width: start.width + (start.x - move.clientX),
          height: start.height + (start.y - move.clientY)
        })
        setSize(latest)
      }
      const onUp = (): void => {
        handle.removeEventListener('pointermove', onMove)
        handle.removeEventListener('pointerup', onUp)
        handle.removeEventListener('pointercancel', onUp)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(latest))
        } catch {}
      }
      handle.addEventListener('pointermove', onMove)
      handle.addEventListener('pointerup', onUp)
      handle.addEventListener('pointercancel', onUp)
    },
    [size]
  )
  return { size, startResize }
}
