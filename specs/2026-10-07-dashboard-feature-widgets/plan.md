# Plan — Dashboard Feature Widgets

## Task groups

### 1. Feature specification

- [x] Record scope, widget content, ordering rules, link targets, and schema constraints in `requirements.md`.
- [x] Define implementation tasks and validation gates in this feature directory.

### 2. Dashboard widgets

- [x] Replace logs, focus content, aggregate stats, and sync action with the five requested feature widgets.
- [x] Load personal tasks, first-team tasks/members, and first-team part/status listings through existing helpers.
- [x] Add due-date and recency sorting, direct links, and loading/empty/error states.

### 3. Verification and closeout

- [x] Verify sorting, caps, links, identifier text, and empty/error states by code inspection.
- [ ] Manually verify previews against representative live Supabase data.
- [x] Run focused lint and production build.
- [ ] Record verification results without changing the completed Phase 5 status.

## Notes

- This is a refinement of completed Phase 5, not a new roadmap phase.
- Do not add a Settings widget, schema migration, or dependency.
- Use `joined_at` only when returned by the available membership data; the checked-in active schema does not define it.
