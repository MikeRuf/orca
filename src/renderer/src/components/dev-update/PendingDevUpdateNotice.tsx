import { useEffect } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { installPendingDevUpdate, usePendingDevUpdate } from './use-pending-dev-update'

const TOAST_ID = 'pending-dev-update'
const DISMISSED_KEY = 'orca.pendingDevUpdate.dismissedCommit'

/** Lower-right notice that stays until installed or dismissed; a newer build shows it again. */
export function PendingDevUpdateNotice(): null {
  const pending = usePendingDevUpdate()
  useEffect(() => {
    if (!pending || localStorage.getItem(DISMISSED_KEY) === pending.commit) {
      toast.dismiss(TOAST_ID)
      return
    }
    toast(translate('auto.components.devUpdate.noticeTitle', 'Development update ready'), {
      id: TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
      description: translate(
        'auto.components.devUpdate.noticeBody',
        'Your build {{value0}} is ready. Orca restarts to install it; background sessions keep running.',
        { value0: pending.commit.slice(0, 7) }
      ),
      action: {
        label: translate('auto.components.devUpdate.install', 'Install'),
        onClick: installPendingDevUpdate
      },
      onDismiss: () => localStorage.setItem(DISMISSED_KEY, pending.commit)
    })
  }, [pending])
  return null
}
