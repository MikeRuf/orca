import { describe, expect, it } from 'vitest'
import { sanitizeRepoSidebarStyle } from './repo-sidebar-style'

describe('sanitizeRepoSidebarStyle', () => {
  it('keeps valid surfaces and normalizes colors and sizes', () => {
    expect(
      sanitizeRepoSidebarStyle({
        header: { background: '#ABC', textColor: '#112233', fontFamily: ' Georgia ', fontSize: 40 },
        rows: { fontSize: 11.6 }
      })
    ).toEqual({
      header: { background: '#aabbcc', textColor: '#112233', fontFamily: 'Georgia', fontSize: 24 },
      rows: { fontSize: 12 }
    })
  })

  it('drops font families that could escape the inline style', () => {
    expect(
      sanitizeRepoSidebarStyle({ header: { fontFamily: 'Arial; background: url(x)' } })
    ).toBeNull()
    expect(sanitizeRepoSidebarStyle({ header: { fontFamily: 'a}b' } })).toBeNull()
  })

  it('treats null as a clear and malformed input as absent', () => {
    expect(sanitizeRepoSidebarStyle(null)).toBeNull()
    expect(sanitizeRepoSidebarStyle('red')).toBeUndefined()
    expect(sanitizeRepoSidebarStyle({ header: { background: 'red' } })).toBeNull()
  })
})
