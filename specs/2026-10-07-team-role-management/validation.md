# Validation — Team Role Management

## Definition of done

A team owner or `is_admin` member can manage team role definitions and all four permissions from `/team`, while database authorization prevents unauthorized writes and confirmed role deletion removes dependent assignments atomically.

## Acceptance checks

- [ ] Owner can create, edit, and delete a role; all four permission values persist after reload.
- [ ] A member with `is_admin = true` can manage roles.
- [ ] A member with only `can_manage_members`, and an ordinary member, cannot mutate roles through direct RPC calls.
- [ ] Blank and case-insensitive duplicate names are rejected; roles cannot be updated across teams.
- [ ] Role table SELECT is limited to team members/owners and direct browser INSERT/UPDATE/DELETE is denied.
- [ ] Deleting a role with member and task-role assignments removes all links and the role atomically; the UI confirms these effects.
- [ ] Owner retains owner-level permissions if the Captain role is edited or deleted.
- [ ] Existing member assignment and team management behavior remains intact.

## Manual test steps

1. Apply the new migration to a test Supabase project with the current migrations already applied.
2. As the owner, create a role; edit its name and each permission individually; reload and verify values.
3. As an `is_admin` member, create/edit a role. As a `can_manage_members`-only member and an ordinary member, attempt the RPCs directly and verify rejection.
4. Assign a role to a member and to a task, confirm the delete warning, delete it, and verify both assignment links and the role are gone.
5. Verify duplicate/blank names are rejected and existing seeded roles can be edited/deleted.

## Automated checks

- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Review SQL function grants, fixed search paths, transaction behavior, and scoped RLS.

## Environment note

The Supabase CLI lint could not connect to local Postgres at `127.0.0.1:54322`; Docker/local Supabase was not running. The live Supabase project is not accessible from this workspace, so database authorization and migration execution remain unverified. Apply the migration and complete the manual checks before treating database acceptance as signed off.

## Sign-off

- [ ] Feature requirements met; no silent scope creep
- [ ] `plan.md` task groups complete
- [ ] `specs/roadmap.md` notes the Phase 2 refinement without changing phase status
- [ ] No secrets committed
