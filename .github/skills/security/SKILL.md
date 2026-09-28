---
name: security
description: >
  Review Vanta code for authentication, authorization, RLS, Storage,
  secrets, user-owned resources, and other application security issues.
  Use when implementing or reviewing security-sensitive functionality.
---

# Vanta Security

## Authentication vs authorization

Authentication determines who the user is.

Authorization determines what the user is allowed to do.

Do not treat successful authentication as proof that a user may access
a resource.

## User identity

Do not trust user IDs, team IDs, roles, ownership fields, or other
authorization information supplied by the client.

When possible, derive identity from the authenticated Supabase user.

## Database security

Do not disable RLS to solve an application problem.

Do not create broadly permissive policies without understanding the
resource's ownership model.

When modifying RLS, inspect the relevant relationships in
`supabase/migrations/`.

## Secrets

Never expose:

- Supabase service-role keys
- private API keys
- database passwords
- other server-side secrets

Do not put server secrets in `NEXT_PUBLIC_*` environment variables.

## File uploads

Validate uploaded files appropriately.

Do not rely exclusively on frontend validation for security.

Supabase Storage policies must enforce ownership and access.

## Changes

For security-sensitive changes, prefer the smallest change that
solves the problem while preserving existing authorization boundaries.