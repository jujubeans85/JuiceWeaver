# JuiceWeaver RC2 independent release review

Date: 15 September 2026. Reviewers: implementing agent and separate lead developer agent.

App version: `1.0.0-rc.2`.
App fingerprint: `162a6663f36799392d0182c63a2e9e5990848390ac7d0829c8c952db82db513d`.
Canonical URL: https://juiceweaver.netlify.app/

## Scope and verdict

This iteration adds per-stem timbre and rhythmic glitch, six stem presets, optional 50% wider effect ranges, a warmer and more transparent carriage/glass treatment, and matching crate/JW app and Home Screen artwork. It preserves original source audio and local processing.

Independent source, native audio, workflow and visual review approves publication of an explicitly labelled release candidate. The canonical deployed fingerprint must be verified after publication. This is not physical-device certification or a promise of flawless software or commercial success.

## Scorecard

Scores apply only to the stated verified scope; missing device evidence is not averaged into a passing score.

| Category | Implementing reviewer | Independent lead | Evidence and limits |
| --- | ---: | ---: | --- |
| Functionality and project compatibility | 8.5/10 | 8.5/10 | 39 Node tests; native project import/save/reopen, scoped presets, widening/clamping and Undo; 21/21 final native audio proof passed |
| Browser usability | 8.3/10 | 8.3/10 | Actual browser controls and archive picker workflows; 375px usable narrow layout without horizontal overflow |
| Desktop visual treatment | 8.4/10 | 8.4/10 | Independently inspected updated screenshot; visible carriage texture, warm glass and matching corner icon |
| Narrow visual treatment | 8.2/10 | 8.2/10 | Independently inspected loaded studio and scrolled effect/preset panel; controls and explanations fit |
| Maintainability | 8.3/10 | 8.3/10 | Central portable effect bounds and presets, shared live/offline DSP, explicit schema migration, no added runtime dependency |
| Privacy within this change | 8.5/10 | 8.5/10 | Audio remains local, no new accounts or network processing, app-scoped recovery unchanged |

## Evidence

- Independent and implementing reviewers each ran all **39 Node tests** successfully. The source/import/HTML check passed for **20 modules**.
- Native browser recovery proof passed **12/12**, including version-1 recovery migration, version-2 expanded settings persistence and transactional rejection of invalid settings.
- Initial native audio proof passed **20/21**. The one failure was an overly strict byte-exact repeated-render expectation for an eight-stem combined-effects render. It was investigated before any acceptance criterion changed.
- Timbre changed measured presence/body ratios from approximately **0.214** through **1.000** to **4.672**, with unchanged duration.
- Glitch measured closed/open RMS ratios of **0.350** at normal maximum and **0.025** at expanded maximum. Glitch-only repeated PCM was exact. Halving tempo moved the rhythmic cut.
- Shared start, seek, loop and tempo-rebuild source clocks passed, including deliberately delayed control-buffer allocation; control sources stopped during graph retirement.
- The neutral-controls proof compares absent versus explicit zero controls in the new engine and checks exact impulse position and amplitude. It does not run the archived RC1 engine for a general binary-equivalence claim.
- A synthetic legacy project produced with the archived RC1 encoder opened in the updated browser with old settings intact and new controls neutral.
- Applying Broken beat, widening to 150%, narrowing to 100%, Undo back to 150%, and selecting an unaffected other stem were exercised in the browser.
- A real downloaded RC2 project was parsed and reopened through the browser file picker. It retained schema 2, expanded settings, timbre/glitch at 1.5, drive at 0.22, the other stem's neutral controls and original source bytes.
- Narrow layout was measured inside a 390px CSS viewport: 375px usable width and 375px scroll width. This is responsive-layout evidence, not Safari or physical-iPhone emulation.

## Repeatability investigation and approved criterion

Two repeated combined renders differed only at PCM16 rounding boundaries:

