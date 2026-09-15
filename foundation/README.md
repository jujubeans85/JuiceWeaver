# One recognizable family, separate useful tools

`tokens.css` supplies typography, palette, spacing, buttons, focus, reduced motion and the brand lockup. `brand.js` applies configuration and renders the shared crate mark. Domain logic stays in the application.

Change `src/config.js` to set accent, cream, ink, background (same-origin asset), displayFont, optional logo (same-origin asset) and motion. The in-app appearance panel exposes reversible background, color and movement preferences. Product icons, manifest metadata and preview artwork are deliberately explicit files in `identity/`; update them when changing identity.

Run `npm run scaffold -- my-next-tool` to generate a second app in `examples/my-next-tool`. The generator refuses to overwrite an existing folder unless passed `--force`. The committed `foundation-proof` counter demonstrates two applications sharing the same source files without duplicating the studio engine. Run `npm run dev`, open `/examples/foundation-proof/`, and click Add a beat.

Do not extract a package or create another repository until a real second product needs an independent release cycle. A new application should add its own useful workflow, isolated storage key and automated outcome checks. Keep the CRATE JUICE mark, foundation tokens and accessibility behavior consistent.
