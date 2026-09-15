# CRATE JUICE / JuiceWeaver

**Every part. A new possibility.**

JuiceWeaver is a local stem studio: bring separate audio parts, shape the mix, save an editable project and export a WAV. It also establishes the shared CRATE JUICE design and engineering foundation for future tools.

[Open JuiceWeaver](https://jujubeans85.github.io/JuiceWeaver/) · **1.0.0-rc.1 — evaluation release candidate**

Physical iPhone/iPad verification remains outstanding. This is an evaluation build, not a certified commercial release. Earlier “3.0” documentation described capabilities that were not implemented; this README describes the current code.

## Make something in a minute

1. Choose **Play the demo** for four original parts at 88 BPM, or **Add stems** to import your files. Use stems exported from the same starting point.
2. Press Play. Adjust levels; **M** mutes a part and **S** solos it. Select a stem to adjust pan, bass, treble, drive and room.
3. Try **Warm the mix** or **Softer keys**. Review the proposed change, then choose **Apply change**. These are deterministic local commands, not an AI model. Use one change at a time; unsupported requests leave the mix unchanged.
4. Choose **Save project → Prepare project → Download project** to keep the original audio and settings in one `.juice` file. Use **Open** to restore it. Browser recovery is convenient; a downloaded project is your backup.
5. Choose **Export mix → Prepare WAV → Download WAV** for a stereo 48 kHz, 16-bit WAV. Peak protection only reduces excessive levels; it never boosts a quiet mix. An audible room effect adds a two-second tail.

Undo/redo is available. On desktop, Space toggles playback away from editors, dialogs and interactive controls; focused buttons keep their normal Space action. Cmd/Ctrl+Z undoes a change outside an editor or dialog. **Make it yours** changes the backdrop, accent and motion preference.

## What to expect

| Capability | Current behaviour |
|---|---|
| Mixing | Shared start time, seek, whole-session loop, gain, mute/solo, pan, shelves, drive and room |
| Shorter stems | Silence after their end until the next whole-session loop |
| Tempo | Project metadata; no automatic beat matching or time stretching |
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

Run the browser proof pages through the local server: [audio](http://localhost:8765/tests/audio-proof.html) and [projects/storage](http://localhost:8765/tests/core-browser.html). The [captured audio prototype evidence](docs/AUDIO_PREVIEW_EVIDENCE.md) identifies its exact preview version and browser; it does not certify subsequent edits or physical iOS behaviour. See [audio architecture](src/audio/README.md) for the DSP/API details.

## Hosting

The Pages link is for evaluation. GitHub Pages restricts commercial SaaS and sites primarily facilitating transactions; commercial launch needs suitable hosting and the remaining release gates. [GitHub's current Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

No project software licence or trademark clearance is granted by this README. Those owner decisions remain separate from implementation.
