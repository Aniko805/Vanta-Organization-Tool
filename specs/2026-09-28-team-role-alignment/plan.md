# Plan — Team Role Alignment

## Task groups

### 1. Database team lifecycle functions

- [x] Add a migration replacing the team-created trigger to seed the four team-local roles and link the owner to Captain through `member_roles`.
- [x] Replace the invite RPC to insert a membership without referencing `team_members.role_id` or assigning an initial role.
- [x] Preserve the current RLS policy set.

### 2. Team role helpers and UI

- [x] Remove member-role column fallback/update from `teams.ts`; load assignments only through `member_roles`.
- [x] Validate role IDs against the target member's team before writing links.
- [x] Restrict role options to the selected team's roles and remove `role_id` from active member UI/type contracts.
- [x] Update role permission helpers so no-role memberships do not gain implicit permissions.

### 3. Documentation and verification

- [x] Document the updated defaults and migration application requirement.
- [x] Run focused lint and production build.
- [x] Record manual Supabase create/join/role-assignment checks; do not claim live database validation.

## Notes

- This is a refinement to completed roadmap Phase 2; do not change the phase status.
- Do not edit the deprecated migration or backup helper.
- The updated schema does not show a membership unique constraint; the invite RPC must not require one.