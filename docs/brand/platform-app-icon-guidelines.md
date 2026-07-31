# SIGIDI platform app icon guidelines

## Decision

SIGIDI must use a platform-specific app icon asset for each delivery format.

Do not send one rounded-square bitmap to every platform. Each platform owns a
different part of the final icon shape.

## Previous failure

The previous macOS nightly build used a flattened `.icns` file. Its source
bitmap was opaque to all four edges. The installed app therefore appeared as a
sharp square in the Dock.

The source generator applied guidance for modern layered Apple icons to that
legacy flattened `.icns` file. These are different delivery paths.

## Required assets

| Target                           | Delivery asset                                               | Corner ownership                                                      | SIGIDI rule                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS 26 and later               | Icon Composer `.icon`                                        | macOS applies the rounded mask and material effects                   | Supply square, unmasked layers on a 1024 x 1024 canvas. Keep the automaton centered.                                                                                                     |
| Older macOS and `.icns` fallback | Multi-size `.icns`                                           | The flattened artwork must already have a suitable silhouette         | Use the Apple macOS icon template. Keep transparent pixels outside the rounded enclosure. Export all standard ICNS sizes.                                                                |
| Windows                          | Multi-size `.ico`                                            | Windows displays the supplied silhouette                              | Use transparent outer pixels. Do not copy the Apple rounded enclosure. Include at least 16, 24, 32, 48, and 256 px renditions. Check the mark at each small size.                        |
| Linux desktop                    | SVG and sized PNG files                                      | The desktop environment displays the supplied silhouette              | Use a neutral transparent silhouette. Supply SVG where supported and sized PNG fallbacks. Do not force an Apple mask.                                                                    |
| Android                          | Adaptive icon foreground, background, and monochrome layers  | The device launcher applies its selected mask                         | Use 108 x 108 dp layers. Keep essential artwork inside the 66 x 66 dp safe zone. Do not pre-round the layers.                                                                            |
| Installable web app              | Manifest `maskable` icon and a separate general-purpose icon | The browser or operating system applies the mask to the maskable icon | Make the maskable file full-bleed and opaque. Keep essential artwork inside the central safe circle with radius 40% of the image size. Keep a separate transparent general-purpose icon. |
| Browser favicon                  | SVG and small PNG or ICO renditions                          | The browser displays the supplied pixels                              | Use the simplified small SIGIDI mark on transparency. Test at 16 and 32 px.                                                                                                              |
| Apple web bookmark               | `apple-touch-icon` PNG                                       | Apple controls its presentation                                       | Supply a dedicated PNG. Do not reuse the transparent favicon.                                                                                                                            |

SIGIDI does not currently ship a native iOS app. A future native iOS app must
use the same modern Apple `.icon` source as macOS, with platform-specific
preview and validation.

## macOS delivery

Apple's current guidance uses a 1024 x 1024 square layout for iOS, iPadOS, and
macOS. The system applies the final rounded rectangle. Apple also states that
pre-masked layers can produce jagged edges and weaker material effects.

That guidance applies to a layered Icon Composer file. The previous Electron
package supplied only `icon.icns`. The Dock screenshot proved that its
full-bleed flattened file did not receive the required final treatment.

The macOS package now contains:

1. A layered Icon Composer `.icon` file for current macOS.
2. The fallback `.icns` that Apple's asset compiler generates from the same
   project.
3. A separate `.icns` file for the DMG volume icon when the packaging tool
   requires it.

Electron Builder 26 supports `.icon` input and compiles it into an asset
catalog. It also generates the fallback `.icns`. The SIGIDI build stages the
channel-specific project and selects `app-icon.icon`.

## Observed cross-platform practice

Current cross-platform applications keep one recognizable brand concept and
export different delivery assets. They do not use one unchanged bitmap for
every operating system.

### Signal Desktop

Signal Desktop provides a useful current Electron example:

- The macOS application uses `build/icons/mac/AppIcon.icon`.
- The DMG volume uses a separate `build/dmg/icon.icns`.
- Windows uses `build/icons/win/icon.ico`.
- Linux uses the sized PNG directory `build/icons/png`.

This separates the modern macOS app treatment from the legacy DMG icon. It also
lets Windows and Linux use their native file formats.

Source:
[Signal Desktop package configuration](https://github.com/signalapp/Signal-Desktop/blob/main/package.json).

### Visual Studio Code

Visual Studio Code also packages explicit platform resources:

- Windows executable resources use `resources/win32/code.ico`.
- Linux packages install `resources/linux/code.png`.
- Its product configuration selects different branding for stable, preview,
  and development builds.

Source:
[VS Code Electron packaging](https://github.com/microsoft/vscode/blob/main/build/lib/electron.ts),
[VS Code Linux packaging](https://github.com/microsoft/vscode/blob/main/build/gulpfile.vscode.linux.ts),
and
[VS Code Windows packaging](https://github.com/microsoft/vscode/blob/main/build/gulpfile.vscode.win32.ts).

### Bitwarden Desktop

Bitwarden keeps platform packaging rules in Electron Builder configuration and
uses a separate `dmg.icns` for its disk image. It also has a separate beta
configuration and app identity. Electron Builder resolves the platform app
icons from its build resources.

Source:
[Bitwarden Electron Builder configuration](https://github.com/bitwarden/clients/blob/main/apps/desktop/electron-builder.json)
and
[Bitwarden beta configuration](https://github.com/bitwarden/clients/blob/main/apps/desktop/electron-builder.beta.json).

### Common production model

The repeated model is:

1. Keep one vector brand master and shared composition rules.
2. Create a dedicated Apple Icon Composer source for the current macOS app.
3. Keep a separate shaped `.icns` fallback and DMG icon.
4. Export a multi-resolution Windows `.ico`.
5. Export Linux SVG or sized PNG assets.
6. Keep Android adaptive layers and web maskable assets separate from desktop
   files.
7. Make release channels distinct without changing the central brand mark.
8. Inspect small sizes and installed applications instead of approving only a
   large source preview.

## Verification

Do not approve an app icon from its 1024 px source alone.

For each release channel:

1. Build the actual package.
2. Install and launch it.
3. Compare its Dock, taskbar, or launcher size and shape with native apps.
4. Check light and dark backgrounds.
5. Check the smallest supplied sizes for lost limbs, joints, and axe detail.
6. Confirm that platform masks do not crop the automaton or axe.
7. Confirm that production, preview, nightly, and development remain easy to
   distinguish.

The macOS proof must include the installed app in the Dock. A source preview or
DMG Finder preview is not sufficient.

## Primary sources

- [Apple Human Interface Guidelines: App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Apple: Creating your app icon using Icon Composer](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer)
- [Apple WWDC25: Create icons with Icon Composer](https://developer.apple.com/videos/play/wwdc2025/361/)
- [Apple Design Resources](https://developer.apple.com/design/resources/)
- [Microsoft: Design guidelines for Windows app icons](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-design)
- [Microsoft: Construct your Windows app icon](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-construction)
- [Android Developers: Adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)
- [Freedesktop.org Icon Theme Specification](https://specifications.freedesktop.org/icon-theme/latest/)
- [W3C Web Application Manifest: Icon masks and safe zone](https://www.w3.org/TR/appmanifest/#icon-masks)
- [Electron Builder: Icons and images](https://www.electron.build/docs/features/icons-and-images/)
