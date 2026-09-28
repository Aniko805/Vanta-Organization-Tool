---
name: supabase
description: >
  Work with the project's Supabase integration, including PostgreSQL,
  Supabase Auth, Row Level Security, Storage, queries, mutations,
  and database migrations.
---

# Vanta Supabase

Vanta uses:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- supabase-js
- Next.js
- Vercel

## Database knowledge

The Copilot agent does NOT have direct access to the live Supabase
database.

When database structure is relevant, consult:

1. `supabase/migrations/`
2. Relevant application code
3. Repository documentation

Do not claim to have inspected the live database.

Do not invent tables, columns, constraints, relationships, or policies.

If the repository does not contain enough information to determine
the answer, state what information is missing.

## RLS

Treat PostgreSQL table privileges and Row Level Security as separate
systems.

For RLS:

- SELECT uses `USING`
- INSERT uses `WITH CHECK`
- UPDATE uses both `USING` and `WITH CHECK`
- DELETE uses `USING`

Before proposing an RLS policy, determine:

1. What does one row represent?
2. Who should have access?
3. How does the row relate to the authenticated user?
4. Is the relationship direct or through another table?

Do not disable RLS to solve an authorization problem.

Do not make policies more permissive merely to eliminate an error.

## Authentication

Supabase Auth identifies the current user.

Prefer:

`auth.uid()`

over trusting a user ID supplied by the browser.

Never expose the Supabase service-role key to client-side code.

## Storage

Supabase Storage has authorization separate from PostgreSQL table RLS.

User-owned files should use paths based on the authenticated user's
ID when appropriate.

Storage policies must enforce ownership rather than relying only on
frontend validation.

## Migrations

Database changes should be represented as SQL migrations and committed
to the repository.

Do not silently make database assumptions that are not represented in
the repository.