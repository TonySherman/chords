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

## 2026-09-10 — Videos, capo helper, hero art
- **Video verification**: the first pass only checked the top 6 candidates per chord and mis-credited slash-chord Shorts ("D/A", "G/F#") to plain A and F# major. Fixed the title matcher to reject a root preceded/followed by "/" and ran a second pass that oEmbed-verifies *every* Short whose title looks like a chord lesson (728 videos). Only ids whose oEmbed `author_name` is "JustinGuitar" are used.
- Result: ~35 chord-specific JustinGuitar videos (almost all Shorts) plus hand-curated full lessons where no Short exists (Fmaj7, G7/C7/B7, sus chords, Dm, A, Em, …) and per-type fallbacks (barre chords for non-open majors/minors, 7th grips, jazz extensions, altered chords, slash chords, power chords, CAGED as the last resort). The card labels which level applies ("This chord" vs "Related lesson").
- **Capo helper** on the chord page: pick a capo fret and see which easier shape produces the chord, and what the current shape sounds like with that capo.
- **Keyboard**: ← → switch voicings, space strums (desktop nicety).
- **Image generation**: used gpt-image-2 once for a decorative sunburst acoustic guitar on the home hero (transparent WebP, downscaled in Chromium to 640px / 42 KB). Everything functional stays SVG.
- README added. Service-worker cache bumped to `cb-v2` so installed copies refresh.

## 2026-09-10 — Piano mode (branch `claude/piano-mode`, off `main`)
- `main` already contained the whole guitar app (it was created from the feature branch), so piano mode starts from `main` on a fresh branch.
- **Approach**: one app, one instrument toggle (top bar + Settings). Everything that is not a diagram is shared: search, routing, favourites, recents, progression, transpose, theming, PWA.
- **`js/piano.js`**
  - `voicings(root, suffix)` derives piano voicings from the type's interval formula: root position in the middle-C octave, then 1st/2nd/3rd inversions (lowest note moved up an octave), plus a "Two hands" voicing (root, and the fifth for 4+ note chords, an octave below). Slash chords get their bass note in the left hand. Notes are kept inside C4–C6 for readability.
  - Suggested right-hand fingerings by chord size and inversion (triads 1-3-5 / 1-2-5 / 1-3-5, four-note 1-2-3-5 / 1-2-4-5 …); left-hand notes are marked "L".
  - `render(voicing, opts)` draws a keyboard SVG covering whole octaves (at least two), highlights pressed keys (root darker, left hand lighter), labels with fingers or note names, and supports a tappable mode for the Finder.
- **Audio**: added an additive piano tone (7 partials with per-partial decay, slight inharmonicity, percussive attack) rendered into cached AudioBuffers, alongside the Karplus–Strong guitar. `Sound.play` and `playSequence` take an instrument argument; piano "strums" are near-simultaneous.
- **App wiring**: `voicingsFor`, `midiOf`, `renderDiagram` and `voicingLabel` dispatch on the instrument, so cards, search results, root/type pages, chord detail, thumbnails, progression and settings preview all switch. The capo helper hides in piano mode; the Finder becomes a 3-octave tappable keyboard; share links carry `?i=piano|guitar` so a shared chord opens in the right instrument.
- **Lessons**: JustinGuitar is guitar-only, so the lesson card is hidden entirely in piano mode (an earlier draft showed a "switch to guitar" card; removed at the user's request).
- Home hero swaps to a matching gpt-image-2 piano illustration in piano mode. Search placeholder shortened to make room for the instrument toggle on phones.
- Tested both modes with Playwright (no console errors); service-worker cache bumped to `cb-v3`, app version 1.1.0.
