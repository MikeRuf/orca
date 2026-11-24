import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { PendingDevUpdate } from '../../../../shared/pending-dev-update'
import { translate } from '@/i18n/i18n'

/** The locally built Orca waiting to be installed (Windows desktop only), or null. */
export function usePendingDevUpdate(): PendingDevUpdate | null {
  const [pending, setPending] = useState<PendingDevUpdate | null>(null)
  useEffect(() => {
    const api = window.api?.app
    if (!api?.getPendingDevUpdate) {
      return undefined
    }
    let alive = true
    void api
      .getPendingDevUpdate()
      .then((value) => alive && setPending(value))
      .catch(() => undefined)
    const off = api.onPendingDevUpdateChanged((value) => setPending(value))
    return () => {
      alive = false
      off()
    }
  }, [])
  return pending
}

export function installPendingDevUpdate(): void {
  void window.api.app.installPendingDevUpdate().catch((error: unknown) => {
    toast.error(
      translate(
        'auto.components.devUpdate.installFailed',
        'Could not start the update: {{value0}}',
        {
          value0: error instanceof Error ? error.message : String(error)
        }
      )
    )
  })
}

export function pendingDevUpdateLabel(pending: PendingDevUpdate): string {
  return translate(
    'auto.components.devUpdate.menuLabel',
    'Install Pending Development Update ({{value0}})',
    { value0: pending.commit.slice(0, 7) }
  )
}
