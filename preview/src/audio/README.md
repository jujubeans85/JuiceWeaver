# JuiceWeaver audio

The audio engine uses native Web Audio. There is no external DSP package, model,
upload service, forced compressor or automatic level boost.

## API

`JuiceEngine` is exported by `engine.js`.

- `unlock()` creates/resumes audio during a user gesture. It requests 48 kHz,
  with the browser's default sample rate as a fallback. `sampleRate` reports the
  actual live context rate.
- `decode(bytes)` retains the original ArrayBuffer, checks local duration before
  decoding, decodes a copy, and rejects oversized, multichannel or invalid audio.
- `update(session, assets)` establishes duration and applies live parameter edits.
- `play(session, assets, offset)`, `pause()`, `stop()` and `seek(seconds)` control
  the shared transport. `playing`, `position` and `duration` are read-only getters.
- `onStateChange = ({ playing, position, reason }) => { … }` reports transport and
  context interruption changes. A suspended/interrupted context pauses playback;
  resuming the context alone does not start music.
- `meter()` returns sampled stereo `{ peak, clipped }`. The clipping flag latches
  until another Play. Sampling a live meter cannot certify every sample; export
  scans the entire rendered buffer.
- `render(session, assets, { normalize: false })` renders one complete session at
  48 kHz into stereo PCM16 WAV. The legacy option name `normalize: true` means
  **reduction-only peak protection**: gain is `min(1, 0.98 / peak)`. Quiet mixes
  are never boosted. It is one gain change, not a limiter or compressor.
- `createBuffer(channels, frames, sampleRate)` supports original procedural audio.
  `destroy()` stops playback and closes the context.

Render returns `{ blob, peak, exportedPeak, duration, sampleRate, tail,
normalizationGain }`. `peak` is the measured peak before PCM clipping or optional
protection. An audible Room effect adds a documented two-second export tail.
Non-loop playback permits the same tail, including when Room/mute/solo changes
while playing. Looped playback carries reverb naturally across loop boundaries.

## Signal path and timing

Each stem follows the same graph for live playback and export:

`low shelf → high shelf → parallel soft saturation → dry/room mix → stereo pan → stem level → master`

Gains, pan and shelf edits hold their current value before smoothing toward the
next value. Drive blends a fixed soft saturation curve with the clean path, so
changing Drive does not replace an active nonlinear curve discontinuously.

Every stem starts at one shared AudioContext timestamp. Equal-length loops use
native source looping. Mixed sub-second loops pad short stems with silence; these
copies remain bounded by the short session duration and stem count. Longer mixed-length loops
schedule shared master boundaries up to 30 seconds ahead. A short stem stays
silent until that boundary; it does not restart independently. If a browser stops
timers without suspending audio for longer than the scheduling horizon, scheduled
mixed-length loops may gap before recovering at a shared boundary. Reliable
background playback is not claimed.

Tempo is session metadata. The engine does not stretch audio, identify a beat
grid, separate a mix into stems or generate vocals.

## Files and memory

Product limits and parameter ranges come from `../core/model.js`: eight stems,
three minutes per stem, 64 MiB per original file, 96 MiB aggregate original data
and 96 MiB aggregate decoded PCM. The importer enforces aggregate import budgets;
the engine also validates the supplied session. Offline rendering adds a bounded
working-memory estimate and rejects an export that exceeds it.

`preflight.js` is the single source of audio metadata inspection. PCM/float WAV
headers are validated without allocating decoded samples; compressed WAV and
other formats use local media metadata with an eight-second timeout and cleanup.
The metadata cache is keyed by the unchanged original ArrayBuffer. Native decode
is still validated afterwards. A format is supported only when the current
browser can inspect and decode it. Unknown duration fails with a PCM WAV fallback.

Asset bytes and AudioBuffers are treated as immutable after import. Finite-sample
validation is cached by AudioBuffer identity. Effects always operate on graph
nodes rather than modifying the stored source samples.

## Original demo and proof

`createDemo(engine)` synthesizes **Last train, first light**, an original eight-bar
88 BPM arrangement: drums, bass, keys and melody. The rhythm includes swung hats
and ghost notes; bass, electric-key-like chords and delayed melody form four
separate sources. No third-party recording or AI model is used. Live demo buffers
are decoded from the same generated WAV bytes that project backups preserve.

Run `node --test tests/audio-*.test.mjs` for PCM encoding and preflight checks.
Open `tests/audio-proof.html` and press **Run audio proof** for real browser
AudioContext and OfflineAudioContext checks, including synchronization, polarity
cancellation, mute/solo, panning, effects, WAV roundtrip, clipping, pre-decode
rejection, transport and demo export. The result table reports actual passes and
failures. The context-suspend test simulates a browser interruption; it does not
replace testing calls, lock/unlock and audio routes on physical iPhones/iPads.
