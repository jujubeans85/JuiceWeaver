# Independent frontier-model review — CRATE JUICE JuiceWeaver RC2

Review this release independently. Challenge evidence, reproduce important outcomes and report actionable defects. Do not assume a passing score from the implementing or lead agent proves your own result. Do not change other repositories or publish changes without authorization.

## Target

- Application: JuiceWeaver, CRATE JUICE's local stem studio.
- Canonical URL: https://juiceweaver.netlify.app/
- Repository: https://github.com/jujubeans85/JuiceWeaver
- Version: `1.0.0-rc.2`.
- Expected app fingerprint: `162a6663f36799392d0182c63a2e9e5990848390ac7d0829c8c952db82db513d`.
- Release identity: source commit `2be1f1b5d3147a105ed46d4bfb27550768b6fa19`; subsequent review-record updates are in [PR #5](https://github.com/jujubeans85/JuiceWeaver/pull/5). Application fingerprint remains unchanged.
- Canonical deployment verification: **PASS** — Netlify deploy `6aa8bea7070ae63c213595e5`, published 2026-09-15T03:42:56.045Z. All 41 served build files match local bytes; service worker returns no-cache. Canonical demo playback, Broken beat preset and pause passed.
- Final native audio result: **21/21 passed**, including the approved bounded numeric-repeatability check.

Verify `/release.json` and source identity before reviewing. If these disagree, identify what you actually reviewed. Read `AGENTS.md` and `docs/RC2_REVIEW.md`.

## User objective

Add useful per-stem timbre and glitch controls with matching presets; offer optional 50% wider effect ranges per stem; reduce heavy colour overlays while retaining warm, dark, professional glass over a gritty matte train-carriage photograph; provide a recognisable simple 3D crate icon with tinted JW lettering, matching the app corner and iOS Home Screen artwork.

Keep CRATE JUICE visually coherent across future apps without building unnecessary infrastructure. Sharing remains deferred. The user authorizes routine work, expects a separate lead reviewer, and wants clear measured results rather than universal model-superiority, flawless-software or commercial-success claims.

## Architecture and intended behaviour

- Dependency-free native Web Audio; preview and offline export use one DSP graph.
- Timbre shapes broad body/presence frequency regions without changing pitch or duration.
- Glitch applies deterministic, tempo-linked rhythmic attenuation, with short transitions and an exact whole-session loop convention.
- Six presets apply to the selected stem's effects while preserving level, pan and range choice.
- Normal EQ bounds ±12 dB expand to ±18 dB. Timbre ±1 expands to ±1.5. Drive, space and glitch 0–1 expand to 0–1.5. Level and pan remain unchanged.
- Switching expanded ranges off clamps affected values to normal bounds and is undoable. Merely widening does not change existing sound.
- New session schema and project manifest are version 2. Legacy version 1 imports migrate safely; older apps reject new project files rather than stripping new effects.
- Original audio and hashes persist; imports and recovery are transactional. Audio is not silently uploaded.
- Gate data is shared per graph and filled in place. Playback timing is chosen after heavy allocations; gate sources stop when their graph retires.

## Reproduce the important checks

1. Run `npm test`, `npm run check` and `npm run build` under the pinned Node version. Compare release fingerprints across repeated builds.
2. Import a genuine version-1-format synthetic project. Verify original bytes and old controls remain unchanged, with timbre/glitch zero and expanded false.
3. Select one stem, apply a preset, enable expansion, move timbre/glitch to 150%, disable expansion, then Undo. Confirm another stem is unaffected.
4. Save a real `.juice` file, reopen that downloaded file and reload recovery. Verify all new controls and source bytes survive. An invalid file must preserve the current session.
5. Measure neutral impulse timing, positive/negative timbre spectral contrast, normal and expanded glitch depth, tempo response, seek/loop phase and gate-source cleanup.
6. Render combined expanded extremes with peak protection. Require finite output, preserved frame count, correct room tail and no normalization boost of quiet input.
7. Check keyboard focus, narrow scrolling, text readability, preset selection and touch targets. Inspect the lighter photograph/glass treatment and matching icon artwork.
8. On physical iPhone and iPad, check playback, parameter edits, interruption/resume, project download/reopen, WAV export, recovery and Home Screen installation. Clearly separate hardware evidence from responsive browser testing.

## Existing evidence and its limits

- 39 Node tests and 20-module checks passed independently and with the implementing agent.
- Native staged recovery: 12/12 passed, including old recovery migration and new settings persistence.
- Initial native audio: 20/21 passed; the failure was strict byte equality on repeated multi-stem combined renders.
- Diagnosis found wet 40/230,400 and dry 18/38,400 changed PCM16 samples, maximum 1 LSB. The cause is unproven; native floating-point rendering is a hypothesis, not a finding isolated to convolution.
- Both reviewers approved identical headers/frames, ≤1 PCM16 LSB difference, ≤1e-6 relative raw-peak difference and ≤1e-7 absolute protection-gain difference as the combined-render criterion. Glitch-only repeated PCM remains exact. Final rerun passed: wet 12/230,400 changed samples (RMS 0.007216878 LSB), dry 20/38,400 (RMS 0.022821773 LSB), both maximum 1 LSB and identical headers; repeated raw peaks and protection gains were equal.
- An actual UI WAV download was inspected: 192,044 bytes, stereo 48 kHz PCM16, one second, peak 0.029022216796875; SHA-256 `1d0e6b831909cc04962e4b276218ff10a253d75ec03ac00cb59ac53624987a7f`. The 193,465-byte RC2 project download reopened successfully.
- Actual browser checks exercised legacy import, preset application, per-stem widening/clamping/Undo and downloaded RC2 project reopen with retained source bytes.
- Responsive layout: 375px usable and scroll width inside a 390px viewport, with independently reviewed desktop and narrow screenshots. This is not physical iOS evidence.
- Both reviewers rate tested categories at least 8/10: functionality 8.5, browser usability 8.3, desktop visuals 8.4, narrow visuals 8.2, maintainability 8.3 and privacy within scope 8.5. The audio and canonical deployment gates are closed; independently recheck the live fingerprint when reviewing.

The owner reports the previous RC1 passed locally on their iOS phone. iPad is pending. That report does not certify this iteration's new controls or Home Screen installation. Existing commercial asset/licensing decisions remain open and outside this technical iteration.

## Your requested output

Provide a concise independent verdict with the exact build tested. For each issue give severity, reproduction steps, expected versus observed behaviour, evidence and a concrete fix. Separate verified results, plausible concerns and untested gates. Score functionality, compatibility, browser usability, visual execution, maintainability and privacy independently; do not average missing essential device evidence into a passing result.

Recommend acceptance as an explicitly labelled release candidate only if all tested categories meet 8/10, no blocking correctness/data-loss/privacy issue remains, and unresolved physical-device/commercial gates are plainly disclosed. If you propose changes, keep them scoped to JuiceWeaver and preserve source audio, existing projects, app-scoped storage and the CRATE JUICE visual identity.
