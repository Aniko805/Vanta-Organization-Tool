-- Vanta Organization Tool — Phase 1 schema + RLS
-- Run in Supabase SQL Editor (or via CLI). Safe to re-run with IF NOT EXISTS patterns where noted.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles (extend if missing)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  first_name text,
  last_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_number text,
  owner_id uuid not null references auth.users (id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_roles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  is_admin boolean not null default false,
  can_manage_members boolean not null default false,
  can_manage_tasks boolean not null default false,
  can_manage_inventory boolean not null default false,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid references public.team_roles (id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists team_members_team_id_idx on public.team_members (team_id);

-- PostgREST embed: team_members → profiles
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_members_user_id_profiles_fkey'
  ) then
    alter table public.team_members
      add constraint team_members_user_id_profiles_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Parts inventory
-- ---------------------------------------------------------------------------
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null,
  sku text,
  status text not null default 'inventory'
    check (status in ('inventory', 'to_be_used', 'used', 'removed')),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parts_team_id_idx on public.parts (team_id);

-- ---------------------------------------------------------------------------
-- Tasks (team + personal)
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'blocked')),
  importance text not null default 'medium'
    check (importance in ('low', 'medium', 'high', 'critical')),
  category text,
  competition_status text,
  due_date date,
  is_personal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_team_or_personal check (
    (is_personal = true and team_id is null)
    or (is_personal = false and team_id is not null)
  )
);

create index if not exists tasks_team_id_idx on public.tasks (team_id);
create index if not exists tasks_created_by_idx on public.tasks (created_by);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, user_id)
);

create table if not exists public.task_role_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  role_id uuid not null references public.team_roles (id) on delete cascade,
  primary key (task_id, role_id)
);

