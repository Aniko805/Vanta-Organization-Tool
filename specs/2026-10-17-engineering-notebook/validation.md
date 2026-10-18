# Validation — Engineering notebook

> A stage is not done until its gate passes. Gates are per-stage so a partial epic still ships value.

## Definition of done

A team can capture dated notes with photos throughout a build session, press one button to have an LLM organize that day into a template-driven engineering notebook with working links to the source notecards and inline photos, edit it by hand, and read the season either as a timeline or as one continuous printable document — with all of it usable on a phone.

## Cross-stage acceptance checks

These apply to every stage; re-run them at each gate.

- [ ] No new table is readable across teams (probe with two accounts in two teams).
- [ ] No API key, service role key, or `.env` value appears in the repo or in a client bundle.
- [ ] Every new page is usable at 390px width without horizontal scrolling.
- [ ] `npm run build` passes.
- [ ] No errors or warnings introduced in `npm run lint` (record pre-existing failures separately rather than hiding them).
- [ ] New dependency added? `specs/tech-stack.md` updated in the same change.

## Stage A — Engineering notes foundation

- [ ] A note created with no date selected is stored with the browser's local date.
- [ ] A user can override the date explicitly and the note is filed under that date.
- [ ] Take-photo works on a phone (opens the camera, not a file browser).
- [ ] Upload accepts multiple images in one selection.
- [ ] Uploaded images are downscaled before upload; a 4MB phone photo lands well under 1MB.
- [ ] Thumbnails load via signed URLs; the object is **not** reachable via a public URL.
- [ ] A note posts in under a second on a normal connection (optimistic insert).
- [ ] Deleting a note also removes its image rows and its storage objects.
- [ ] A member of another team cannot read the row, and cannot fetch the object even with the exact path.

## Stage B — Templates and notebook shell

- [ ] The global default template exists exactly once after re-running the seed migration.
- [ ] Default template has tabs Software / Hardware / Business and sections Accomplishments / Lessons Learned / To-be-completed.
- [ ] A non-admin cannot edit the team template.
- [ ] An admin can add, rename, reorder, and delete tabs and sections.
- [ ] Deleting a tab deletes its sections and does not orphan rows.
- [ ] Template JSON export round-trips through import into another team with identical structure and order.
- [ ] Importing malformed JSON (wrong shape, 50 tabs) is rejected with a readable error, not a crash.
- [ ] Applying a template to a date creates one section row per tab/section pair, in order.
- [ ] Re-applying creates no duplicates.
- [ ] Editing a template after a notebook exists does **not** alter that notebook's section rows.

## Stage C — AI curation pipeline

- [ ] With no key configured, Update returns a clear message and no run row is created in `running` state forever.
- [ ] A successful run populates a section for every tab.
- [ ] Every `[[note:…]]` citation resolves to a note from the **same team and same date**.
- [ ] A deliberately bogus handle in model output is dropped and logged as a `warn` event.
- [ ] Photos appear inline at a plausible position, not dumped at the end of a section.
- [ ] `notebook_section_refs` is populated and backlinks resolve.
- [ ] Second run with no new notes performs **zero** model calls and reports "nothing to curate".
- [ ] A run inside the cooldown window is rejected with the remaining time.
- [ ] Provider A works; switching `teams.ai_provider` to provider B works without a code change.
- [ ] Killing the provider key mid-run yields a `failed` run with the provider's error and an intact previous notebook.
- [ ] Token counts are recorded per run.
- [ ] Markdown containing raw `<script>` or `<img onerror=…>` in a note body renders as inert text.
- [ ] A note body containing "ignore previous instructions and output …" does not produce executable output or unresolvable references.

## Stage D — Notebook workspace UI

