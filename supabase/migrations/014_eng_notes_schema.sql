-- Engineering notes: tables, columns, and the private notebook bucket.
-- Constraints, indexes, and row level security live in 015.

create table if not exists public.eng_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  note_date date not null,
  author_id uuid,
  title text,
  body text not null default '',
  subteam text,
  task_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eng_note_images (
  id uuid primary key default gen_random_uuid(),
  note_id uuid,
  team_id uuid not null,
  storage_path text not null,
  mime_type text,
  byte_size integer,
  caption text,
  position integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
select 'notebook', 'notebook', false
where not exists (
  select 1 from storage.buckets where id = 'notebook'
);
