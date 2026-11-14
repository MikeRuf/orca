import { spawnSync } from 'node:child_process'
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
      builtAt: typeof raw.builtAt === 'string' ? raw.builtAt : '',
      staged: stagedAppFor(raw.staged, commit)
    }
  } catch {
    return null
  }
}

// The build writes the stamp last, so a half-copied or older staging is never swapped in.
const STAGED_STAMP = '.orca-staged-commit'

function stagedAppFor(value: unknown, commit: string): string | undefined {
  if (typeof value !== 'string' || !value) {
    return undefined
  }
  // A rename only stays atomic within one folder, so staging must sit beside the install.
  if (
    path.dirname(value).toLowerCase() !== path.dirname(path.dirname(process.execPath)).toLowerCase()
  ) {
    return undefined
  }
  try {
    const stamp = readFileSync(path.join(value, STAGED_STAMP), 'utf8').trim().toLowerCase()
    return stamp === commit && existsSync(path.join(value, path.basename(process.execPath)))
      ? value
      : undefined
  } catch {
    return undefined
  }
}

function quotePowerShell(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * Swaps the staged app in by renaming folders, which takes seconds where the installer takes a
 * minute; any failure puts the old folder back and leaves $swapped false for the installer.
 */
function stagedSwapScript(installDir: string, staged: string, commit: string): string[] {
  const dir = quotePowerShell(installDir)
  return [
    `$swapped = $false`,
    `$old = ${quotePowerShell(`${installDir}.old`)}`,
    `try {`,
    `  if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Recurse -Force -ErrorAction Stop }`,
    `  Copy-Item -LiteralPath (Join-Path ${dir} 'Uninstall Orca.exe') -Destination ${quotePowerShell(staged)} -ErrorAction SilentlyContinue`,
    // Defender or the indexer can hold a file for a moment after Orca exits.
    `  $moved = $false`,
    `  for ($i = 0; $i -lt 5 -and -not $moved; $i++) { try { [IO.Directory]::Move(${dir}, $old); $moved = $true } catch { Start-Sleep -Seconds 1 } }`,
    `  if (-not $moved) { throw "install folder is in use" }`,
    `  try { [IO.Directory]::Move(${quotePowerShell(staged)}, ${dir}) } catch { [IO.Directory]::Move($old, ${dir}); throw }`,
    `  $swapped = $true`,
    `  "$(Get-Date -Format s) swapped in staged ${commit}" | Out-File $log -Append`,
    `} catch { "$(Get-Date -Format s) staged swap failed ($_); running the installer" | Out-File $log -Append }`
  ]
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
    ...(pending.staged ? stagedSwapScript(installDir, pending.staged, pending.commit) : []),
    `if (-not $swapped) {`,
    `  $p = Start-Process -FilePath ${quotePowerShell(pending.installer)} -ArgumentList '/S' -PassThru -Wait`,
    `  "$(Get-Date -Format s) installer exit $($p.ExitCode) for ${pending.commit}" | Out-File $log -Append`,
    `}`,
    `Start-Process -FilePath ${quotePowerShell(process.execPath)}`,
    `if ($swapped) { Remove-Item -LiteralPath $old -Recurse -Force -ErrorAction SilentlyContinue }`
  ].join('\n')
  const powershell = path.join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  )
  const helper = `"${powershell}" -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${Buffer.from(
    script,
    'utf16le'
  ).toString('base64')}`
  // Orca runs inside a Windows job that kills its children when it exits, "detached" ones
  // included (seen 2026-11-04: Orca quit, the helper died before its first log line). WMI creates
  // the helper from its own service, outside that job; ShowWindow 0 keeps its console hidden.
  const create = [
    '$si = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }',
    `$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = ${quotePowerShell(helper)}; ProcessStartupInformation = $si }`,
    'exit [int]$r.ReturnValue'
  ].join('; ')
  try {
    const result = spawnSync(
      powershell,
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', create],
      { windowsHide: true, timeout: 30_000 }
    )
    // Quit only once the helper exists: WMI answers 0 for a created process.
    return result.status === 0
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