| Configuration | Compared samples | Changed samples | Maximum difference | RMS difference |
| --- | ---: | ---: | ---: | ---: |
| Eight expanded stems, room enabled | 230,400 | 40 | 1 PCM16 LSB | 0.013176 LSB |
| Same expanded mix, room disabled | 38,400 | 18 | 1 PCM16 LSB | 0.021651 LSB |

Wet raw peaks were 12.500553131103516 and 12.500554084777832; protection gains were 0.07839653091522744 and 0.07839652493431191. Dry peaks were both 6.399075031280518.

The underlying cause is unproven. Native floating-point accumulation/rendering is a plausible explanation. Because differences also occurred without room, attributing them solely to convolution would be unsupported.

Both reviewers approved a measured numeric-repeatability gate: identical WAV headers and frame counts; maximum difference no greater than **1 signed PCM16 LSB**; relative raw-peak difference at most **1e-6**; absolute protection-gain difference at most **1e-7**. Changed-sample count and RMS are reported. Glitch-only exact repeatability remains required. One PCM16 LSB is approximately −90.3 dBFS; these findings do not support a claim of bit-exact combined rendering.

The final approved fixture passed **21/21 native audio checks**. In that run, wet renders differed at 12/230,400 samples (maximum 1 LSB; RMS 0.007216878 LSB), and room-disabled renders differed at 20/38,400 samples (maximum 1 LSB; RMS 0.022821773 LSB). Headers matched. Wet peaks were both 12.500554084777832 and gains both 0.07839652493431191; dry peaks were both 6.399075031280518 and gains both 0.15314713379816275. Glitch-only exact repeatability still passed. The final storage result was reobserved at **12/12**.

An actual UI WAV download was also inspected: 192,044 bytes, stereo 48 kHz PCM16, 1 second, sample peak 0.029022216796875; SHA-256 `1d0e6b831909cc04962e4b276218ff10a253d75ec03ac00cb59ac53624987a7f`. The actual RC2 project download was 193,465 bytes and reopened successfully.

## Review findings resolved

1. The new session and project manifest use version 2. Version 1 imports migrate to neutral new controls; older readers explicitly reject new files rather than silently dropping effects.
2. Expansion affects six effects only. Level and pan keep their original bounds. Disabling expansion clamps extended values with visible explanation and Undo.
3. Timbre is spectral body/presence shaping, not pitch correction or source separation. Glitch is an actual deterministic tempo-linked gate with short transitions.
4. Native gate data is filled directly into the shared control buffer, avoiding a duplicate full-length sample allocation. The UI allocation policy reserves two maximum-length control buffers for live/render overlap.
5. Graph allocation and padding complete before selecting a shared future playback start; slow allocation cannot advance only the gate phase.
6. Controls, presets, project persistence, prompt reset and UI reset include both new effects. Source audio stays intact.
7. Home Screen PNGs and the in-app corner mark use the same crate/JW artwork. Actual installed icon refresh remains device-dependent and unverified.

## Final release gates — implementing reviewer to complete

- **Final native audio proof:** 21/21 passed on the approved numeric-repeatability fixture under the staged `/preview/tests/audio-proof.html` path. App fingerprint is recorded above; final source commit will identify the published fixture.
- **Final native recovery proof:** 12/12 passed and reobserved on staged RC2 under `/preview/tests/core-browser.html`.
- **Canonical deployment and fingerprint:** PENDING — verify live canonical URL serves the fingerprint above, then smoke-test the published build.
- **Release identity:** the app fingerprint above identifies the approved application; publication metadata records the final source commit.

## Device and commercial boundaries

The owner reports all functions passed locally on their iOS phone for the previous RC1. This is valuable owner-reported evidence for RC1; no device model, OS build or test transcript is inferred. The owner explicitly says iPad testing is pending.

RC2's new effects, wider settings, recovery across updates and matching installed Home Screen icon need a fresh physical iPhone check. Physical iPad testing remains pending. Browser screenshots and native Chromium audio tests do not substitute for those checks. Existing asset/licensing and commercial-release decisions remain separate. No other repositories, billing, DNS, credentials or legal choices are changed by this iteration.
