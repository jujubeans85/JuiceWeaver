# JuiceWeaver RC3 — review and continuation handoff

Date: 15 September 2026

## Release status

**HOLD canonical deployment.** RC3 source is committed on main and staged on secondary GitHub Pages. The canonical Netlify app remains RC2. RC3 is not a finished, browser-verified release.

- Source PR: https://github.com/jujubeans85/JuiceWeaver/pull/6
- Source commit: `2f0d677fd75037dc3035cf82bf1aeabf30a10d5c`
- Version: `1.0.0-rc.3`
- Source fingerprint: `97e52851e98430c2f49e812dad2b65066fa543dd483437731af5c081baf6bf52`
- Canonical app: https://juiceweaver.netlify.app/
- Secondary evaluation app: https://jujubeans85.github.io/JuiceWeaver/
- Canonical deployment before this candidate: `6aa8c546e3f0c7ec2b12a299` (RC2 plus manifest MIME correction).

## Owner feedback and bounded changes

The owner confirmed Home Screen installation works. Four ordinary WAV files subsequently failed to import. They requested lighter function panels, better contrast, larger controls with precise increments, zero markers and double-tap neutral reset. Another visual change and the owner's next review are deferred.

Implemented:

- Remove the awaited playback unlock before file import. AudioContext.resume() can remain pending after the iOS Files picker suspends playback, blocking import before its progress UI. Native decoding does not require playback permission. Explicit Play still unlocks audio. This is a likely explanation, not a device-proven diagnosis.
- Add shared native-range enhancement in src/ui/slider.js: native-step minus/plus buttons, explicit Reset, double-tap the displayed value to reset, and zero markers for bipolar ranges.
- Route every edit through existing input/change, Undo and persistence handling; output reset remains the safe -6 dB default.
- Expand effects into full-width rows, 48px slider rails, larger thumbs and 44px minimum action buttons.
- Lighten function panel tint and increase label contrast. Preserve the established background and Home Screen icon.
- Retain transactional import, original audio bytes, storage serialization and existing DSP.

## Evidence available

- Node tests: 40/40 pass, including two batches of four genuine generated WAVs with playback suspended and a resume promise that never settles. Native decode is called eight times, resume zero times, and source bytes are preserved. A malformed WAV fails preflight.
- Syntax checks: 21 modules pass.
- Build: 33 core files; fingerprint above.
- GitHub Studio quality: PR run 34930336177 and merged-main run 34930640119 succeeded.
- Secondary Pages deployment run 34930639624 succeeded.
- Independent source lead reviewed import logic, controls, event flow, persistence, responsive rules and contrast. Correctness 9/10, maintainability 8.7/10, data safety 9/10.
- Primary source assessment: correctness 8.5/10, maintainability 8.5/10, data safety 9/10.
- Neither reviewer grants a final UX score or production approval.

## Why deployment is held

The supported test browser repeatedly timed out on tab listing, navigation and dialog inspection. A fresh tab could be created, but page interaction did not complete. Supported recovery was attempted. This is a test-environment limitation, not evidence that JuiceWeaver is down.

AGENTS.md requires functional evidence and both reviewers' approval; a green build is insufficient. No unsupported browser workaround, storage clearing or production deployment was used to bypass that gate.

## Required continuation checks

1. At the secondary app, import four WAV files through the real file picker before pressing Play. Repeat selection of the same four files and verify eight stems.
2. With room below the eight-stem limit, import a batch containing valid and malformed files; verify an actionable error and that the previous session is intact.
3. Run tests/audio-proof.html: expect 22 native-browser checks, including suspended-context decoding of two four-WAV batches. Preserve existing render tolerances.
4. Check plus/minus exact steps, reset, double-tap displayed value, Undo, per-stem isolation, and widened effect limits. Verify level-button focus survives rerender.
5. Inspect desktop/iPad-sized layout and tests/layout-proof.html at 390px and 320px: no horizontal overflow; all controls accessible; neutral markers correctly placed; labels readable.
6. Save/reopen a synthetic project and export a WAV with resulting settings. Confirm actual output, not just button presence.
7. Have the independent lead inspect screenshots and results, and agree every release category is at least 8/10.
8. Deploy the same source to the existing Netlify site, then verify release.json, app assets, manifest MIME and service-worker cache headers. Do not create another customer URL.
9. Record deployment and browser evidence here. Physical installed-iPad retest remains distinct from desktop-browser verification.

Synthetic one-second mono PCM16 WAVs are reproducible. Prior transient fixtures were under /workspace/scratch/rc3-import-fixture; browser uploads use /home/oai/share/rc3-import-fixture. No owner audio was used.

## Safe update instruction after publication

Save a project backup, close all JuiceWeaver browser windows and the Home Screen app, then reopen and check for **1.0 RC 3**. Do not clear website data or reinstall simply to update: recovery data may be lost.

## Instructions for an independent frontier-model reviewer

Review the exact source commit and fingerprint above. Challenge the proposed import cause, event ordering, transactional preservation, reset semantics, accessibility and narrow-screen layout. Distinguish automated evidence, browser evidence and owner-device evidence. Report reproducible defects and justified category scores. Do not equate source presence or successful deployment with working functionality. Keep other repositories read-only and preserve the owner's current audio.
