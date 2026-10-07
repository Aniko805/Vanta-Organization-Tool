# Plan — Team Role Management

## Task groups

### 1. Database authorization and role operations

- [x] Add a migration with authenticated role create/update/delete RPCs using `auth.uid()` and owner-or-`is_admin` authorization.
- [x] Lock the team row during each mutation and validate role ownership, trimmed non-empty names, and case-insensitive team-local name uniqueness.
- [x] Enable team-scoped role reads; revoke direct browser writes to `team_roles` while allowing the RPC owner to mutate rows.
- [x] Delete member/task role links and the role in one transaction; return deleted-link counts.

### 2. Team role management UI

- [x] Add typed helper methods and a strict role-definition permission helper in `src/lib/teams.ts`.
- [x] Add a role list and create/edit form to `/team` with all four permission controls.
- [x] Confirm deletion with an explicit warning that current member and task assignments will be removed.
- [x] Refresh role/member data after mutations without broadening the existing member-management permission gate.

### 3. Verification and documentation

- [x] Run focused lint and production build checks.
- [x] Document manual owner/admin, unauthorized-user, role CRUD, and assignment-cleanup checks; do not claim live Supabase validation.
- [x] Record this refinement under Phase 2 without changing roadmap phase status.

## Notes

- Implement one task group at a time.
- Do not change task permission semantics or default role seeding.
- Live database access is unavailable from this workspace; the migration must be applied and tested in the user's Supabase project.