create table if not exists public.task_parts (
  task_id uuid not null references public.tasks (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  primary key (task_id, part_id)
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'blocked')),
  importance text not null default 'medium'
    check (importance in ('low', 'medium', 'high', 'critical')),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.subtask_assignees (
  subtask_id uuid not null references public.subtasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (subtask_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER for RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members m
    left join public.team_roles r on r.id = m.role_id
    join public.teams t on t.id = m.team_id
    where m.team_id = p_team_id
      and m.user_id = auth.uid()
      and (t.owner_id = auth.uid() or coalesce(r.is_admin, false) or coalesce(r.can_manage_members, false))
  );
$$;

create or replace function public.can_manage_team_tasks(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members m
    left join public.team_roles r on r.id = m.role_id
    join public.teams t on t.id = m.team_id
    where m.team_id = p_team_id
      and m.user_id = auth.uid()
      and (
        t.owner_id = auth.uid()
        or coalesce(r.is_admin, false)
        or coalesce(r.can_manage_tasks, false)
      )
  );
$$;

create or replace function public.can_manage_inventory(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members m
    left join public.team_roles r on r.id = m.role_id
    join public.teams t on t.id = m.team_id
    where m.team_id = p_team_id
      and m.user_id = auth.uid()
      and (
        t.owner_id = auth.uid()
        or coalesce(r.is_admin, false)
        or coalesce(r.can_manage_inventory, false)
        or r.id is null
      )
  );
$$;

-- Seed default roles + owner membership when a team is created
create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_role_id uuid;
begin
  insert into public.team_roles (team_id, name, is_admin, can_manage_members, can_manage_tasks, can_manage_inventory)
  values (new.id, 'Captain', true, true, true, true)
  returning id into admin_role_id;

  insert into public.team_roles (team_id, name, is_admin, can_manage_members, can_manage_tasks, can_manage_inventory)
  values
    (new.id, 'Software', false, false, true, false),
    (new.id, 'Hardware', false, false, true, true),
    (new.id, 'Member', false, false, false, false);

  insert into public.team_members (team_id, user_id, role_id)
  values (new.id, new.owner_id, admin_role_id);

  return new;
end;
$$;

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute function public.handle_new_team();

-- When a part is linked to a task, move inventory → to_be_used if still inventory
create or replace function public.handle_task_part_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.parts
  set status = 'to_be_used', updated_at = now()
  where id = new.part_id and status = 'inventory';
  return new;
end;
$$;

drop trigger if exists on_task_part_inserted on public.task_parts;
create trigger on_task_part_inserted
  after insert on public.task_parts
  for each row execute function public.handle_task_part_link();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.team_roles enable row level security;
alter table public.team_members enable row level security;
alter table public.parts enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_role_assignees enable row level security;
alter table public.task_parts enable row level security;
alter table public.subtasks enable row level security;
alter table public.subtask_assignees enable row level security;

-- Teams
drop policy if exists "teams_select_member" on public.teams;
create policy "teams_select_member"
  on public.teams for select to authenticated
  using (public.is_team_member(id) or owner_id = auth.uid());

drop policy if exists "teams_insert_authenticated" on public.teams;
create policy "teams_insert_authenticated"
  on public.teams for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "teams_update_admin" on public.teams;
create policy "teams_update_admin"
  on public.teams for update to authenticated
  using (public.is_team_admin(id))
  with check (public.is_team_admin(id));

drop policy if exists "teams_delete_owner" on public.teams;
create policy "teams_delete_owner"
  on public.teams for delete to authenticated
  using (owner_id = auth.uid());

-- Allow reading a team by invite code for join flow (limited columns via RPC preferred;
-- members need select by invite — use security definer RPC)
create or replace function public.get_team_by_invite(p_code text)
returns table (
  id uuid,
  name text,
  team_number text
)
language sql
security definer
set search_path = public
as $$
  select t.id, t.name, t.team_number
  from public.teams t
  where t.invite_code = lower(trim(p_code))
  limit 1;
$$;

create or replace function public.join_team_by_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
  member_role_id uuid;
begin
  select id into tid from public.teams where invite_code = lower(trim(p_code)) limit 1;
  if tid is null then
    raise exception 'Invalid invite code';
  end if;

  select id into member_role_id
  from public.team_roles
  where team_id = tid and name = 'Member'
  limit 1;

  insert into public.team_members (team_id, user_id, role_id)
  values (tid, auth.uid(), member_role_id)
  on conflict (team_id, user_id) do nothing;

  return tid;
end;
$$;

grant execute on function public.get_team_by_invite(text) to authenticated;
grant execute on function public.join_team_by_invite(text) to authenticated;

-- Team roles
drop policy if exists "roles_select_member" on public.team_roles;
create policy "roles_select_member"
  on public.team_roles for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "roles_manage_admin" on public.team_roles;
create policy "roles_manage_admin"
  on public.team_roles for all to authenticated
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

-- Team members
drop policy if exists "members_select" on public.team_members;
create policy "members_select"
  on public.team_members for select to authenticated
  using (public.is_team_member(team_id) or user_id = auth.uid());

drop policy if exists "members_insert_admin" on public.team_members;
create policy "members_insert_admin"
  on public.team_members for insert to authenticated
  with check (public.is_team_admin(team_id) or user_id = auth.uid());

drop policy if exists "members_update_admin" on public.team_members;
create policy "members_update_admin"
  on public.team_members for update to authenticated
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

drop policy if exists "members_delete" on public.team_members;
create policy "members_delete"
  on public.team_members for delete to authenticated
  using (public.is_team_admin(team_id) or user_id = auth.uid());

-- Parts
drop policy if exists "parts_select" on public.parts;
create policy "parts_select"
  on public.parts for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists "parts_insert" on public.parts;
create policy "parts_insert"
  on public.parts for insert to authenticated
  with check (public.can_manage_inventory(team_id));

drop policy if exists "parts_update" on public.parts;
create policy "parts_update"
  on public.parts for update to authenticated
  using (public.can_manage_inventory(team_id))
  with check (public.can_manage_inventory(team_id));

drop policy if exists "parts_delete" on public.parts;
create policy "parts_delete"
  on public.parts for delete to authenticated
  using (public.is_team_admin(team_id));

-- Tasks
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select"
  on public.tasks for select to authenticated
  using (
    (is_personal and (created_by = auth.uid() or exists (
      select 1 from public.task_assignees ta where ta.task_id = id and ta.user_id = auth.uid()
    )))
    or (team_id is not null and public.is_team_member(team_id))
  );

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert"
  on public.tasks for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (is_personal and team_id is null)
      or (not is_personal and team_id is not null and public.can_manage_team_tasks(team_id))
    )
  );

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update"
  on public.tasks for update to authenticated
  using (
    (is_personal and created_by = auth.uid())
    or (team_id is not null and public.can_manage_team_tasks(team_id))
  )
  with check (
    (is_personal and created_by = auth.uid())
    or (team_id is not null and public.can_manage_team_tasks(team_id))
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete"
  on public.tasks for delete to authenticated
  using (
    (is_personal and created_by = auth.uid())
    or (team_id is not null and public.can_manage_team_tasks(team_id))
  );

-- Task assignees / roles / parts / subtasks: member of parent task's team or personal owner
drop policy if exists "task_assignees_all" on public.task_assignees;
create policy "task_assignees_all"
  on public.task_assignees for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          (t.is_personal and t.created_by = auth.uid())
          or (t.team_id is not null and public.is_team_member(t.team_id))
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          (t.is_personal and t.created_by = auth.uid())
          or (t.team_id is not null and public.can_manage_team_tasks(t.team_id))
        )
    )
  );

drop policy if exists "task_role_assignees_all" on public.task_role_assignees;
create policy "task_role_assignees_all"
  on public.task_role_assignees for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.team_id is not null and public.is_team_member(t.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.team_id is not null and public.can_manage_team_tasks(t.team_id)
    )
  );

drop policy if exists "task_parts_all" on public.task_parts;
create policy "task_parts_all"
  on public.task_parts for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.team_id is not null and public.is_team_member(t.team_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and t.team_id is not null and public.can_manage_team_tasks(t.team_id)
    )
  );

drop policy if exists "subtasks_all" on public.subtasks;
create policy "subtasks_all"
  on public.subtasks for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          (t.is_personal and t.created_by = auth.uid())
          or (t.team_id is not null and public.is_team_member(t.team_id))
        )
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          (t.is_personal and t.created_by = auth.uid())
          or (t.team_id is not null and public.can_manage_team_tasks(t.team_id))
        )
    )
  );

drop policy if exists "subtask_assignees_all" on public.subtask_assignees;
create policy "subtask_assignees_all"
  on public.subtask_assignees for all to authenticated
  using (
    exists (
      select 1 from public.subtasks s
      join public.tasks t on t.id = s.task_id
      where s.id = subtask_id
        and (
          (t.is_personal and t.created_by = auth.uid())
          or (t.team_id is not null and public.is_team_member(t.team_id))
        )
    )
  )
  with check (
    exists (
      select 1 from public.subtasks s
      join public.tasks t on t.id = s.task_id
      where s.id = subtask_id
        and (
          (t.is_personal and t.created_by = auth.uid())
          or (t.team_id is not null and public.can_manage_team_tasks(t.team_id))
        )
    )
  );
