# Approved SIGIDI identity source

## Authoritative design

The approved design is:

`docs/brand/concepts/round-2/c2-refined.png`

Use this raster exactly as designed. Do not redraw, trace, simplify, reposition, or reinterpret the mark.

This is the approved starting baseline. It can be refined in a later design round. Until that round is approved, use the current files consistently and do not make isolated changes to individual derivatives.

The approved source contains:

- The monochrome C2 Forged Automaton mark.
- The iron-black production app icon with the warm off-white mark and ember blade.
- The horizontal mark and `SIGIDI` wordmark lockup.

## Derivative rule

Production derivatives can crop, remove the white presentation background, add required transparent padding, and resize for platform requirements. They must not change the geometry, pose, proportions, colors, wordmark, or spacing within each extracted design.

## Approved derivatives

- `assets/sigidi-app-icon-production-1024.png`
- `assets/sigidi-mark-1024.png`
- `assets/sigidi-lockup.png`
- `assets/sigidi-wordmark.png`

## Regenerated files

- `sigidi-mark.svg`
- `sigidi-mark-small.svg`
- `sigidi-wordmark.svg`
- `sigidi-lockup.svg`
- `sigidi-app-icon-production.svg`
- `proofs/vector-approval-board.png`
- `proofs/small-mark-size-proof.png`
- `proofs/channel-app-icon-family.png`

The SVG files are portable SVG containers with the exact approved raster derivatives embedded. They preserve the approved design, but they are not redrawn vector paths.

`sigidi-mark-small.svg` currently preserves the exact full mark. The size proof shows that fine C2 details collapse at 16 pixels. A distinct simplified favicon mark requires separate design approval.

Run `node docs/brand/approved/generate-assets.mjs` from the repository root to regenerate all approved derivatives and proofs from `c2-refined.png`.

Run `pnpm icons:export` to regenerate the platform icon family. The channel proof order is production, development, preview, and nightly.

The earlier derivative review board remains at `proofs/approved-derivatives-board.png`.

## Rejected work

The SVG files under `docs/brand/masters/c2-candidate/` and `docs/brand/masters/c2-faithful/` are rejected experiments. Do not use them as brand sources.
