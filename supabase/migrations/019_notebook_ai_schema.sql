-- Curation runs, progress events, and section backlinks. Tables and columns only.
-- Constraints, indexes, and row level security live in 020.

create table if not exists public.notebook_runs (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null,
  team_id uuid not null,
  provider text,
  model text,
  status text not null default 'running',
  requested_by uuid,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text,
  note_count integer,
  prompt_tokens integer,
  completion_tokens integer
);

create table if not exists public.notebook_run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  level text not null default 'info',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notebook_section_refs (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null,
  kind text not null,
  note_id uuid,
  task_id uuid,
  image_id uuid
);
