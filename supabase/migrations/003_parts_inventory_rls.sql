create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members as tm
    where tm.team_id = p_team_id
      and tm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_manage_inventory(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.teams as t
      where t.id = p_team_id
        and t.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.team_members as tm
      join public.member_roles as mr on mr.member_id = tm.id
      join public.team_roles as tr on tr.id = mr.role_id
      where tm.team_id = p_team_id
        and tm.user_id = (select auth.uid())
        and tr.team_id = p_team_id
        and (tr.is_admin or tr.can_manage_inventory)
    );
$$;

create or replace function private.is_status_valid_for_part(
  p_part_id uuid,
  p_status_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parts as p
    join public.status_list as s on s.id = p_status_id
    where p.id = p_part_id
      and (
        s.team_id = p.team_id
        or (s.team_id is null and s.is_default)
      )
  );
$$;

revoke all on function private.is_team_member(uuid) from public, anon, authenticated;
revoke all on function private.can_manage_inventory(uuid) from public, anon, authenticated;
revoke all on function private.is_status_valid_for_part(uuid, uuid) from public, anon, authenticated;
grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.can_manage_inventory(uuid) to authenticated;
grant execute on function private.is_status_valid_for_part(uuid, uuid) to authenticated;

alter table public.parts enable row level security;
alter table public.part_catalog enable row level security;
alter table public.part_status enable row level security;
alter table public.status_list enable row level security;

revoke all on table public.parts, public.part_catalog, public.part_status, public.status_list
  from anon, authenticated;
grant select, insert, update, delete on table public.parts to authenticated;
grant select, insert on table public.part_catalog to authenticated;
grant select, insert, update on table public.part_status to authenticated;
grant select on table public.status_list to authenticated;

drop policy if exists parts_select_team_members on public.parts;
create policy parts_select_team_members
  on public.parts for select to authenticated
  using (private.is_team_member(team_id));

drop policy if exists parts_insert_inventory_managers on public.parts;
create policy parts_insert_inventory_managers
  on public.parts for insert to authenticated
  with check (
    private.can_manage_inventory(team_id)
    and created_by = (select auth.uid())
  );

drop policy if exists parts_update_inventory_managers on public.parts;
create policy parts_update_inventory_managers
  on public.parts for update to authenticated
  using (private.can_manage_inventory(team_id))
  with check (private.can_manage_inventory(team_id));

drop policy if exists parts_delete_inventory_managers on public.parts;
create policy parts_delete_inventory_managers
  on public.parts for delete to authenticated
  using (private.can_manage_inventory(team_id));

drop policy if exists part_catalog_select_team_or_official on public.part_catalog;
create policy part_catalog_select_team_or_official
  on public.part_catalog for select to authenticated
  using (
    (team_id is not null and private.is_team_member(team_id))
    or (team_id is null and is_official)
  );

drop policy if exists part_catalog_insert_inventory_managers on public.part_catalog;
create policy part_catalog_insert_inventory_managers
  on public.part_catalog for insert to authenticated
  with check (
    team_id is not null
    and private.can_manage_inventory(team_id)
    and created_by = (select auth.uid())
  );

drop policy if exists status_list_select_global_or_team on public.status_list;
create policy status_list_select_global_or_team
  on public.status_list for select to authenticated
  using (
    (team_id is null and is_default)
    or (team_id is not null and private.is_team_member(team_id))
  );

drop policy if exists part_status_select_team_members on public.part_status;
create policy part_status_select_team_members
  on public.part_status for select to authenticated
  using (
    exists (
      select 1
      from public.parts as p
      where p.id = part_id
        and private.is_team_member(p.team_id)
    )
  );

drop policy if exists part_status_insert_inventory_managers on public.part_status;
create policy part_status_insert_inventory_managers
  on public.part_status for insert to authenticated
  with check (
    exists (
      select 1
      from public.parts as p
      where p.id = part_id
        and private.can_manage_inventory(p.team_id)
    )
    and private.is_status_valid_for_part(part_id, status_id)
    and created_by = (select auth.uid())
  );

drop policy if exists part_status_update_inventory_managers on public.part_status;
create policy part_status_update_inventory_managers
  on public.part_status for update to authenticated
  using (
    exists (
      select 1
      from public.parts as p
      where p.id = part_id
        and private.can_manage_inventory(p.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.parts as p
      where p.id = part_id
        and private.can_manage_inventory(p.team_id)
    )
    and private.is_status_valid_for_part(part_id, status_id)
  );