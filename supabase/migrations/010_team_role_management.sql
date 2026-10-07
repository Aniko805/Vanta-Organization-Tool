begin;

create or replace function private.can_manage_team_roles(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teams as team
    where team.id = p_team_id
      and team.owner_id = (select auth.uid())
  ) or exists (
    select 1
    from public.team_members as member
    join public.member_roles as member_role on member_role.member_id = member.id
    join public.team_roles as role on role.id = member_role.role_id
    where member.team_id = p_team_id
      and member.user_id = (select auth.uid())
      and role.team_id = p_team_id
      and role.is_admin
  );
$$;

revoke all on function private.can_manage_team_roles(uuid)
  from public, anon, authenticated;

alter table public.team_roles enable row level security;
revoke all on table public.team_roles from public, anon, authenticated;
grant select on table public.team_roles to authenticated;

drop policy if exists team_roles_select_team_members on public.team_roles;
create policy team_roles_select_team_members
  on public.team_roles for select to authenticated
  using (
    private.is_team_member(team_id)
    or exists (
      select 1
      from public.teams as team
      where team.id = team_id
        and team.owner_id = (select auth.uid())
    )
  );

create or replace function public.create_team_role(
  p_team_id uuid,
  p_name text,
  p_is_admin boolean,
  p_can_manage_tasks boolean,
  p_can_manage_members boolean,
  p_can_manage_inventory boolean
)
returns public.team_roles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_locked_team_id uuid;
  v_role public.team_roles%rowtype;
  v_name text := btrim(p_name);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select team.id
  into v_locked_team_id
  from public.teams as team
  where team.id = p_team_id
  for update;
  if not found then
    raise exception 'Team was not found';
  end if;
  if not private.can_manage_team_roles(p_team_id) then
    raise exception 'Only the team owner or an admin can manage role definitions';
  end if;
  if v_name is null or v_name = '' then
    raise exception 'Role name is required';
  end if;
  if p_is_admin is null or p_can_manage_tasks is null
    or p_can_manage_members is null or p_can_manage_inventory is null then
    raise exception 'Every role permission must be specified';
  end if;
  if exists (
    select 1
    from public.team_roles as role
    where role.team_id = p_team_id
      and lower(btrim(role.name)) = lower(v_name)
  ) then
    raise exception 'A role with this name already exists in this team';
  end if;

  insert into public.team_roles (
    team_id,
    name,
    is_admin,
    can_manage_tasks,
    can_manage_members,
    can_manage_inventory
  ) values (
    p_team_id,
    v_name,
    p_is_admin,
    p_can_manage_tasks,
    p_can_manage_members,
    p_can_manage_inventory
  )
  returning * into v_role;

  return v_role;
end;
$$;

create or replace function public.update_team_role(
  p_role_id uuid,
  p_name text,
  p_is_admin boolean,
  p_can_manage_tasks boolean,
  p_can_manage_members boolean,
  p_can_manage_inventory boolean
)
returns public.team_roles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_locked_team_id uuid;
  v_role public.team_roles%rowtype;
  v_name text := btrim(p_name);
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select role.team_id
  into v_team_id
  from public.team_roles as role
  where role.id = p_role_id;
  if not found then
    raise exception 'Role was not found';
  end if;

  select team.id
  into v_locked_team_id
  from public.teams as team
  where team.id = v_team_id
  for update;
  if not found then
    raise exception 'Team was not found';
  end if;

  select role.*
  into v_role
  from public.team_roles as role
  where role.id = p_role_id
    and role.team_id = v_team_id
  for update;
  if not found then
    raise exception 'Role was not found';
  end if;
  if not private.can_manage_team_roles(v_team_id) then
    raise exception 'Only the team owner or an admin can manage role definitions';
  end if;
  if v_name is null or v_name = '' then
    raise exception 'Role name is required';
  end if;
  if p_is_admin is null or p_can_manage_tasks is null
    or p_can_manage_members is null or p_can_manage_inventory is null then
    raise exception 'Every role permission must be specified';
  end if;
  if exists (
    select 1
    from public.team_roles as role
    where role.team_id = v_team_id
      and role.id <> p_role_id
      and lower(btrim(role.name)) = lower(v_name)
  ) then
    raise exception 'A role with this name already exists in this team';
  end if;

  update public.team_roles as role
  set name = v_name,
      is_admin = p_is_admin,
      can_manage_tasks = p_can_manage_tasks,
      can_manage_members = p_can_manage_members,
      can_manage_inventory = p_can_manage_inventory
  where role.id = p_role_id
    and role.team_id = v_team_id
  returning role.* into v_role;

  return v_role;
end;
$$;

create or replace function public.delete_team_role(p_role_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_team_id uuid;
  v_locked_team_id uuid;
  v_member_assignment_count bigint;
  v_task_assignment_count bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select role.team_id
  into v_team_id
  from public.team_roles as role
  where role.id = p_role_id;
  if not found then
    raise exception 'Role was not found';
  end if;

  select team.id
  into v_locked_team_id
  from public.teams as team
  where team.id = v_team_id
  for update;
  if not found then
    raise exception 'Team was not found';
  end if;

  perform 1
  from public.team_roles as role
  where role.id = p_role_id
    and role.team_id = v_team_id
  for update;
  if not found then
    raise exception 'Role was not found';
  end if;
  if not private.can_manage_team_roles(v_team_id) then
    raise exception 'Only the team owner or an admin can manage role definitions';
  end if;

  delete from public.member_roles as member_role
  where member_role.role_id = p_role_id;
  get diagnostics v_member_assignment_count = row_count;

  delete from public.task_role_assignees as task_role
  where task_role.role_id = p_role_id;
  get diagnostics v_task_assignment_count = row_count;

  delete from public.team_roles as role
  where role.id = p_role_id
    and role.team_id = v_team_id;

  return jsonb_build_object(
    'member_assignments_deleted', v_member_assignment_count,
    'task_assignments_deleted', v_task_assignment_count
  );
end;
$$;

revoke all on function public.create_team_role(uuid, text, boolean, boolean, boolean, boolean)
  from public, anon, authenticated;
revoke all on function public.update_team_role(uuid, text, boolean, boolean, boolean, boolean)
  from public, anon, authenticated;
revoke all on function public.delete_team_role(uuid)
  from public, anon, authenticated;

grant execute on function public.create_team_role(uuid, text, boolean, boolean, boolean, boolean)
  to authenticated;
grant execute on function public.update_team_role(uuid, text, boolean, boolean, boolean, boolean)
  to authenticated;
grant execute on function public.delete_team_role(uuid)
  to authenticated;

commit;
