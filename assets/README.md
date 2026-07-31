# SIGIDI brand icons

The approved C2 raster is the identity source:

- `docs/brand/approved/assets/sigidi-app-icon-production-1024.png`

Do not redraw or trace it. The export script changes only the dark channel treatment. It keeps the light figure and ember blade unchanged.

The channel treatments are:

- Production: iron black
- Development: blueprint blue
- Preview: deep moss green
- Nightly: midnight violet

The Icon Composer projects are generated SIGIDI macOS sources:

- `assets/prod/app-icon.icon`
- `assets/nightly/app-icon.icon`
- `assets/dev/app-icon.icon`

Each project contains the approved automaton as a transparent foreground layer.
Icon Composer supplies the platform enclosure, corners, lighting, and fallback
ICNS renditions.

Run `pnpm icons:export` from the repository root to regenerate the tracked
Icon Composer projects and the Linux, Windows, desktop, marketing, and web
files. The command also copies the development favicon family to
`apps/web/public`.

Run `pnpm icons:check` to verify that the generated files match the approved source. The check does not change files.

Do not edit generated PNG or ICO files directly.
