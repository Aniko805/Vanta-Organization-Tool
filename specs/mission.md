# Mission

## What Vanta is

Vanta is an open-source organization tool for students and teams. Its primary focus is helping **FRC and FTC (FIRST Robotics / Tech Challenge)** teams organize parts efficiently, communicate between members, plan events, and assign work through a Kanban-style task system so scarce build season time is used well.

The product is web-first today (Next.js on Vercel, data and auth on Supabase). A mobile adaptation is intentional future work and is **out of scope for v1**.

## Who it is for

- FIRST Robotics Competition and FIRST Tech Challenge teams (captains, coaches, mentors, and student members)
- Broader student and small-team organizations that need the same inventory + roles + task patterns, once the robotics-first core is solid

## Problems we solve

- Parts are hard to find, track, and status across a shop and a season
- Team membership, roles, and permissions are informal and inconsistent
- Tasks live in chat threads, spreadsheets, or personal notes instead of one shared board
- Individual work and team-assigned work are hard to see in one place

## Product principles

1. **Open source, secrets out of the repo** — Share the product freely; never commit API keys, service role keys, or other sensitive credentials.
2. **Free-tier friendly** — Target Vercel and Supabase free plans for hosting and backend.
3. **Auth-gated tools** — Public marketing and auth pages are open; dashboard tools require a signed-in account (redirect to login otherwise).
4. **Premium dark developer aesthetic** — High-contrast, minimal, geometric layouts (see `tech-stack.md` design tokens). Prefer clarity and density over decorative chrome.
5. **Spec-driven delivery** — Constitution and feature specs in `specs/` are the source of truth for agents and humans before code changes.
6. **Web first** — Ship a solid browser app before native mobile.

## In scope for v1

| Area | Intent |
|------|--------|
| Homepage / info | Public landing with clear product story |
| Login / sign-up / profile setup | Account lifecycle |
| Settings | Account preferences (name, username, theme hooks, linked accounts later) |
| Dashboard overview | Sidebar + widgets into the tools |
| Teams & members | Create/join/leave teams; roles; captain/admin permissions; attendance/schedule hooks as they mature |
| Team tasks | Shared Kanban-style board with assignees, subtasks, due dates, categories, parts linkage |
| Personal / individual tasks | Team-assigned work plus personal tasks outside the team |
| Parts inventory | Manual add/search; statuses: inventory, to be used, used, removed |
| Parts identification | Computer-vision assist for GoBilda and other FTC-associated parts (after manual inventory) |

## Out of scope (for now)

- Native mobile apps
- Paid hosting tiers as a hard dependency
- Shipping or documenting private API keys
- Non-essential marketing fluff that distracts from the tools

## Success looks like

A signed-in team can create a team, invite members with roles, track parts through inventory statuses, and run team and personal tasks on a shared board—without leaving Vanta or leaking secrets into the repository.
