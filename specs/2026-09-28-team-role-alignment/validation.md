# Validation — Team Role Alignment

## Definition of done

Team creation seeds four correctly configured team-owned roles and links the owner to Captain, invite joins no longer use the removed membership role column, and the team UI manages roles through team-scoped `member_roles` links.

## Acceptance checks

- [ ] New team has Captain, Business, Hardware, and Software role rows, all with that team's ID and the requested permissions.
- [ ] New team owner is linked to Captain in `member_roles`.
- [ ] Joining by invite inserts a team membership without a role and does not reference `team_members.role_id`.
- [x] Team page displays roles from `member_roles` and offers only roles for the selected team.
- [x] Assign/remove role changes affect only `member_roles` and reject role IDs from another team.
- [x] Unassigned members do not receive role-derived inventory/task/member-management permissions.
- [x] No RLS policy changes are introduced.

## Manual test steps

1. Apply the new migration to the Supabase project.
2. Create a team and verify the four roles, permissions, team IDs, and owner Captain link.
3. Join the team from a second account and verify the membership is initially unassigned.
4. From the owner account, assign and remove roles; verify choices belong to the selected team and persisted links appear in `member_roles`.
5. Verify deployed RLS allows the trigger, invite RPC, and role-link operations; no live database access is available to this coding session.

## Automated checks

- [x] Focused ESLint passes.
- [x] `npm run build` passes.
- [x] Static review finds no active `team_members.role_id` reads or writes.

## Sign-off

- [ ] Feature requirements met; no RLS scope expansion.
- [ ] `plan.md` task groups complete.
- [ ] Roadmap Phase 2 remains complete and unchanged.
- [ ] No secrets committed.