# Device feedback

## RC1 — owner-reported iPhone pass

The owner reported: “All functions Pass locally on iOS phone. IPad pending.”

This feedback follows delivery of version `1.0.0-rc.1`, fingerprint `4fba5ae15dee9772dae33b4eaab962c96c40723a2a7b46108a41dc1b771ae332`. Record it as an owner-reported functional pass on an iOS phone. The device model, OS version and individual test steps were not supplied. Do not infer a separate VoiceOver, long-session memory, offline-installation or formal security certification from that broad report.

The iPad check remains pending. Timbre, glitch, the expanded effect ranges and new appearance/icon changes are subsequent work in RC2, so this prior pass does not certify the newly added controls.

## RC2 — iPad loads; Home Screen installation blocked

On 15 September 2026 the owner supplied a screenshot of RC2 rendered in Firefox on iPad and reported that adding to the Home Screen stalls in both Firefox and Safari. This establishes successful page rendering, not audio or installation acceptance. Whether the stall occurs in the Add to Home Screen sheet or when opening the created icon remains unresolved.

Live checks found valid manifest JSON and all three valid PNG icons returning HTTPS 200, but Netlify served the manifest as `application/octet-stream`. A lead-reviewed hosting-only correction sets `application/manifest+json` and `Cache-Control: no-cache`. This is a verified metadata correction, not proof of the reported stall's cause or resolution. Existing service-worker cached responses are not forcibly cleared. No project data, manifest identity or audio processing changes are authorized by this correction.

## RC3 request — installation confirmed, import regression reported

The owner clarified that JuiceWeaver is installed on the Home Screen and looks correct. They report four simple WAV files imported on the first run but now fail to load, and requested larger precise controls, zero markers, double-tap neutral reset and lighter function panels. Import previously awaited AudioContext resume after the file picker; removing that unnecessary playback dependency addresses a reproducible hanging-permission condition. The exact cause on the owner device remains unconfirmed until retest. The owner will attach their separate review later.
