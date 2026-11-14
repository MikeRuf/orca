# Favorite card icons

Orca shows `<slug>.svg` or `<slug>.png` from this folder on the favorite card whose title matches.
The slug is the favorite's title, lowercased, with each run of characters other than `a-z`,
`0-9`, `_` and `-` replaced by one `-`, and dashes at either end dropped (title
"Japan trip: review" becomes `japan-trip-review`). SVG wins when both exist.

Keyed by title because tab and worktree ids differ on every machine; committing the file
makes the icon appear on every computer after a pull. Keep files square and under 256 KB.
