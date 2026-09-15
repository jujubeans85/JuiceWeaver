# Final deployment evidence — 15 September 2026

**Decision: evaluation release candidate. Physical iOS and installed/offline acceptance are not passed.**

## Release identity

- Version: `1.0.0-rc.1`.
- Canonical application: https://juiceweaver.netlify.app/
- Netlify deploy: `6aa8a703436701800798e216`, published 2026-09-15 at 02:02:05 UTC.
- Immutable deployment: https://6aa8a703436701800798e216--juiceweaver.netlify.app/
- Final application/build-generator fingerprint: `4fba5ae15dee9772dae33b4eaab962c96c40723a2a7b46108a41dc1b771ae332`.
- Build copies 30 application resources into the offline request list, plus the root page request. GitHub's `.nojekyll` marker remains build metadata and is excluded from that network list.
- Two consecutive builds produced identical release fingerprints. The generator itself participates in the fingerprint; generated output is not self-referential.

The canonical host is an existing Netlify site. No plan upgrade, paid add-on, DNS change or new account was introduced. Existing account terms and usage still apply. GitHub Pages remains evaluation hosting. Recovery is origin-local: export a `.juice` backup from the old origin, then open it on the new site.

## Evidence and its boundaries

| Check | Observed result | Artifact boundary |
| --- | --- | --- |
| Automated source checks | 33 Node tests passed; 18 browser modules, imports, page assets and controller targets checked | Root source; Netlify build runs tests/checks before build |
| Native audio | 16/16 actual browser checks passed | Fully tested preview `5828323460cf6890cc43144a2673aa2bfc6810ab`, fingerprint `2e2661865808f6317c981c538d318f2f9f74c79b079f6cb29d6590898f8d5394` |
| Native recovery storage | 10/10 isolated IndexedDB checks passed | Same preview; test databases were uniquely scoped and removed |
| Full interface sequence | Demo, edits, command preview/apply, Undo, real project download/reopen, reload recovery, rejected invalid import, valid WAV import and actual WAV download | See [workflow evidence](UI_WORKFLOW_EVIDENCE.md), exact preview above |
| Netlify foreground workflow | Four-part demo played; Sage applied `#adc6a2`; seek advanced after released click; WAV and project prepared and downloaded | Initial live candidate `e9c78981160fefb36ce43a253dbc10f70509e223619e3aa54c138e3f8f0516b9` under the final CSP policy |
| Netlify project reopen | Actual downloaded archive selected through the native picker; replacement confirmation completed; four stems restored | Same live candidate; no form/dialog or blob-download failure under CSP |
| Canonical update and recovery | New canonical metadata rendered; reload offered the last session and restored four tracks | Canonical alignment candidate `a639e22f74277bd1a2b2a939ca9862b3af1de30a6193939a28cc4006abd75f41`; audio/core unchanged |
| Final missing page | Nested nonexistent path returned branded 404; clicking Open JuiceWeaver returned to the exact canonical root | Final deployment |
| Required cache resources | All 31 real HTTP requests returned 200 | Corrected final request list; all served app assets unchanged by cache-generator fix |
| Cache policy | `sw.js` is served with `Cache-Control: no-cache`; no forced worker activation or other-app cache deletion | Final source and HTTP response |
| Actual worker installation / offline navigation | **Unverified** | Cloud browser policy blocked internal worker diagnostics; no indirect workaround or inferred pass |
| Physical iPhone/iPad | **Unverified** | No device, Files, VoiceOver, interruption, installed-app or memory-pressure acceptance claim |

Final URL metadata and headers were fetched over HTTPS. The deployed response includes a same-origin CSP, `X-Content-Type-Options: nosniff`, strict-origin referrer policy, and disabled camera/microphone/geolocation permissions. These are useful controls, not an independent penetration-test certificate.

## Downloads produced by the live Netlify interface

| Artifact | Exact result |
| --- | --- |
| Project | 14,663,727 bytes; original audio and editable four-track project; actual archive successfully reopened |
| Project SHA-256 | `55e379949d97821e46f1a6c531ac0796c5da39f8778974a8b9474572768004af` |
| WAV | 4,573,136 bytes; stereo PCM16, 48,000 Hz; 1,143,273 frames / 23.8181875 seconds |
| WAV SHA-256 | `79e43aad62095b22e8ed03918cf00d3e7cad0623f598835a968a48701e0a80ab` |

These hashes identify tested files. They do not prove subjective audio quality or ownership. The earlier preview's differently edited mix and project have their own hashes in the independent lead review.

## Deployment defect caught and resolved

Netlify returned 404 for `.nojekyll`. Including that GitHub control file in `cache.addAll` would reject cache installation. The final generator excludes it from network precaching while retaining it for Pages builds. Every remaining precache request was then checked against the live host. This closes the observed missing-resource defect; actual installed/offline operation still needs its own device evidence.

## Remaining release gates

Physical iPhone/iPad and VoiceOver acceptance, installed/offline behaviour, genuine storage/memory pressure, owner confirmation of commercial photography rights, software licence and brand clearance. No built-in separation, generative AI, time stretch or native AirDrop/Messages integration is claimed. The independent scores and limitations are in [LEAD_REVIEW.md](LEAD_REVIEW.md).
