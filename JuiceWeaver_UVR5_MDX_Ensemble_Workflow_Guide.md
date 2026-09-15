# Prepare stems with UVR, then mix in JuiceWeaver

**For JuiceWeaver 1.0.0-rc.1 · sources checked 15 September 2026**

JuiceWeaver mixes audio parts you supply. It does not turn a finished song into stems. **Ultimate Vocal Remover (UVR)** provides a free desktop preparation route; the official project offers Windows/macOS bundles and Linux installation instructions. Start with the [official UVR repository](https://github.com/Anjok07/ultimatevocalremovergui), then use its [release downloads](https://github.com/Anjok07/ultimatevocalremovergui/releases).

## The simplest useful route

1. **Install the appropriate official desktop build.** Mac users should choose the build for Apple silicon or Intel. Start with the regular release before evaluating beta models. If macOS blocks an app you have verified, follow [Apple's per-app opening procedure](https://support.apple.com/en-au/102445); do not disable Mac security globally.
2. **Start with a short excerpt**, ideally 15–60 seconds. Choose a local input file and a new output folder so the original stays intact.
3. **Use a four-stem Demucs model**, such as `htdemucs` when available in the installed UVR model list. Obtain missing models through the app's Settings/Download Center. UVR documents Demucs v4 support; model availability and labels can vary by release. [UVR release instructions](https://github.com/Anjok07/ultimatevocalremovergui/releases)
4. **Request all four stems and WAV output.** The four-part layout is drums, bass, vocals and other instruments. `htdemucs_ft` is an optional slower comparison after the basic workflow works; the Demucs project describes it as potentially better, not a guaranteed improvement. [Official Demucs model/output documentation](https://github.com/facebookresearch/demucs)
5. **Keep every output aligned.** Use the same start/end range for all four files. In JuiceWeaver, choose **Add stems**, select them together, press Play and balance by ear. Solo each part to find separation artefacts, then judge it in the mix.
6. **Save a `.juice` project** for editable stems/settings. Export a WAV when you want one finished mix. Keep the original recording and your separated WAVs as well.

The linked [Demucs repository is archived](https://github.com/facebookresearch/demucs). Use it as a model/output reference; the installed UVR release and its available model list govern the practical steps.

UVR runs as a separate desktop application. It is not installed inside JuiceWeaver and is not an iPhone/iPad separation feature. Move prepared files to the device's file picker by your usual file-transfer method; a native JuiceWeaver sharing flow is deferred.

## Keep the first attempt small

JuiceWeaver accepts up to eight mono/stereo stems, each no longer than 180 seconds. Limits are 64 MiB per source file, 96 MiB total source audio and 96 MiB total decoded audio. They apply together. If the session is too large, shorten every stem to the same musical range. PCM WAV avoids many browser codec uncertainties.

For UVR memory errors, the project recommends reducing Segment or Window size. Processing speed depends on hardware and model choice. [Official UVR troubleshooting](https://github.com/Anjok07/ultimatevocalremovergui#troubleshooting)

## When to try MDX or an ensemble

Use a vocal/instrumental model when you want those two parts rather than four instrument groups. Evaluate a short difficult passage first. An ensemble compares or combines model results and adds processing; it is a later experiment, not a required setup step. There is no verified “MDX23C + MDX32C” recipe bundled with this app. UVR documents MDX23C support and supplies its model selection through its own releases. [UVR model support](https://github.com/Anjok07/ultimatevocalremovergui/releases)

Listen for missing consonants, softened drum attacks, watery cymbals and bass leakage. Keep the result that serves the mix. An attractive model name is not a listening test.

If you already have stems from a recording session or DAW, import those directly. This guide requires no account, subscription or model API integration in JuiceWeaver. It does not grant rights to recordings or select a licence for CRATE JUICE.
