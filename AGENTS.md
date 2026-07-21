<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Spec Driven Development

Vanta is built under a Spec Driven Development constitution in `specs/`.

**Before implementing any feature**, agents MUST:

1. Read `specs/mission.md`, `specs/tech-stack.md`, and `specs/roadmap.md`
2. Follow the workflow in `specs/SDD-PROMPT.md`
3. For a new roadmap phase, create `specs/YYYY-MM-DD-<feature-slug>/` from `specs/_feature-template/` (`requirements.md`, `plan.md`, `validation.md`) before writing product code

Do not invent scope past the current roadmap phase. Never commit secrets.
