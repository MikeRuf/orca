import { useRef } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { moveFavoriteTab, tabShortcutKey, type TabShortcut } from '@/lib/tab-shortcuts-store'
import { cn } from '@/lib/class-names'

// A short travel before a drag starts keeps a plain click opening the tab.
const pointerOptions = { activationConstraint: { distance: 4 } }

function SortableFavorite({
  id,
  children,
  draggedAt
}: {
  id: string
  children: React.ReactNode
  draggedAt: React.RefObject<number>
}): React.JSX.Element {
  const sortable = useSortable({ id })
  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition
      }}
      className={cn('relative', sortable.isDragging && 'z-10 opacity-80')}
      {...sortable.listeners}
      // The drop lands with the pointer over a row, whose click would otherwise open that tab.
      onClickCapture={(event) => {
        if (Date.now() - draggedAt.current < 250) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
    >
      {children}
    </div>
  )
}

/** Favorites in their saved order; press, hold and drag a row to move it. */
export function FavoriteTabsSortableList({
  rows,
  renderRow
}: {
  rows: TabShortcut[]
  renderRow: (row: TabShortcut) => React.ReactNode
}): React.JSX.Element {
  const sensors = useSensors(useSensor(PointerSensor, pointerOptions))
  const draggedAt = useRef(0)
  const ids = rows.map(tabShortcutKey)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        draggedAt.current = Date.now()
        if (over && active.id !== over.id) {
          moveFavoriteTab(String(active.id), String(over.id))
        }
      }}
      onDragCancel={() => {
        draggedAt.current = Date.now()
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {rows.map((row, index) => (
          <SortableFavorite key={ids[index]} id={ids[index]} draggedAt={draggedAt}>
            {renderRow(row)}
          </SortableFavorite>
        ))}
      </SortableContext>
    </DndContext>
  )
}
