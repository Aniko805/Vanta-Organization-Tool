# Requirements — Team Role Alignment

## Phase

- Roadmap phase: Refinement of completed Phase 2 — Teams and members
- Feature directory: `specs/2026-09-28-team-role-alignment/`

## Context

The team page and helpers still read/write the removed `team_members.role_id` column. Roles are now team-owned rows in `team_roles` linked to memberships through `member_roles`; `team_roles.team_id` is non-null in the updated reference schema.

## Scope

### In scope

- Remove active application references to `team_members.role_id`.
- Display and assign membership roles through `member_roles` and `team_roles` scoped to the selected team.
- Seed Captain, Business, Hardware, and Software rows whenever a team is created, each with that team's ID.
- Assign a new team's owner to Captain through `member_roles`.
- Update the invite RPC to create an unassigned membership without inserting a removed role column.
- Preserve current RLS policies and permission boundaries.

### Out of scope

- RLS policy changes or role-assignment RPC redesign.
- Changes to the task-assignment roles tables.
- Backfilling or merging role definitions on existing teams.

## Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| New-team roles | Seed Captain, Business, Hardware, Software through the team-created trigger | Applies consistently to all team-creation paths and keeps team/role IDs aligned |
| Owner role | Add Captain to the owner's `member_roles` links | Replaces legacy membership `role_id` and preserves owner capabilities |
| Invitee role | Create membership with no assigned role | The user selected unassigned as the initial invite state; admins may assign a role in the team UI |
| Team scoping | Load role options from the selected team's `team_roles` and validate role IDs against that team before writes | Prevents cross-team role assignment in the UI and helper |
| Migration | Replace the team-created trigger and invite RPC without changing RLS | Existing server functions reference the removed column; client-only changes cannot fix those writes |

## Data shapes / contracts

### MUST

- Every seeded `team_roles` row includes the newly created, non-null `team_id`.
- Captain has `is_admin`, `can_manage_members`, `can_manage_tasks`, and `can_manage_inventory` enabled.
- Business has `can_manage_members=false`, `can_manage_tasks=true`, and `can_manage_inventory=false`.
- Hardware and Software each have `can_manage_members=false`, `can_manage_tasks=true`, and `can_manage_inventory=true`.
- Membership role links use `member_roles(member_id, role_id)` only; active code and replacement functions do not depend on `team_members.role_id`.
- Role selection for a member is restricted to roles belonging to the selected team.
- Invite joins create membership without an initial role.

### SHOULD

- A member with no role has no role-derived management permissions.
- Role listing errors are surfaced rather than silently rendering incomplete assignments.

## UX / routes

- Routes touched: `/team`
- Sidebar changes: none
- Aesthetic: preserve the existing team page and `specs/tech-stack.md` design system.

## Dependencies

- Depends on the updated deployed schema containing `team_roles.team_id`, `team_members`, and `member_roles` as described in `supabase/migrations/001_initial_schema.sql`.
- The migration must be applied to the Supabase project before team create/join functions use the new contract.
- No RLS policies are included in the migration; current deployed policies must permit the trigger/RPC and member-role writes as configured.