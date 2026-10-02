---
name: debugging
description: >
  Systematically debug application errors and unexpected behavior.
  Use when investigating errors, failed requests, broken UI behavior,
  authentication failures, database errors, or deployment issues.
---

# Debugging process

When debugging an issue, do not immediately rewrite the code.

Follow this process:

1. Identify the exact operation that is failing.
2. Identify which layer is failing.
3. Read the relevant source code.
4. Trace the data entering the failing operation.
5. Check the relevant database schema or application configuration
   when applicable.
6. Identify the most likely root cause.
7. Make the smallest reasonable change.
8. Explain why the change fixes the problem.
9. Consider whether the change creates regressions or security issues.

Distinguish between:

- Browser/UI errors
- React errors
- Next.js errors
- TypeScript errors
- Network/API errors
- Supabase Auth errors
- PostgreSQL errors
- RLS errors
- Supabase Storage errors
- Environment-variable errors
- Vercel/deployment errors

Do not assume that an error message identifies the root cause.

When multiple causes are plausible, explain what evidence would
distinguish between them.

Prefer diagnostic steps that produce useful evidence over speculative
code changes.

Do not disable security mechanisms simply to make an error disappear.