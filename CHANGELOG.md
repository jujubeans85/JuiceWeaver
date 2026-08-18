# Changelog

## 3.0 — 2026-08-19

Bring the v0.3 shell up to a working Mac & iOS studio.

### Why
GitHub `index.html` was a branded layout with no audio graph. 3.0 ships a real Web Audio engine, a Safari-safe unlock path, and a mixer that is usable with a thumb on iPhone and a keyboard on Mac.

### Added
- JuiceEngine: per-stem FX graph, synced playback, loop, seek, meters, Media Session
- iOS / Safari unlock gate + resume-on-focus
- Coastal Dusk 4-bar looping demo (drums, bass, keys, pad, lead)
- Weave: on-device prompt → mix params
- Optional Grok interpreter (opt-in, no audio uploaded)
- Generative stem synth from a prompt
- Lite complementary-band split
- Sonic Postcard export (WAV + intent JSON, share sheet on iOS)
- Models Hub + PrivateForge URL
- Intent journal in localStorage
- Optional signed-in project table
- PWA / Home Screen icons, custom share card

### Changed
- Version jumps from Pilot v0.3 to 3.0
- Palette: graphite + bone (no indigo/purple shell)

### Known limits
- Lite split is IIR bands, not UVR/MDX
- Generative layers are procedural, not a vocal model
- iOS memory: keep sessions under ~10 stems; prefer WAV/MP3/M4A
- Silent switch should be off on iPhone while mixing
