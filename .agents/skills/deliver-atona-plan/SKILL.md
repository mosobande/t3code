---
name: deliver-atona-plan
description: Deliver a confirmed Atona HTML plan as a working, reviewed application. Use when Codex must group plan slices into executable phases, preserve established technology and implementation owners, constrain retained integrations through an immutable product profile, maintain live evidence, and prove the final app.
---

# Deliver Atona Plan

Turn one confirmed Atona plan into phased, test-backed candidates while keeping the plan authoritative.

## Establish the delivery contract

1. Read the complete plan, repository instructions, branch state, and relevant architecture documents.
2. Confirm implementation authority separately from cutover, publication, deployment, credential, and live-data authority.
3. Set the plan implementation state to `Started` immediately before the first implementation edit. Record date, base revision, branch, target path, phase, authority, and exclusions.
4. Preserve the repository's languages, runtimes, package manager, frameworks, persistence, build tools, tests, and native commands. Treat pinned versions as inherited proof constraints, not a technology choice.
5. Read [field-notes.md](references/field-notes.md). Add only new, transferable lessons that source evidence or failed proof confirms.
6. Apply an existing-first decision ladder: reuse the current owner unchanged; pass it immutable profile policy when behavior must differ; add a thin adapter only when ownership differs; reopen Atona and ask the user before adding a parallel implementation.

## Convert slices into working phases

Group slices by usable outcomes, not file type:

1. Materialize the exact source and isolated proof environment.
2. Prove the existing app foundation and persistence.
3. Preserve every retained feature with focused behavior proof.
4. Enforce the product boundary across source graphs and runtime composition.
5. Reconcile identity, release rehearsal, and tracked documentation.
6. Build one exact final integration candidate and run broad review.

For each phase, record its slices, dependencies, working outcome, focused proof, integration proof, rollback boundary, candidate identity, and state in the live plan. Do not move forward when the current phase leaves the app unusable unless the next change is part of the same bounded candidate.

## Constrain retained integrations at existing owners

Do not delete workspace members, lockfile closure, tests, source, or established build paths merely to narrow one product profile. Do not create parallel local layers, resolvers, registries, platform sources, or workflows when the established owner can accept an immutable build policy.

Apply the selected profile before the earliest applicable activation edge:

- persisted target hydration and settings reconciliation;
- route, command, IPC, preload, menu, settings and search registration;
- service startup, child processes, network binding and external configuration;
- staged application, ASAR, updater and product documentation.

Use semantic target, registration, capability and artifact rules. Keep unsupported records intact when a richer maintainer profile may use them, but reject them before startup in the narrow profile. Preserve allowed near-neighbors explicitly, such as loopback authentication or source-control transport.

A compiled product profile is not deployment authority. GitHub events, EAS submissions, cloud changes, signing, notarization and publication require independent workflow/operator gates. Never make a richer build profile sufficient to perform an external write.

## Protect state and external systems

- Run every pre-cutover app proof with exact temporary home, app-data, state, and credential paths.
- Prove the real user data home was not read or written.
- When confirmed profiles share one home, do not add a profile-specific directory or marker. Prove excluded persisted capabilities cannot hydrate or activate through settings, catalogs, backends, or renderers.
- Keep migrations forward-repairable and verify restart, idempotency, concurrency, and failure recovery where state changes.
- Do not tag, publish, deploy, notarize, provision, authenticate, or modify external services without their separate authority.

## Make the app work

For each retained feature, identify all applicable entry points, clients, providers, contracts, reverse actions, persistence, and host integrations. Use focused repository-native tests at the nearest behavior seam. Then run the smallest real integrated app pass allowed by repository instructions.

Compilation is not acceptance. A phase exits only when its user outcome works, negative cases fail safely, hidden integrations remain unreachable, and restart or replay preserves required state.

## Review and converge

1. Keep the live plan current after each phase and after every failed proof that changes the delivery route.
2. Update this skill only when a new transferable guardrail or proof pattern is learned. Do not turn it into a project changelog.
3. Run maintainability review on stable candidates, then run the required broad code review on the exact final candidate.
4. Mark implementation `Complete` only when all in-scope features work, documentation is reconciled, no blocking proof gap remains, and the final review recommends acceptance.

Report the exact candidate, completed phases, commands and results, integrated app evidence, disabled-integration evidence, remaining external gates, and rollback limits.
