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

## 2026-09-10 — App skeleton → working app
- GitHub push was blocked (403 from both the git proxy and the GitHub integration) until the user fixed permissions; pushes work now.
- **Data**: adopted [chords-db](https://github.com/tombatossals/chords-db) (MIT) guitar voicings — 12 roots × ~44 types, 2,054 voicings with finger numbers, barres and base frets. Converted to a compact `data/chords.js` (113 KB, loaded as a plain script so it works from `file://` and inside the service-worker cache). Dropped the obscure `alt` and `7sg` suffixes. Added power chords (`5`) generated for E-, A- and D-string roots since the library lacked them.
- **Theory** (`js/theory.js`): type metadata (intervals, formulas, search aliases, browse groups), note spelling (flats for F/Bb/Eb/Ab keys), voicing → MIDI, tags (Open/Barre/Stretch/Easy/nth fret), and a reverse chord identifier used by the Finder.
- **Diagrams** (`js/diagram.js`): SVG renderer with nut/base-fret label, barres, X/O markers, finger or note labels, note names under the diagram (root highlighted), left-handed mirroring, small variant for cards.
- **Audio** (`js/audio.js`): Karplus–Strong plucked string synth rendered into AudioBuffers (cached per pitch), strum / arpeggio, and a sequencer for progressions. No samples to download.
- **App** (`js/app.js`): hash router (`#/chord/C/m7/2` is shareable), home (root grid, starter chords, browse by type), root page, type page, search (handles "Am7", "F sharp minor", "C/G", "power chord", enharmonics), chord detail (swipe carousel of voicings, dots, thumbnails, notes/formula, play, favourite, share, add to progression, related chords, JustinGuitar video card), Finder (tap a fretboard → chord names), Progression (add/remove chords, transpose, tempo, play-through, presets), Saved, Settings (theme, left-handed, dot labels, sound, install, reset, attribution).
- **PWA**: manifest + icons (PNG rendered from the SVG with headless Chromium), service worker with precached shell, network-first HTML and stale-while-revalidate for assets; install banner (Android prompt / iOS instructions).
- Tested with Playwright at iPhone size (390×844) in light and dark; fixed: finder tap targets overlapped by string labels, oversized SVG icons in banner/results, chord-type ordering (numeric object keys sort first in JS, so an explicit `TYPE_ORDER` was needed), and a search bug where the "M" alias for major collided with "m" for minor.
- Image generation: decided against gpt-image-2 for now — SVG diagrams/icons are crisper, themeable and offline-friendly. May revisit for decorative art if time allows.
- **Videos**: research script scraped YouTube search results for "justinguitar <chord>" (192 chord queries + ~30 family queries), then verifies each candidate's channel via YouTube's oEmbed endpoint so only genuine JustinGuitar videos are used. Shorts are preferred over full lessons when both exist. Results land in `data/videos.js` (next commit).
