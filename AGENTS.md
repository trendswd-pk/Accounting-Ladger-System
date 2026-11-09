# Agent notes

Follow `.cursor/rules/portfolio-product.mdc`, `.cursor/rules/color-scheme.mdc`, and `.cursor/rules/heading-info-icon.mdc`.
When the user shares a UI sample: keep layout/structure from the sample, but map all colors to the official scheme (`primary-*`, `brand-sky` / `brand-ink`, gray surfaces, green/red ledger semantics).
Heading subtitles / helper lines go in an **info** icon beside the heading (not a permanent subtitle under the title), mobile and desktop.
Portfolio pipeline: `demo-mode/` + `Documentation/` (screenshots in `Documentation/images/`).
On changes: update CHANGELOG and version files per the rule — do not wait to be asked.
`demo-mode/` must stay excluded from the main product production build (separate deploy only).
After full setup (or UI screenshot changes): keep root `README.md` professional and embed key images from `Documentation/images/`.
