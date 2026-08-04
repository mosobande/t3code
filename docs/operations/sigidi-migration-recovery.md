# SIGIDI migration recovery

SIGIDI migration startup fails closed. Do not edit either ledger as the first response.

## Collect evidence

1. Stop the exact server process that owns the database. Do not kill by process-name or path pattern.
2. Record the application revision, the expected upstream commit from `packages/shared/src/sigidiMigrationCompatibility.ts`, and the complete startup error.
3. Copy `state.sqlite` together with its `-wal` and `-shm` files only after the database owner has stopped. Keep the original files unchanged.
4. Inspect the copy read-only. Record both ordered ledgers:

   ```sql
   SELECT migration_id, name, created_at FROM effect_sql_migrations ORDER BY migration_id;
   SELECT migration_id, name, created_at FROM sigidi_sql_migrations ORDER BY migration_id;
   ```

5. Run `pnpm migrations:check -- --revision HEAD` from the exact application revision.

## Classify the failure

- A ledger mismatch means applied history does not match the pinned ordered prefix.
- A capability mismatch means the ledger claims a prerequisite that the schema or required data state does not provide.
- A source or Effect identity mismatch means the candidate has not completed compatibility proof.
- A migration failure means the outer startup transaction should have rolled back both lanes. Verify the schema and both ledgers on the copy.

## Recover

Prefer an append-only repair migration after reproducing the failure against the copied database. Keep the original database as rollback evidence. Prove the repair with Node and Bun SQLite, the supported upgrade fixture, idempotent restart, concurrent startup, and remote preflight.

Direct ledger surgery is exceptional. Require maintainer approval, a backup, a written mapping from every edited row to verified schema state, and a second reviewer. Never delete or rename an applied row merely to make startup continue.
