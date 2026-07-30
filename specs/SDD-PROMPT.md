# Spec Driven Development — Agent Prompt

Copy this prompt into an agent session (or follow it whenever implementing Vanta features). It is the operational workflow for this repository’s constitution under `specs/`.

---

## Prompt

You are implementing Vanta using Spec Driven Development. Do not vibe-code past the specs.

### Before any code

1. Read and obey:
   - `specs/mission.md` — why and scope
   - `specs/tech-stack.md` — stack, conventions, aesthetic, exclusions
   - `specs/roadmap.md` — ordered phases and current status
2. Identify the **first incomplete phase** in `roadmap.md` (first unchecked phase status, or first phase with unfinished deliverables that is not deferred).
3. If anything in that phase is ambiguous, ask **at most 1–2 rounds** of clarifying questions (few, critical questions). Do not invent product requirements silently.

### Create the feature spec

4. Create a directory: `specs/YYYY-MM-DD-<feature-slug>/` using today’s date and a short slug (e.g. `2026-07-21-phase-1-schema`).
5. Copy templates from `specs/_feature-template/`:
   - `requirements.md` — scope, data shapes, MUST/SHOULD, out of scope
   - `plan.md` — numbered task groups with `[ ]` checkboxes
   - `validation.md` — acceptance checks before merge
6. Fill them for **this phase only**. Keep the plan agent-sized (small task groups). Use `mission.md` and `tech-stack.md` as constraints.

### Implement

7. After the human accepts the feature spec (or if they already told you to implement), execute **one task group at a time** from `plan.md`.
8. Respect:
   - Existing routes and Sidebar patterns; add routes only when the phase requires it
   - Vanta dark aesthetic tokens in `tech-stack.md`
   - No secrets in the repo; no new major dependencies unless requirements demand it and `tech-stack.md` is updated
   - Next.js 16 App Router docs under `node_modules/next/dist/docs/` when unsure
9. Do not implement later roadmap phases in the same pass unless the human explicitly expands scope.

### Close the loop

10. As you finish each task group, check it off in `plan.md`.
11. When validation checks pass, mark them in `validation.md`.
12. Update `roadmap.md`: tick deliverables and set the phase status to complete when the validation gate is met.
13. Optionally add a brief entry to `CHANGELOG.md` if present.
14. Summarize what shipped and what remains—do not commit unless the human asks.

### Hard rules

- Never commit API keys, service role keys, or `.env` files.
- Never skip the feature spec for a new roadmap phase.
- Prefer extending existing files/routes over parallel duplicate UIs.
- If blocked (missing Supabase access, unclear RLS, etc.), stop and report the blocker with a concrete next question.

---

## Short invoke (after constitution exists)

```
Follow specs/SDD-PROMPT.md. Take the next incomplete phase in specs/roadmap.md,
write the feature spec from specs/_feature-template/, then implement task groups one at a time.
```
