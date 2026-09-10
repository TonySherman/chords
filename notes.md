# Chordbook — build notes

Working log for the guitar chord chart PWA. Newest entries at the bottom.

## 2026-09-10 — Kickoff
- Repo was empty. Branch `claude/nice-hawking-nbj80u`.
- Decisions so far:
  - Plain static site (no build step required at runtime). `index.html` at the repo root loads everything.
  - Chord diagrams will be rendered as inline SVG from data (crisp at any DPI, themeable, tiny). No raster images for diagrams.
  - Visual language: dark, warm "wood & brass" palette (amber accent), Fraunces for display type, Inter for UI.
  - App name: **Chordbook**.
- Pushed a title screen first so the preview URL shows something immediately.
