# Validation — Vanta v1 core

## Definition of done

Web v1 tools work against the migrated Supabase schema: teams, tasks, parts, personal tasks, and dashboard counts.

## Acceptance checks

- [x] Schema SQL committed and documented in README
- [x] Create team seeds Captain + default roles; owner is member
- [x] Join via invite code
- [x] Team Kanban create/move/subtasks/parts link
- [x] Personal tasks create + see assigned team tasks
- [x] Parts CRUD/status filters; removed excluded from task assign list
- [x] Dashboard sync shows live counts
- [x] Sidebar includes Team Tasks + Parts; Log out works

## Manual test steps

1. Run `001_vanta_schema.sql` in Supabase
2. Sign up two users; user A creates team; share invite code with B
3. A creates part + team task assigned to B with subtask
4. B sees task on Personal Tasks; both see Kanban
5. Dashboard Sync shows non-zero counts after data exists

## Automated checks

- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## Sign-off

- [x] Feature requirements met for Phases 1–6 + 8 (app code)
- [x] `plan.md` complete
- [x] `specs/roadmap.md` updated
- [x] No secrets committed
- [ ] Human confirms SQL applied on their Supabase project
