import { useEffect } from 'react'
import { toast } from 'sonner'
import { translate } from '@/i18n/i18n'
import { usePendingDevUpdate } from './use-pending-dev-update'
import {
  PENDING_DEV_UPDATE_TOAST_ID,
  startPendingDevUpdateInstall
} from './dev-update-install-flow'

const DISMISSED_KEY = 'orca.pendingDevUpdate.dismissedCommit'

/** Lower-right notice that stays until installed or dismissed; a newer build shows it again. */
export function PendingDevUpdateNotice(): null {
  const pending = usePendingDevUpdate()
  // The tray's install item asks the window to run the same chat-aware flow.
  useEffect(
    () => window.api?.app?.onPendingDevUpdateInstallRequested?.(startPendingDevUpdateInstall),
    []
  )
  useEffect(() => {
    if (!pending || localStorage.getItem(DISMISSED_KEY) === pending.commit) {
      toast.dismiss(PENDING_DEV_UPDATE_TOAST_ID)
      return
    }
    toast(translate('auto.components.devUpdate.noticeTitle', 'Development update ready'), {
      id: PENDING_DEV_UPDATE_TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
      description: translate(
        'auto.components.devUpdate.noticeBody',
        'Your build {{value0}} is ready. Orca restarts to install it once no chat on it is mid-reply; background sessions keep running.',
        { value0: pending.commit.slice(0, 7) }
      ),
      action: {
        label: translate('auto.components.devUpdate.install', 'Install'),
        onClick: startPendingDevUpdateInstall
      },
      onDismiss: () => localStorage.setItem(DISMISSED_KEY, pending.commit)
    })
  }, [pending])
  return null
}
