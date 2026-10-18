-- Notebook templates and curated notebooks: tables and columns only.
-- Constraints, indexes, and row level security live in 017.

create table if not exists public.notebook_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid,
  name text not null,
  description text,
  is_default boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notebook_template_tabs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null,
  name text not null,
  position integer not null default 0
);

create table if not exists public.notebook_template_sections (
  id uuid primary key default gen_random_uuid(),
  tab_id uuid not null,
  name text not null,
  position integer not null default 0,
  prompt_hint text
);

create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  notebook_date date not null,
  template_id uuid,
  title text,
  status text not null default 'draft',
  generated_at timestamptz,
  generated_by uuid,
  provider text,
  model text,
  source_note_count integer not null default 0,
  source_max_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notebook_sections (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null,
  tab_name text not null,
  tab_position integer not null default 0,
  section_name text not null,
  section_position integer not null default 0,
  content text not null default '',
  is_user_edited boolean not null default false,
  edited_by uuid,
  edited_at timestamptz
);

alter table public.teams add column if not exists ai_provider text;
alter table public.teams add column if not exists ai_model text;
