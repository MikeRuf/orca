import { useEffect } from 'react'
import { installLastTabToggle } from '@/lib/last-tab-toggle'

/** Alt+Q jumps back to the last tab in any workspace (tab.toggleLast). */
export function LastTabToggleMount(): null {
  useEffect(() => installLastTabToggle(), [])
  return null
}
