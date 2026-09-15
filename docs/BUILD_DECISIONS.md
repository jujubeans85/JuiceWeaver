# CRATE JUICE build decisions — 15 September 2026

## Evidence first

The starting main commit was `cc78f36d1d602034e031589d310a55fda5c56c24`. The live GitHub Pages application displayed PILOT v0.3. The documentation claimed version3.0, native sharing, separation and generative audio, but these claims did not correspond to working source. Browser interactions reproduced missing `loadDemoStems`, missing `exportProject` and a missing upload target. A successful Pages deployment did not prove functionality. No supplied transcript established which claims were authored by Grok; attribution remains unverified.

| Claimed capability | Starting evidence | Current disposition |
| --- | --- | --- |
| Import, mix and export | Incomplete handlers; no working engine | Native audio engine, transactional imports, editable DSP and PCM WAV |
| Project persistence | No complete round trip | .juice archive retains original audio with SHA-256 integrity; scoped recovery |
| AI Weave | Interface/claims without connected model | Honest local command interpreter with preview, supported grammar and Undo |
| Stem separation | No functioning model runtime | Deferred; free desktop UVR workflow documented |
| Generate, extend, inpaint | No working model/output evidence | Deferred; requires separately benchmarked model, rights, cost and iOS budgets |
| AirDrop/Messages | Unproven native share claims | Deferred by owner amendment; no claim of tested sharing |
| iOS professional readiness | No physical evidence | Touch/PWA foundations implemented; physical certification pending |

## Model suitability

[OpenAI's model documentation](https://learn.chatgpt.com/docs/models) and [developer guidance](https://learn.chatgpt.com/docs/developers) support a coding-agent workflow with tools and verification. [Grok Build](https://docs.x.ai/build/overview) also provides a real coding agent; [xAI model documentation](https://docs.x.ai/developers/grok-4-6) is a competing capability source. Vendor descriptions do not establish a winner on this product.

Codex is suitable for the present implementation because its connected repository access, separate review agent, browser proof and generated output allow the proposed changes to be assessed. The relevant demonstration is working import → mix → save/reopen → export, with evidence linked in the release report. This is a task-specific execution decision, not a controlled GPT-versus-Grok benchmark or a universal superiority claim. The reviewed engineering contract is carried in AGENTS.md for future model handoffs; it does not change global model settings or guarantee future sessions automatically follow it.

## Small reusable foundation

The second consumer is a generated counter fixture. Shared brand rendering and design tokens have two actual users; audio logic stays inside JuiceWeaver. No additional repository, backend, framework, subscription or AI model download is required. The factory refuses accidental overwrites. Extracting a package waits for a real second product's independent release needs.

The styling follows the owner's chlomim studio reference: dark carriage photograph, cream, ember and handwriting. Accent, background, logo, font and motion have explicit configuration. Product artwork remains separately editable. See assets/README.md for provenance and outstanding commercial rights decisions.

## Current tooling and boundaries

The runtime is native browser ES modules/Web Audio/IndexedDB. The development runtime is Node24.19.0, the inspected LTS line; dependencies are intentionally empty. CI action revisions were checked against official releases on15 September2026: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7.0.0](https://github.com/actions/setup-node/releases/tag/v7.0.0). Both actions are pinned to full commit SHAs. Build output is deterministic and reports a content fingerprint. There are no runtime CDNs, account keys, analytics or silent audio uploads in the application. The hosting provider still processes ordinary web requests.

Browser limits are policy estimates:8 stems,180 seconds/source,64MiB/source,96MiB source and decoded totals, plus conservative working-memory reserves. They do not bound browser internals or certify an iPhone's RAM. Non-WAV formats depend on browser codec support. WebKit storage can be evicted; export is the durable user backup. [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/).

A serious separation implementation would require benchmarking on-device inference and model weight licensing, not merely adding a button. [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) and [large-model constraints](https://onnxruntime.ai/docs/tutorials/web/large-models.html) leave this technically possible but unverified here. [Demucs](https://github.com/facebookresearch/demucs) is archived; the documented free desktop [UVR](https://github.com/Anjok07/ultimatevocalremovergui) path supplies real stems without sending audio through this application.

## Deployment

[GitHub Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) prohibit using it to run an online business or commercial SaaS. The Pages link is therefore evaluation hosting. Calling a site a release candidate does not exempt a commercial deployment from those terms.

[Netlify permits commercial projects on its free plan](https://www.netlify.com/blog/introducing-netlify-free-plan/); [current pricing](https://www.netlify.com/pricing/) lists a300-credit monthly Free limit. Usage limits can suspend service. No plan upgrade or paid add-on is part of this build. `netlify.toml` runs tests/checks before publishing only dist, supplies security headers and preserves the service-worker update check. Hosting/account availability is reported separately from source readiness.

Branch-based GitHub Pages deployment remains independent of the advisory Studio quality workflow. Do not call that an enforced deployment gate. Netlify's configured build is checks-then-build; native/physical acceptance still requires release review. Customer-domain DNS changes are not included.
