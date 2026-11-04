import { spawn } from 'node:child_process'
import { existsSync, readFileSync, unwatchFile, watchFile } from 'node:fs'
import path from 'node:path'
import { BrowserWindow } from 'electron'
import {
  PENDING_DEV_UPDATE_CHANGED_CHANNEL,
  type PendingDevUpdate
} from '../../shared/pending-dev-update'

// A locally built fork installer (common/win_tools/setup/build-orca-win.ps1) leaves this note
// beside its build; the app offers to install it when the note names a commit it is not running.
const MARKER_POLL_MS = 15_000
const QUIT_WAIT_SECONDS = 300

function markerPath(): string | null {
  const localAppData = process.env.LOCALAPPDATA
  return process.platform === 'win32' && localAppData
    ? path.join(localAppData, 'orca-win-build', 'pending-update.json')
    : null
}

function runningCommit(): string {
  return typeof ORCA_BUILD_COMMIT === 'string' ? ORCA_BUILD_COMMIT.toLowerCase() : ''
}

export function readPendingDevUpdate(): PendingDevUpdate | null {
  const file = markerPath()
  if (!file || !existsSync(file)) {
    return null
  }
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
    const commit = typeof raw.commit === 'string' ? raw.commit.trim().toLowerCase() : ''
    const installer = typeof raw.installer === 'string' ? raw.installer : ''
    if (!/^[0-9a-f]{7,40}$/.test(commit) || !installer.toLowerCase().endsWith('.exe')) {
      return null
    }
    if (!existsSync(installer)) {
      return null
    }
    const running = runningCommit()
    // An unknown running commit cannot be compared; offering an install then could loop forever.
    if (!/^[0-9a-f]{7,40}$/.test(running) || /^0+$/.test(running)) {
      return null
    }
    if (running.startsWith(commit) || commit.startsWith(running)) {
      return null
    }
    return {
      commit,
      installer,
      version: typeof raw.version === 'string' ? raw.version : '',
      builtAt: typeof raw.builtAt === 'string' ? raw.builtAt : ''
    }
  } catch {
    return null
  }
}

function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Starts a hidden helper that waits for this process to exit, installs silently and reopens
 * Orca. The caller quits afterward; false means nothing was started and Orca must not quit.
 */
export function launchPendingDevUpdateInstall(): boolean {
  const pending = readPendingDevUpdate()
  if (!pending) {
    return false
  }
  const installDir = path.dirname(process.execPath)
  const log = path.join(path.dirname(markerPath() ?? pending.installer), 'install.log')
  const script = [
    `$log = ${quotePowerShell(log)}`,
    `"$(Get-Date -Format s) waiting for Orca (pid ${process.pid}) to quit" | Out-File $log -Append`,
    `Wait-Process -Id ${process.pid} -Timeout ${QUIT_WAIT_SECONDS} -ErrorAction SilentlyContinue`,
    `if (Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue) { "Orca did not quit; nothing installed" | Out-File $log -Append; exit 1 }`,
    // The crash reporter outlives the app and locks the install folder.
    `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'Orca.exe' -and $_.CommandLine -match '--type=crashpad-handler' -and $_.ExecutablePath -like (${quotePowerShell(installDir)} + '\\*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }`,
    `$p = Start-Process -FilePath ${quotePowerShell(pending.installer)} -ArgumentList '/S' -PassThru -Wait`,
    `"$(Get-Date -Format s) installer exit $($p.ExitCode) for ${pending.commit}" | Out-File $log -Append`,
    `Start-Process -FilePath ${quotePowerShell(process.execPath)}`
  ].join('\n')
  const powershell = path.join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  )
  try {
    const child = spawn(
      powershell,
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-WindowStyle',
        'Hidden',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64')
      ],
      { detached: true, stdio: 'ignore', windowsHide: true }
    )
    child.unref()
    return true
  } catch {
    return false
  }
}

let lastAnnounced: string | null | undefined
let watching = false

/** Re-reads the note on change and tells every window and the tray menu. */
export function startPendingDevUpdateWatch(onChange: () => void): () => void {
  const file = markerPath()
  if (!file || watching) {
    return () => {}
  }
  watching = true
  const check = (): void => {
    const pending = readPendingDevUpdate()
    const key = pending?.commit ?? null
    if (key === lastAnnounced) {
      return
    }
    lastAnnounced = key
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send(PENDING_DEV_UPDATE_CHANGED_CHANNEL, pending)
      }
    }
    onChange()
  }
  watchFile(file, { interval: MARKER_POLL_MS }, check)
  check()
  return () => {
    unwatchFile(file)
    watching = false
  }
}
