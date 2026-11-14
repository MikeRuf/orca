import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  callMock,
  runtimeClientConstructorMock,
  serveOrcaAppMock,
  getDefaultUserDataPathMock,
  addEnvironmentFromPairingCodeMock,
  listEnvironmentsMock,
  spawnMock
} = vi.hoisted(() => ({
  callMock: vi.fn(),
  runtimeClientConstructorMock: vi.fn(),
  serveOrcaAppMock: vi.fn(),
  getDefaultUserDataPathMock: vi.fn(() => '/tmp/orca-user-data'),
  addEnvironmentFromPairingCodeMock: vi.fn(),
  listEnvironmentsMock: vi.fn(),
  spawnMock: vi.fn()
}))

vi.mock('../runtime/client', async () => {
  const { createRuntimeClientModuleMock } = await import('../index-test-harness.js')
  return createRuntimeClientModuleMock({
    callMock,
    runtimeClientConstructorMock,
    serveOrcaAppMock,
    getDefaultUserDataPathMock
  })
})

vi.mock('../runtime/metadata', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getDefaultUserDataPath: getDefaultUserDataPathMock
}))

vi.mock('../runtime/launch', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  serveOrcaApp: serveOrcaAppMock
}))
vi.mock('../runtime/environments', () => ({
  addEnvironmentFromPairingCode: addEnvironmentFromPairingCodeMock,
  removeEnvironment: vi.fn(),
  resolveEnvironment: vi.fn()
}))

vi.mock('../../shared/remote-runtime/host-store/runtime-environment-store', () => ({
  listEnvironments: listEnvironmentsMock
}))

vi.mock('child_process', async () => {
  const { createChildProcessModuleMock } = await import('../index-test-harness.js')
  return createChildProcessModuleMock(spawnMock)
})

import { main } from '../index'
import { okFixture, queueFixtures } from '../runtime/fixtures/runtime-rpc-fixtures'
import { useWorktreeAwarenessEnvironment } from '../index-test-harness'

describe('orca repo add --kind and --display-name', () => {
  const priorExitCode = process.exitCode
  beforeEach(() => {
    process.exitCode = undefined
  })
  afterEach(() => {
    process.exitCode = priorExitCode
  })

  useWorktreeAwarenessEnvironment({
    callMock,
    serveOrcaAppMock,
    getDefaultUserDataPathMock,
    addEnvironmentFromPairingCodeMock,
    listEnvironmentsMock,
    spawnMock
  })

  it('passes --kind folder and --display-name through to repo.add', async () => {
    queueFixtures(
      callMock,
      okFixture('req_repo_add_folder', {
        repo: { id: 'repo-2', path: '/tmp/projects/h2yo', displayName: 'h2yo', kind: 'folder' }
      })
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(
      [
        'repo',
        'add',
        '--path',
        '/tmp/projects/h2yo',
        '--kind',
        'folder',
        '--display-name',
        'h2yo',
        '--json'
      ],
      '/tmp'
    )

    expect(callMock).toHaveBeenCalledWith('repo.add', {
      path: '/tmp/projects/h2yo',
      kind: 'folder',
      displayName: 'h2yo'
    })
  })

  it('rejects a repo add --kind that is neither git nor folder', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await main(['repo', 'add', '--path', '/tmp/x', '--kind', 'svn', '--json'], '/tmp')
    expect(callMock).not.toHaveBeenCalledWith('repo.add', expect.anything())
  })
})
