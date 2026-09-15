# Independent lead review — JuiceWeaver 1.0.0-rc.1

**15 September 2026 · Decision: approve an explicitly labelled evaluation candidate; withhold finished-flagship approval.**

The rebuilt studio has working, verified desktop workflows and a recognizable CRATE JUICE identity. Its canonical evaluation link is [juiceweaver.netlify.app](https://juiceweaver.netlify.app/). Physical iPhone/iPad and actual installed/offline acceptance remain unverified. Those essential gaps cannot be averaged away to satisfy the owner's requirement that both reviewers score every release category at least 8/10.

This is a separate AI lead review, not a human certification, security audit or guarantee of flawless software or commercial success. Model suitability is assessed in [BUILD_DECISIONS.md](BUILD_DECISIONS.md); the evidence supports this implementation workflow, not universal superiority over Grok.

## Reviewed artifacts

| Artifact | Identifier and scope |
| --- | --- |
| Fully exercised browser preview | Main commit `5828323460cf6890cc43144a2673aa2bfc6810ab`, source fingerprint `2e2661865808f6317c981c538d318f2f9f74c79b079f6cb29d6590898f8d5394` |
| Subsequent candidate reviewed in source | Fingerprint `e9c78981160fefb36ce43a253dbc10f70509e223619e3aa54c138e3f8f0516b9`; adds seek release on pointer-up/cancel, palette-aware hover and deployment/error-page changes |
| Canonical-host alignment reviewed in source | Fingerprint `a639e22f74277bd1a2b2a939ca9862b3af1de30a6193939a28cc4006abd75f41`; the runtime-byte changes from the prior candidate are the canonical/Open Graph URLs and missing-page return link pointing to `https://juiceweaver.netlify.app/` |
| Final evaluated deployment | Application/build-generator fingerprint `4fba5ae15dee9772dae33b4eaab962c96c40723a2a7b46108a41dc1b771ae332`; Netlify deploy `6aa8a703436701800798e216`, published 15 September 2026 at 02:02:05 UTC; [immutable deployment](https://6aa8a703436701800798e216--juiceweaver.netlify.app/) |
| Browser environment | Cloud Chrome 151, native Web Audio at 48 kHz; neither physical macOS hardware nor iOS is inferred from its user-agent string |
| Native evidence | [Audio and isolated IndexedDB transcript](NATIVE_BROWSER_EVIDENCE.md), plus [complete studio workflow evidence](UI_WORKFLOW_EVIDENCE.md) |

The later candidates' focused source changes are approved for evaluation deployment. The exact PR 3 head `1496abfe895481e7f1a2855a1803890cf8880295` was also inspected before evaluation merge: preview retirement waits for normal activation, deletes only its own scope-delimited cache and unregisters, without touching recovery storage or other applications. [Final deployment evidence](RELEASE_EVIDENCE.md) identifies each tested candidate separately; earlier browser passes do not automatically certify every later change.

The final cache-generator correction excludes GitHub's `.nojekyll` marker from network precaching and includes the generator source in the fingerprint. I reviewed that exact change. Both consecutive builds agreed; all 31 required precache HTTP requests returned 200, the deployed fingerprint matched, `/sw.js` returned `Cache-Control: no-cache`, and the nested 404 returned to the canonical root. These checks resolve the observed missing-resource defect; they do not prove worker installation or offline navigation.

## Independent verification

I inspected the audio engine, demo/PCM writer, import preflight, project parser, local commands, recovery transactions, controller, shared foundation, layout, build, cache scope, development server and deployment configuration. I independently ran **33 unit tests** and the source/module/HTML checks; all passed.

The implementation agent's captured browser transcript records **16/16 native audio checks** and **10/10 isolated IndexedDB checks** on the exact preview above. These are actual browser APIs, not handwritten API mocks. I reviewed their assertions and results. Audio checks cover shared timing, opposite-polarity cancellation, mute/solo, pan isolation, render format, effects/tail, clipping protection, malformed input, pre-decode duration rejection, loop modes, interruption handling and cancelled playback. Storage checks cover original-byte recovery, ordering/coalescing, stale writers, corruption rejection and namespace isolation. The proof creates and deletes only its uniquely named test databases.

The browser workflow also exercised the real export modal, downloaded a project, reopened that actual file through the Open picker, recovered after page reload, rejected an invalid import without changing the loaded mix, and downloaded a WAV. A generated second tool's counter changed from 0 to 1 using the shared foundation.

I independently inspected both downloaded files:

| Output | Independent result |
| --- | --- |
| `Last-train-first-light.juice` | 14,663,904 bytes; four original RIFF/WAV payloads; all four stems retained the applied +1.5 dB bass, −1.5 dB treble and 0.08 drive settings |
| Project SHA-256 | `dc9afb50febe796d871aa0584970c745576c97cfbc424d829b37ec3762538591` |
| `Last-train-first-light.wav` | 4,573,136 bytes; stereo PCM16, 48,000 Hz; 1,143,273 frames / 23.8181875 seconds; peak 9,942 PCM16 units and no clipped samples in this tested mix |
| WAV SHA-256 | `b95f6ed528fbe47cdecfff064af4859df84b3ea2fb5ead68fd0f5568e637059a` |

Hashes identify these artifacts and detect changes; they do not prove authorship or ownership.

The Netlify interface was separately exercised under its deployed CSP: the actual project picker and replacement dialog restored four tracks, and project/WAV downloads completed. I independently parsed both downloaded artifacts: the 14,663,727-byte project retained four original sources (SHA-256 `55e379949d97821e46f1a6c531ac0796c5da39f8778974a8b9474572768004af`), and the 4,573,136-byte WAV is stereo PCM16 at 48 kHz with 1,143,273 frames (SHA-256 `79e43aad62095b22e8ed03918cf00d3e7cad0623f598835a968a48701e0a80ab`). Sage styling and continued seek progress after pointer release were observed on the first live candidate; canonical-host reload/recovery was observed after metadata alignment. The final generator edit did not alter the audio engine, project modules, controller, styling or page resources exercised by those workflows.

I also inspected the captured desktop and 390 × 844 CSS viewport screenshots. The separate layout reviewer and I independently rated the desktop 8.5/10 and the narrow empty/loaded states 8.3/10. Branding, hierarchy, primary actions and waveforms are clear, with no visible horizontal overflow in the captured states. Those captures do not show every narrow dialog or prove VoiceOver behaviour.

## Scores and release gates

These are bounded engineering judgments against the evidence, not benchmark scores or an average product rating.

| Category | Lead score | Evidence boundary |
| --- | ---: | --- |
| Audio and core desktop workflows | 8.5/10 | Native audio outputs and actual import/save/reopen/recovery/export sequence verified; subjective listening and device routing remain untested |
| Visual polish and interface accessibility | 8.3/10 | Desktop/narrow captures, keyboard behaviour, labels, focus styling, dialog semantics and reduced motion reviewed; physical VoiceOver and every narrow dialog unverified |
| Privacy and data integrity | 8.5/10 | No implemented audio upload, account or analytics; transactional import, exact originals, strict bounded archives and isolated recovery verified; genuine quota exhaustion and hostile-browser/security audit not performed |
| Maintainability and reusable foundation | 8.0/10 | Shared bounds, brand/configuration, actual second consumer, separate domain modules, deterministic build and meaningful tests; future growth should keep the compact controller from accumulating unrelated responsibilities |
| Online evaluation deployment | 8.0/10 | Canonical HTTPS/fingerprint, live security headers, real CSP-constrained picker/download workflows, focused seek/theme checks, nested 404 and all cache-resource URLs verified; actual worker installation/offline navigation remain unverified |
| Physical iOS usability | **Unverified — release gate not passed** | No physical iPhone/iPad import, playback, interruption, Files download, recovery or installed-app acceptance evidence |

The core module author independently reported 8.8/10 within its tested module scope, and the audio module author reported 8.5/10 within the tested Chrome/48 kHz foreground workflow. Both explicitly excluded physical iOS and browser-internal memory pressure. Their agreement corroborates the module review; it does not fill the missing device evidence.

## Findings resolved during oversight

- Replaced unsupported original feature claims with implemented behaviour and an explicit deferred-feature list.
- Centralized parameter/file limits; reject overlong PCM before native decode and invalid PCM before graph creation.
- Preserved original audio across save/reopen and shared the live/offline effect graph. Peak protection only reduces excessive levels.
- Corrected short-stem timeline behaviour, bounded sub-second looping, pending-play cancellation, live room-tail timing and switching Loop off after a complete cycle.
- Serialized expensive recovery saves, coalesced pending requests, preserved clear/read ordering and rejected stale writers transactionally.
- Added candidate-before-commit imports, conservative working-memory reserves, export serialization, stale-result rejection, prompt invalidation and dependable undo snapshots.
- Corrected native Space activation on buttons, seek gesture release, mobile font sizing, safe-area spacing and dialog labelling.
- Scoped caches and recovery to the application/preview; prevented forced service-worker takeover of an open project; restricted the development server to loopback by default and denied hidden/path-escape access.
- Made scaffold overwrites explicit and kept source/version/build information consistent. Palette hover now follows the chosen accent. Missing-page recovery returns to the known application URL.
- Caught Netlify's 404 for `.nojekyll` before release handoff, removed that control file from network precaching and made generator changes part of the artifact fingerprint. Retested every required live resource.

## What still prevents flagship sign-off

1. Run the physical iPhone/iPad acceptance sequence on the final artifact: import, edit, save/reopen, Files downloads, interruption/resume, reload recovery and installed/offline behaviour. Record device, OS, browser, artifact fingerprint and results. Include VoiceOver and narrow dialogs.
2. Verify actual worker installation, genuine offline navigation and safe update behaviour. Cloud-browser policy blocked internal worker diagnostics; no indirect workaround or invented pass was used. Successful HTTP resource checks and reviewed cache code do not satisfy this gate.
3. Keep memory claims bounded. Compressed metadata supplies duration but assumes stereo until decode; unsupported multichannel compressed audio can temporarily allocate beyond that estimate before rejection. Native decoder/OS peak memory and real quota exhaustion have not been measured. Browser recovery remains supplementary to an exported backup.
4. Resolve the owner's outstanding photography, software-licence and brand-clearance decisions before commercial launch. Existing repository presence is not a transferable commercial asset licence. The existing Netlify site now supplies application hosting without a plan upgrade, paid add-on, new account or DNS change; existing account terms still apply. Pages remains an evaluation fallback. Recovery does not migrate between origins automatically: export a `.juice` project on the old host and open it on the new one.

There is no known critical defect in the verified foreground mono/stereo desktop workflow. This review authorizes evaluation of the reviewed candidate and preserves the owner's stricter threshold for calling the application a finished CRATE JUICE flagship. Native AirDrop/Messages integration is deferred by the owner's amendment and is not a first-release gate.
