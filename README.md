# CRATE JUICE / JuiceWeaver

**Every part. A new possibility.**

JuiceWeaver is a local stem studio: bring separate audio parts, shape the mix, save an editable project and export a WAV. It also establishes the shared CRATE JUICE design and engineering foundation for future tools.

[Open JuiceWeaver](https://juiceweaver.netlify.app/) · **1.0.0-rc.3 — evaluation release candidate**

The owner reports all RC1 functions passed on their iOS phone. iPad testing remains pending; the newly added RC2 effects and icon still need their own device pass. This is an evaluation build, not a certified commercial release. Earlier “3.0” documentation described capabilities that were not implemented; this README describes the current code.

## Make something in a minute

1. Choose **Play the demo** for four original parts at 88 BPM, or **Add stems** to import your files. Use stems exported from the same starting point.
2. Press Play. Adjust levels; **M** mutes a part and **S** solos it. Select a stem to adjust pan, bass, treble, drive, room, timbre and glitch.
3. Try **Warm the mix** or **Softer keys**. Review the proposed change, then choose **Apply change**. These are deterministic local commands, not an AI model. Use one change at a time; unsupported requests leave the mix unchanged.
4. Choose **Save project → Prepare project → Download project** to keep the original audio and settings in one `.juice` file. Use **Open** to restore it. Browser recovery is convenient; a downloaded project is your backup.
5. Choose **Export mix → Prepare WAV → Download WAV** for a stereo 48 kHz, 16-bit WAV. Peak protection only reduces excessive levels; it never boosts a quiet mix. An audible room effect adds a two-second tail.

Undo/redo is available. On desktop, Space toggles playback away from editors, dialogs and interactive controls; focused buttons keep their normal Space action. Cmd/Ctrl+Z undoes a change outside an editor or dialog. **Make it yours** changes the backdrop, accent and motion preference.

## New sound controls

Select a stem in **The parts**. All tone controls and presets apply only to that selected stem.

- **Timbre:** move toward Body for rounder low-mid character, or Presence for more forward upper-mid character. It changes spectral colour without changing pitch.
- **Glitch:** add a tempo-linked, irregular rhythmic gate. Higher values deepen the cuts; exported WAV uses the same processing.
- **Presets:** choose Clean slate, Velvet body, Clear glass, Broken beat, Carriage radio or Fractured space; read the description, then Apply. Presets replace the six effect settings while preserving level, pan and range choice. Undo restores your previous settings.
- **Widen effects +50%:** an independent choice for each stem. Bass/treble extend from ±12 to ±18 dB; Timbre extends from ±100% to ±150%; Drive, Space and Glitch extend to 150%. Gain and pan retain their normal limits. Switching widening off brings extended values back into the normal range; Undo restores them.

Old `.juice` projects open with the new effects off. RC2 saves use project format 2 so these new settings survive a round trip; an older RC1 app cannot open those new files. Keep an original backup if you need to return to RC1.

## What to expect

| Capability | Current behaviour |
|---|---|
| Mixing | Shared start time, seek, whole-session loop, gain, mute/solo, pan, shelves, drive, room, timbre and rhythmic glitch |
| Shorter stems | Silence after their end until the next whole-session loop |
| Tempo | Stored tempo sets the glitch rhythm; no automatic beat matching or time stretching |
| Import | Mono/stereo audio the current browser can inspect and decode; PCM WAV is the most predictable starting point |
| Limits | 8 stems; 180 seconds each; 64 MiB per source file; 96 MiB total originals; 96 MiB total decoded audio |
| Privacy | Audio processing and commands run locally; no account, analytics, model API or audio upload is implemented |
| Separation and generation | Not built in. Use the [desktop stem-preparation guide](JuiceWeaver_UVR5_MDX_Ensemble_Workflow_Guide.md) when starting with a full mix |
| Sharing | Native AirDrop/Messages integration is deferred; ordinary file downloads are available |

The limits apply together: eight long stereo files can exceed the decoded budget before reaching the per-file duration limit. Short excerpts are a useful starting point.

## iPhone, iPad and updates

Use the browser file picker to import, and keep the studio in the foreground while working. Audio pauses when the app is hidden or interrupted; tap Play to continue. Check Files → Downloads after downloading, or your configured Safari download location.

In Safari, open the Page Menu if needed, then **Share → Add to Home Screen**. Choose **Open as Web App** when offered, then Add. [Apple's current Home Screen instructions](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios)

Offline support caches the application after a successful online load; browser storage and installation behaviour still need physical-device verification. When an update is offered, save a `.juice` backup, close all JuiceWeaver tabs/windows and reopen. An update never deliberately takes over an open project.

## Develop and reuse the foundation

Use Node 24, as specified in `.nvmrc` and `package.json`. There are no third-party JavaScript runtime dependencies.

```sh
npm ci
npm test
npm run check
npm run build
npm run dev
```

Open [the local studio](http://localhost:8765/). The build creates `dist/`, a source fingerprint in `release.json`, and the matching service worker. Build output is generated; edit the source.

```sh
npm run scaffold -- my-next-tool
```

This creates a small working example under `examples/my-next-tool/`, sharing `foundation/brand.js` and `foundation/tokens.css`. Give it its own configuration and application logic. JuiceWeaver identity lives in `src/config.js`; audio and project logic stay in their own modules. Follow [AGENTS.md](AGENTS.md) for the release and review contract.

Run the browser proof pages through the local server: [audio](http://localhost:8765/tests/audio-proof.html) and [projects/storage](http://localhost:8765/tests/core-browser.html). The [RC2 release review](docs/RC2_REVIEW.md) records this iteration. The [native browser evidence](docs/NATIVE_BROWSER_EVIDENCE.md), [studio workflow results](docs/UI_WORKFLOW_EVIDENCE.md) and [final deployment checks](docs/RELEASE_EVIDENCE.md) identify their exact artifacts and evidence boundaries. See [audio architecture](src/audio/README.md) for the DSP/API details.

## Hosting

The canonical application link is **https://juiceweaver.netlify.app/**. It uses the existing Netlify site; this release does not change its plan or billing settings. Netlify runs tests and checks before building the published `dist/` output.

This release was published through the connected Netlify deployment tool. Do not assume a future GitHub merge automatically republishes that site. For each release, run the checks/build, deploy to the existing site, verify its `release.json` fingerprint and retain the preceding deployment for rollback.

Recovery is local to each origin. To move an existing session from Pages or the old preview, save a `.juice` backup there and open that file on the new site. Hosting changes do not transfer recovery automatically.

[GitHub Pages](https://jujubeans85.github.io/JuiceWeaver/) remains an evaluation fallback. GitHub Pages restricts commercial SaaS and sites primarily facilitating transactions; the Netlify deployment supplies suitable application hosting, while the remaining device and owner release decisions are still outstanding. [GitHub's current Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

No project software licence or trademark clearance is granted by this README. Those owner decisions remain separate from implementation.

## RC3 touch and import update

File import no longer waits for playback permission after the system file picker. Playback starts only with Play. Effects, stem levels and output now have larger rails, exact-step minus/plus buttons and a Reset button. Double-tap the displayed value to reset it. Bipolar controls show a zero marker. Default output reset is -6 dB; effect and stem-level resets are zero. Changes remain undoable. Function panels have lighter warm glass with brighter labels. The owner confirms Home Screen installation; the new import/control fix still needs an on-device check.