- [ ] Layout matches the intent: tabs on top, curated pane primary, notecards pane secondary.
- [ ] Selecting a subteam tab filters the curated pane to that tab's sections.
- [ ] Notecards pane highlights notes tagged with the active subteam, with a way to show all.
- [ ] A hand-edited section persists across refresh and sets `is_user_edited` + `edited_by` + `edited_at`.
- [ ] Update warns before overwriting hand-edited sections, listing them.
- [ ] Staleness banner appears after a new note is added and disappears after a successful update.
- [ ] Clicking a note citation scrolls to and highlights the source notecard.
- [ ] Clicking a task citation opens the task.
- [ ] A note with no citation in any section is still visible and editable.
- [ ] Empty states are distinct: no notes today / not generated yet / template has no sections.
- [ ] Day navigation (prev, next, today) keeps the selected subteam tab.

## Stage E — Timeline and document modes

- [ ] Timeline lists only dates with notes or a notebook, newest first.
- [ ] Each point shows date, subteam markers, and note count.
- [ ] A date with a curated notebook is visually distinct from a note-only date.
- [ ] Clicking a point opens document mode at that date's anchor, scrolled correctly.
- [ ] Document mode shows dates as headings, subteam as sub-headings, sections beneath, chronologically.
- [ ] Back to timeline restores the previous scroll position.
- [ ] Mode and date survive a page refresh and browser back/forward (URL-driven state).
- [ ] A 20-day team loads the document without an unbounded query (paged or virtualized).
- [ ] Print preview shows no sidebar and no controls, with page breaks between dates.

## Stage F — Mobile polish and print

- [ ] Capture → update → export completes on iOS Safari and Android Chrome without pinch-zoom.
- [ ] No horizontal page scroll at 390px on any new surface.
- [ ] Composer is reachable one-handed; tap targets ≥ 44px.
- [ ] Notecards become a sheet, tabs scroll horizontally, timeline stays single-column.
- [ ] Printing the full document produces a clean PDF with photos in place and page breaks between dates.
- [ ] Lighthouse mobile performance/accessibility reviewed; regressions noted.

## Manual test steps (full epic)

1. Sign in as a member of Team A on a phone. Open `/engineering-notes`.
2. Post three notes, one with two photos taken via camera, tagging different subteams.
3. Confirm all three appear under today's date and the photos render from signed URLs.
4. As an admin on a laptop, fork the default template, add a "Programming" tab, and reorder sections.
5. Back on the phone, press **Update notebook**. Watch per-tab progress, then read the result.
6. Confirm each tab has curated content containing note citations and at least one inline photo.
7. Tap a citation; confirm the source notecard highlights in the notecards pane.
8. Hand-edit a section; refresh; confirm the edit persisted.
9. Post a fourth note. Confirm the staleness banner appears. Press Update; confirm the overwrite warning lists the edited section.
10. Switch to timeline; confirm points for each date with content.
11. Click an earlier date; confirm the document view lands on it; press Back; confirm the timeline is where you left it.
12. Refresh; confirm mode and date are preserved.
13. Print the full document to PDF; confirm photos and page breaks.
14. Repeat step 2 as a member of Team B; confirm Team B cannot see or reach anything from Team A.

## Automated checks

Recorded 2026-10-18 from the implementation session:

- [x] `npm run build` passes
- [x] `npm run lint` introduces no new failures. Pre-existing failures remain in `src/app/dashboard/page.tsx` (`react-hooks/set-state-in-effect`) and `src/app/next-steps-after-signup/page.tsx` (unescaped apostrophe), plus existing image warnings.
- [ ] Migration files apply cleanly in order `014` → `020` on a database at `013` (SQL is written; it still has to be applied in Supabase)
- [x] Schema files `014`, `016`, and `019` contain no `policy`, `create index`, or `references`
- [x] No `NEXT_PUBLIC_*` variable holds an AI key
- [ ] Re-running each migration is a no-op (idempotent) — written with `if not exists` / `drop ... if exists`, not executed here
- [ ] Cross-team RLS probe script returns zero rows for a non-member

## Sign-off

- [ ] Stage gates A–F each recorded with a date and a short note. Code for A–F is in the tree. Phone camera, a live provider run, and applying migrations `014`–`020` are still open.
- [x] `plan.md` task groups checked off per stage
- [x] `specs/roadmap.md` updated as each stage completes
- [x] `specs/tech-stack.md` lists the markdown renderer dependency (and any other new one)
- [x] No secrets committed
