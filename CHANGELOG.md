# Changelog

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

### Evidence and remaining gates

The [audio prototype](docs/AUDIO_PREVIEW_EVIDENCE.md) passed 15 real-browser audio checks at the version recorded there. A subsequent transport fix adds a 16th regression; rerun the current browser suite for current-release evidence. Unit tests and browser evidence serve different purposes.

Physical iPhone/iPad import, playback, interruption, project recovery and download verification remain required. Browser emulation does not satisfy that gate. This build remains an evaluation release candidate.

### Deferred

Built-in source separation, prompt-generated layers, AI-provider/model integrations, time stretching, lock-screen transport and native AirDrop/Messages sharing. The obsolete “lite split”, Sonic Postcard, sign-in/sync and PrivateForge instructions are removed. Commercial hosting and owner legal choices remain separate release decisions.
