# Transferable field notes

## Profile-adjusted reuse is not product activation

Keeping integration source, workspace membership, tests and established build owners makes upstream synchronization cheaper. A narrow product remains safe when its immutable profile is applied by the existing lifecycle owners before persisted hydration, registration, side effects and interaction.

Prefer one checked-in build-time selector over deleting inherited integrations or creating parallel local implementations. Keep the default profile fail-closed, keep the richer profile maintainer-only, and prove that runtime state cannot change it. If an existing owner cannot express the constraint, reopen the architecture decision before adding a new owner.

Workspace and lockfile membership are source-maintenance boundaries, not reliable product-policy boundaries. Product builds and artifacts can use focused existing commands without changing the full repository graph.

Build profiles control compiled composition. They do not authorize CI events, cloud deployment, signing, notarization or publication; those require separate external-action gates.

Inspect every process and bundle boundary. A define that reaches the Electron main bundle can still be absent from an externalized preload dependency or a separately built child server. Prove the selected profile in each final entry artifact, not only in source configuration.

Apply the profile to staged production dependencies as well as compiled entry points. A dormant integration can pull optional native packages into `app.asar.unpacked` through the stage manifest even when no local code activates it. Keep the dependency in the richer profile and omit it from the narrow artifact through the existing packaging owner.

When an artifact builder generates a reduced production manifest, pin every retained direct dependency to the exact version in the repository lockfile. Installing a ranged generated manifest without the root lockfile can silently select a newer native or platform package, make the build non-reproducible, and fail for reasons unrelated to the candidate.

A capability can be inactive and still crash a packaged app when its top-level import is externalized. When a narrow artifact omits an integration dependency, inspect the final entry bundle for external `require` or `import` edges and launch the packaged executable. Bundle the inactive dependency through the established build owner when a source-level profile guard cannot prevent module resolution.

Run packaged startup proof on a verified free port with an isolated data home. Do not accept a readiness response until the listening process belongs to the candidate; another installed build can make a broken candidate look healthy. Require the candidate process, its child server, the readiness contract, and the main-window milestone to remain healthy before stopping only the captured process.

Do not invent a data-home marker when build profiles are intended to share established local data. A marker that rejects a non-empty home is a migration policy, not a capability boundary. Keep profile enforcement in existing composition owners, and use the established data-path owner unless the plan settles a separate migration, backup, and recovery contract.

Do not remove a route source file merely to hide it when generated route types or links still depend on that file. Prefer the route's existing `beforeLoad`, navigation catalog, search catalog and composition owners so the route graph stays type-correct while user interaction remains unavailable.

## Preserve the established stack

Repository engine and package-manager declarations are proof inputs. Do not present them as a new technical direction. Reuse native commands and existing seams before adding tooling.

## Isolate proof before cutover

A baseline launch can mutate real state before the candidate is proven. Materialize explicit temporary home, app-data, state, and credential paths before the first runtime proof. A shipped app can still use the canonical shared home when that is the confirmed product contract.

Audit pre-ready and synchronous startup readers as well as the main application bootstrap. When profiles share state, apply capability policy at the earliest existing reader, reconciliation or activation owner; do not turn shared-state access into a profile-specific home gate.

## Separate deterministic proof from live credentials

Local implementation can prove adapters, contracts, subprocess behavior, failure paths, and no embedded master credential. Live provider or hosted-source-control smoke tests are publication evidence when they need user accounts. Record a live proof or an explicit product deferral before making public support claims.

## Make release proof unable to publish

Artifact proof must use a no-publish, no-deploy route. Treat tag creation, workflow dispatches, uploads, notarization, updater writes, analytics provisioning, and marketing deploys as separate external actions. A version tag can safely select a rehearsal candidate when the active jobs have read-only permissions and contain no publisher; the tag event itself must not grant publication authority.

Keep inherited release automation as disabled source when it materially reduces upstream-sync cost, but make the active workflow an independently safe rehearsal. A compiled profile cannot protect a GitHub event that starts before compilation.

Run artifact proof with the repository's supported runtime and native toolchain. Check tool versions inside wrappers such as `mise`: a wrapper that pins Node can also select an unrelated global Rust version. Correct the proof environment before changing compatible dependencies.

Filter final artifact outputs as well as inputs. Packagers can create debug manifests, updater metadata or blockmaps even under `--publish never`; a local no-updater profile must not collect them as release outputs.

Do not let a disabled integration fail while a shared router or layer graph is being acquired. Register a request-local disabled handler through the existing route owner, then acquire the integration dependencies only in the enabled profile. Prove one ordinary route and one disabled route in the narrow profile, plus the enabled route in the full profile.

Profile restrictions must be one-sided. A narrow product can ignore ambient state and isolate child processes, but the richer maintainer profile must retain the inherited data-home, pre-ready and environment behavior. Run profile-paired regression tests for every conditional boundary.

Never let a local artifact reuse unlabelled build output. If the existing builder has a `--skip-build` path and compiled profile markers are unavailable, reject that shortcut for the publishable narrow profile. Rebuilding is cheaper than shipping a stale richer graph under the wrong identity.
