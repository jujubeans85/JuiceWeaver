# JuiceWeaver 3.0

Privacy-first stem studio for Safari on iPhone, iPad and Mac.

Upload stems (or load the coastal demo), mix in real time, describe a change in plain language, and export a WAV or a Sonic Postcard. Audio stays in the browser until you export.

## What 3.0 is

v0.3 on GitHub was a branded shell. 3.0 is the working instrument:

- Web Audio mixer with per-stem FX (EQ, warmth, drive, delay, hall)
- Safari / iOS unlock flow (one tap opens the graph)
- Touch mixer + lock-screen transport via Media Session
- Home Screen install (Add to Home Screen on iOS)
- Share-sheet export on iPhone
- Coastal Dusk demo (5 looping stems)
- Local prompt interpreter (no network)
- Optional Grok interpreter (prompt text only, never audio)
- Generative layers (prompt → mix-ready part)
- One-click lite split (bass / body / voice / air)
- Intent journal (every prompt and export, on-device)
- Sonic Postcard pack (WAV + intent JSON)
- PrivateForge URL hook for a local model

## Mac

Drag-and-drop stems. Space to play. Cmd/Ctrl+Enter weaves the prompt. Full console: stems left, FX / Models / Journal / Postcard right.

## iPhone / iPad

Tap **Open studio** once (Safari will not start Web Audio without it). Use **Add stems** — iOS has no reliable drag-and-drop. Keep the silent switch off while mixing. Share → Add to Home Screen for a full-screen studio with lock-screen play/pause.

Supported decode: WAV, MP3, M4A, AAC. FLAC/OGG are unreliable in Safari.

## Privacy

Default path is local. Sign-in is optional and only syncs mix notes. Grok and PrivateForge are opt-in and receive prompt text + stem names, never audio files.

## Upgrade points (in code)

- AudioWorklet drive / tape / transient shapers
- WebNN / ONNX on-device MDX separation
- Local LLM via MLX / Ollama on the PrivateForge bridge

Built for Crate Juice · Central Coast NSW.
