# Complete studio workflow evidence

15 September2026; full preview served from commit5828323460cf6890cc43144a2673aa2bfc6810ab, fingerprint2e2661865808f6317c981c538d318f2f9f74c79b079f6cb29d6590898f8d5394. Cloud Chrome151. This is browser evidence, not physical iPhone verification.

| Check | Observed result |
| --- | --- |
| Demo | Four original stems;28.0MiB decoded; playhead advances and native audio runs |
| Keyboard | Space on Mute Keys toggles mute without starting transport; Undo restores |
| Command preview | Warm the mix shows exact proposed changes before mutation |
| Apply | Every stem receives low+1.5dB,high−1.5dB,drive0.08 |
| Project download | Real export modal produced Last-train-first-light.juice,14,663,904 bytes |
| Archive inspection | Native downloaded archive decoded independently with four original WAV payloads and all proposed settings intact |
| App reload/recovery | Reload opened an empty studio with Continue:Last train,first light; explicit Continue restored all four stems |
| Exact picker round trip | Open picker accepted the downloaded .juice file; replacement confirmation worked;4 stems and Warmth1.5 restored |
| Valid WAV import | Add stems picker imported Proof-drum.wav, extracted from an original demo source; stem count increased4→5 and the new stem was selectable |
| Invalid import | Non-audio .wav was rejected with a format message; existing4 stems and Warmth1.5 remained intact |
| WAV download | Real modal and Download WAV link produced4,573,136 bytes; Python wave parser confirmed stereo,48,000Hz,16-bit,1,143,273frames,23.8181875s including room tail |
| Reusable foundation | Generated second tool mounted CRATE JUICE; Add a beat changed count0→1 |
| Narrow layout |390px frame (375px content plus scrollbar),document scrollWidth375: no horizontal overflow in loaded state |

The browser automation download-event listener timed out, but the actual clicked download completed and the exported file was inspected on disk. This is a tooling observation, not an app export failure. The Open picker round trip used that actual file; no synthetic re-encoding substituted for it.

The recovery test restores the latest complete local snapshot. During testing a second preview frame intentionally loaded the default demo, so that latest recovery had the default tone; reopening the downloaded warm-mix archive separately restored1.5dB/−1.5dB/0.08 settings. The separate storage proof tests stale-writer rejection.

Visual reviewers independently rated captured desktop8.5/10 and narrow empty/loaded8.3/10. Screenshots establish captured appearance only. Browser logs available for the sequence contained automation-extension metadata errors; those are not application exceptions. No physical audio listening score is claimed.

After this preview, source fixes release seek dragging on pointerup/cancel even without value change, and let accent hover follow the selected palette. Those focused changes require final smoke verification. Build/hosting metadata changes are separate from the unchanged proven audio/core modules.
