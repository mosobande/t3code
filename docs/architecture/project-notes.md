# Project Notes persistence

Project Notes is a SIGIDI-owned feature. Its RPC and UI can reuse upstream project and transport capabilities, but its persistence does not occupy the upstream migration sequence.

The feature owns SIGIDI migrations `1_ProjectNotes` and `2_ProjectNoteRevision` in `apps/server/src/persistence/SigidiMigrations/`. They create and evolve `sigidi_project_notes`. The store uses the `sigidi/projectNotes/ProjectNoteStore` service identity.

The earlier unmerged PR used upstream IDs 35 and 36 and the table `project_notes`. Those databases are disposable pre-release development state. Do not add a permanent repair path for them.

Fresh installs and supported upstream-only databases run the upstream lane first and then the SIGIDI lane in one transaction. Remote service preflight checks both ledgers before replacement.
