# Changelog

## 1.0.0-rc.3 — touch precision and import

- Remove playback-resume dependency from file importing; retain transactional validation.
- Larger ranges, exact-step buttons, neutral markers and double-tap displayed-value reset.
- Lighten function panels and improve contrast; keep the existing background/icon.
- Add repeat four-WAV decoding coverage while audio is suspended.

## 1.0.0-rc.2 — 15 September 2026

- Added selected-stem Timbre and tempo-linked rhythmic Glitch, with the same live/export processing.
- Added six stem presets and an undoable per-stem switch for 50% wider effect ranges. Gain/pan retain their physical/safety limits; switching back to normal bounds clamps extended values explicitly.
- Version-2 project saves preserve the new controls. Version-1 imports migrate with neutral effects; older apps explicitly reject newer archives.
- Reduced backdrop and panel tint to reveal more carriage colour through dark glass, including the mobile layout.
- Replaced app/Home Screen icons with a matching simple 3D crate and tinted JW monogram.
- Recorded the owner's RC1 iPhone functional pass; iPad and new-feature device checks remain pending. See docs/DEVICE_FEEDBACK.md and docs/RC2_REVIEW.md.

## 1.0.0-rc.1 — 15 September 2026

A functional rebuild of JuiceWeaver and the first reusable CRATE JUICE application foundation. This starts a new release history based on implemented behaviour. Prior `v0.3`/`3.0` labels and files remain in Git history; their advertised features are not evidence that those features shipped.

### Implemented

- A native Web Audio mixer and offline WAV renderer using the same effect graph: synchronized playback, seek, whole-session loop, gain, mute/solo, pan, bass/treble shelves, drive and room.
- An original eight-bar, 88 BPM demo with separate drums, bass, keys and melody. Project backups retain the same source representation used for playback.
- Touch controls, waveforms, peak warnings, undo/redo, keyboard shortcuts, accessible labels and reduced-motion styling.
- Local command previews for supported mix changes. Commands are deterministic; no AI service is connected.
- Portable `.juice` projects containing original audio and editable settings, plus browser recovery with explicit failure messages.
- Stereo 48 kHz PCM16 WAV export. Optional peak protection reduces levels only; an audible room effect includes a two-second tail.
- A shared brand module, design tokens, per-app identity configuration, appearance controls and a generated second example.
- Reproducible build output, release fingerprints, application cache updates and source/module checks.

### Corrected during review

- Imports check duration before native decoding, reject invalid samples and enforce file/session limits.
- All stems follow one timeline; short stems do not restart independently. Sub-second loops avoid unbounded source scheduling.
- Pause/stop cancel pending playback. Context interruptions require an explicit Play to resume.
- Room changes reschedule the non-loop tail. Switching Loop off after a complete cycle preserves the current playhead.
- Documentation now matches the working application, including its limits and deferred features.
- Netlify serves the canonical application with explicit headers; missing pages return to the canonical root. The offline request list excludes GitHub-only control files; build-generator changes update the release fingerprint.

### Evidence and remaining gates

The fully exercised preview passed **16 native audio checks and 10 isolated IndexedDB checks**, alongside 33 Node tests. The canonical Netlify host also passed real project/WAV downloads, picker restore and focused deployment checks. [Release evidence](docs/RELEASE_EVIDENCE.md) identifies the exact artifact for each result. Physical-device results are separate.

Physical iPhone/iPad import, playback, interruption, project recovery and download verification remain required. Browser emulation does not satisfy that gate. This build remains an evaluation release candidate.

### Deferred

Built-in source separation, prompt-generated layers, AI-provider/model integrations, time stretching, lock-screen transport and native AirDrop/Messages sharing. The obsolete “lite split”, Sonic Postcard, sign-in/sync and PrivateForge instructions are removed. Canonical hosting is the existing Netlify site; physical-device acceptance and owner legal choices remain separate release decisions.
