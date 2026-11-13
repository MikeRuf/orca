import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { joinPath } from '@/lib/path'
import { buildWorkspaceFileContext } from '@/runtime/files/workspace-file-host-routing'
import { readRuntimeFileContent } from '@/runtime/files/reads/runtime-file-read-client'
import type { TabShortcut } from '@/lib/tab-shortcuts-store'

// Contract documented in .orca/favorite-icons/README.md; external agents write files there.
const ICON_DIR = '.orca/favorite-icons'
const MAX_ICON_CHARS = 350_000
// A fresh read now and then lets an icon an agent just committed appear without a restart.
const CACHE_MS = 60_000

export function favoriteIconSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const cache = new Map<string, { at: number; url: Promise<string | null> }>()

async function readIcon(worktreeId: string, worktreePath: string, slug: string) {
  const context = buildWorkspaceFileContext(worktreeId, worktreePath)
  for (const ext of ['svg', 'png'] as const) {
    const relativePath = `${ICON_DIR}/${slug}.${ext}`
    try {
      const file = await readRuntimeFileContent({
        target: context.target,
        worktreeId,
        connectionId: context.connectionId,
        filePath: joinPath(worktreePath, relativePath),
        relativePath
      })
      if (file.content.length > MAX_ICON_CHARS) {
        continue
      }
      if (ext === 'svg' && !file.isBinary) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(file.content)}`
      }
      if (ext === 'png' && file.isBinary && file.content) {
        return `data:image/png;base64,${file.content}`
      }
    } catch {
      // Missing is the common case: most favorites have no icon.
    }
  }
  return null
}

function loadIcon(worktreeId: string, worktreePath: string, slug: string): Promise<string | null> {
  const key = `${worktreeId}\u0000${slug}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.url
  }
  const url = readIcon(worktreeId, worktreePath, slug)
  cache.set(key, { at: Date.now(), url })
  return url
}

/** The favorite's own picture from its project, or nothing when the project has none. */
export function FavoriteTabIcon({ shown }: { shown: TabShortcut }): React.JSX.Element | null {
  const worktreePath = useAppStore(
    (state) => state.getKnownWorktreeById(shown.worktreeId)?.path ?? ''
  )
  const slug = favoriteIconSlug(shown.title)
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!worktreePath || !slug) {
      setUrl(null)
      return
    }
    let current = true
    void loadIcon(shown.worktreeId, worktreePath, slug).then((next) => {
      if (current) {
        setUrl(next)
      }
    })
    return () => {
      current = false
    }
  }, [shown.worktreeId, worktreePath, slug])
  if (!url) {
    return null
  }
  return (
    <img src={url} alt="" aria-hidden className="size-3.5 shrink-0 self-center object-contain" />
  )
}
