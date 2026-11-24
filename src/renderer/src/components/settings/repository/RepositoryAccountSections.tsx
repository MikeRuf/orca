import type { ComponentProps } from 'react'
import { RepositoryClaudeAccountSection } from './RepositoryClaudeAccountSection'
import { RepositoryGitHubAccountSection } from './source-control/RepositoryGitHubAccountSection'

export function RepositoryAccountSections(
  props: ComponentProps<typeof RepositoryGitHubAccountSection> &
    ComponentProps<typeof RepositoryClaudeAccountSection>
): React.JSX.Element {
  return (
    <>
      <RepositoryGitHubAccountSection {...props} />
      <RepositoryClaudeAccountSection {...props} />
    </>
  )
}
