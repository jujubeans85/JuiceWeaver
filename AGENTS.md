# CRATE JUICE engineering contract

Build reusable systems when there is a demonstrated second use. Keep one-off novelties simple.
Use one source of truth for brand configuration and shared components. Audio/domain logic stays separate.
Every coherent change set needs a second AI lead review. A green deploy is not a functional test.
User content is text, never HTML. No secrets, tracking or silent audio uploads. Scope storage and caches to this app.
Keep source audio intact. Validate imports transactionally; a failure must preserve the current project.
Use a common DSP graph for preview and export. Test outputs, not merely presence of controls.
Establish evidence for import, playback, mixing, save/reopen and export; reuse relevant prior evidence when those paths are unchanged. Test changed behavior and concrete regression risks. Real iOS and emulated tests are distinct.
Both reviewers must score agreed release categories at least 8/10 from evidence. Mark untested categories pending rather than inventing scores. Apply the proportionate release rules below.
Do not claim flawless software, universal model superiority, untested platform support or commercial certification.
Sharing is deferred. Native sharing and recipient tests are not first-release gates.
No changes to other repositories or DNS, spending, legal choices or private-data transfers without explicit approval.

Owner-approved brief: 15 September 2026. Initial delivery may be an explicitly labelled release candidate if essential physical-device evidence is unavailable.

## Autonomous work and proportionate checks

Scope clarification, 15 September 2026: these autonomous approvals cover iPhone and iPad web-app delivery only. They grant no approval for Mac software, Mac configuration, desktop-system changes or cross-device integration. Such work requires its own authorization. Existing cloud repository/build/hosting operations necessary for the approved iOS app remain in scope.

Owner amendment, 15 September 2026: minimize interruptions and elapsed time while retaining meaningful quality control. No separate review attachment is required for the current requested work.

- Routine reversible fixes, styling, tests, commits, pull requests and releases within the approved app scope are already authorized. Do the work and report the result; do not request repeated approval.
- Technical verification is our responsibility, not another task for the owner. Retain an independent AI lead for each coherent change set, with a focused review and useful parallel work rather than serial ceremony.
- Choose checks by impact. Verify changed behavior and plausible failures; do not repeat the entire release suite for a cosmetic or documentation change. Stop optional testing once the remaining risk is adequately bounded.
- If a test tool fails, make one reasonable recovery attempt, then use a supported alternative where available. Retry again only when new evidence materially improves the prospect of success. Distinguish a tool failure from an application failure. Do not bypass tool restrictions or present unperformed tests as passed.
- The primary and lead may approve a reversible release candidate with clearly bounded, noncritical uncertainty, relevant alternative evidence, and a known rollback that preserves user data and project-format compatibility. Document what is verified and what remains pending. This is not permission to waive evidence for core functionality.
- Hold the affected release for a credible unresolved risk introduced or worsened by the change: audio/project loss, a privacy/security defect, or broken core functionality. An existing bug the candidate addresses, or missing optional/device evidence alone, is not automatically such a blocker. Keep working on resolution or isolation; report a genuine blocker once, with its consequence and next action. Do not turn unavailable tooling into an indefinite retry loop.
- Ask the owner only when a consequential decision is outside existing authorization: spending, legal commitments, new sensitive-data transfers or expanded access, destructive actions, or a material tradeoff in the requested outcome. Batch such decisions and provide a recommendation plus a concrete reviewable result. Honor any mandatory platform approval.
- Preserve project data and rollback capability. Do not clear storage or reinstall an app simply to update it. Brief handoffs should say what changed, what was checked, what remains uncertain, and whether it is live.
- Approval of the current work does not select unspecified repository deletion/merger options. Other repositories remain read-only until a concrete sweep is authorized.

