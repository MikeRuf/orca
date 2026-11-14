import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'

/** Viewport x of the sidebar's right edge when the dialog opened; the dialog sits just past it. */
export type SidebarAppearanceDialogAnchor = { sidebarRight: number }

const SIDEBAR_GAP_PX = 12
const TOP_PX = 48

export function SidebarAppearanceDialog({
  open,
  onOpenChange,
  anchor,
  title,
  description,
  children
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchor: SidebarAppearanceDialogAnchor | null
  title: string
  description: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Clear overlay, and a place right beside the sidebar, keep the rows in view so each change previews live.
        overlayClassName="bg-transparent"
        scrollable
        className="sm:max-w-[560px]"
        style={
          anchor
            ? {
                left: anchor.sidebarRight + SIDEBAR_GAP_PX,
                top: TOP_PX,
                translate: 'none',
                transform: 'none',
                maxHeight: `calc(100vh - ${TOP_PX + 16}px)`
              }
            : undefined
        }
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
