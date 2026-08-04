# SIGIDI Service Migration

Use this checklist to replace upstream hosted services and release credentials with SIGIDI-owned
infrastructure.

## Immediate telemetry protection

- [ ] Disable the upstream PostHog project key before the next distributed build.
- [ ] Create a SIGIDI PostHog project and configure its public ingestion key and host.
- [ ] Keep PostHog administrative keys outside client applications and source control.
- [ ] Review anonymous event fields and update externally visible T3 Code names.

## SIGIDI Connect infrastructure

- [ ] Create a SIGIDI Clerk application for web and desktop authentication.
- [ ] Create the Clerk JWT template and public CLI OAuth application.
- [ ] Replace T3 Code domains and native redirect schemes in the Clerk allowlists.
- [ ] Configure the Cloudflare account, API token, relay zone, and tunnel zone.
- [ ] Select and document the production and non-production relay hostnames.
- [ ] Create or select a PlanetScale database for durable relay state.
- [ ] Configure the PlanetScale organization and deployment credentials.
- [ ] Create SIGIDI Axiom tracing datasets and configure their ingestion credentials.

## Hosted web application

- [ ] Create a SIGIDI Vercel project.
- [ ] Configure `app.sigidi.com` as the primary hosted application domain.
- [ ] Select and configure the preview and Nightly application domains.
- [ ] Add the Vercel token, organization ID, project ID, and team scope to GitHub.

## Release and signing

- [ ] Create or install a GitHub release app for `mosobande/sigidi`.
- [ ] Add the release app ID and private key to the GitHub repository.
- [ ] Create the GitHub `production` environment.
- [ ] Add each required deployment secret and variable to that environment.
- [ ] Create the Apple identifier and provisioning profile for `com.quantipixels.sigidi`.
- [ ] Configure macOS signing and notarization credentials.
- [ ] Configure Azure Trusted Signing before distributing Windows builds.
- [ ] Replace or remove the upstream Discord release webhook and role IDs.

## Documentation and verification

- [ ] Update the privacy policy with the SIGIDI service list and data uses.
- [ ] Document which configuration values are public and which values are secrets.
- [ ] Verify that no distributed build contains upstream service identifiers.
- [ ] Add release preflight checks for missing SIGIDI credentials and domains.
- [ ] Defer internal `T3CODE_*` configuration-name cleanup to a separate change.
