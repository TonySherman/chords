# Chordbook

A mobile-first, installable (PWA) guitar chord chart. Search any chord, browse every voicing, hear it strummed, identify chords from a fretboard, build and transpose progressions, and learn each chord with a JustinGuitar lesson.

It is a plain static site: open `index.html` (or serve the folder) and everything loads from there. No build step.

## Features
- 528 chords · 2,054 voicings across 12 roots and 40+ chord types, including slash and power chords
- Crisp SVG diagrams with finger numbers or note names, barres, base-fret markers and left-handed mirroring
- Search that understands "Am7", "F sharp minor", "C/G", "power chord" and enharmonic spellings
- Swipeable voicing carousel, favourites, recents, shareable links (`#/chord/C/m7/2`)
- Built-in string synth (Karplus–Strong) for strum and arpeggio playback, no samples needed
- Chord Finder: tap the fretboard, get the chord name
- Progression builder with transpose, tempo and play-through
- Capo helper, dark/light themes, offline support and home-screen install
- A JustinGuitar YouTube lesson (Shorts preferred) for each chord, with attribution

## Credits
- Chord voicing data adapted from [chords-db](https://github.com/tombatossals/chords-db) by David Rubert (MIT licence, see `data/CHORDS-DB-LICENSE.txt`).
- Lesson videos are by [JustinGuitar](https://www.justinguitar.com) (Justin Sandercoe) and are embedded from YouTube with attribution. Chordbook is not affiliated with JustinGuitar.

See `notes.md` for the build log.
