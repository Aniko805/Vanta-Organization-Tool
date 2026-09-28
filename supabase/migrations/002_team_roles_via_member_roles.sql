create or replace function public.handle_new_team()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  captain_role_id uuid;
  owner_member_id uuid;
begin
  insert into public.team_roles (
    team_id,
    name,
    is_admin,
    can_manage_members,
    can_manage_tasks,
    can_manage_inventory
  )
  values (new.id, 'Captain', true, true, true, true)
  returning id into captain_role_id;

  insert into public.team_roles (
    team_id,
    name,
    is_admin,
    can_manage_members,
    can_manage_tasks,
    can_manage_inventory
  )
  values
    (new.id, 'Business', false, false, true, false),
    (new.id, 'Hardware', false, false, true, true),
    (new.id, 'Software', false, false, true, true);

  if new.owner_id is not null then
    insert into public.team_members (team_id, user_id)
    values (new.id, new.owner_id)
    returning id into owner_member_id;

    insert into public.member_roles (member_id, role_id)
    values (owner_member_id, captain_role_id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute function public.handle_new_team();

create or replace function public.join_team_by_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
  joining_user_id uuid := auth.uid();
begin
  if joining_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id
  into tid
  from public.teams
  where invite_code = lower(trim(p_code))
  limit 1;

  if tid is null then
    raise exception 'Invalid invite code';
  end if;

  if not exists (
    select 1
    from public.team_members
    where team_id = tid and user_id = joining_user_id
  ) then
    insert into public.team_members (team_id, user_id)
    values (tid, joining_user_id);
  end if;

  return tid;
end;
$$;

revoke all on function public.join_team_by_invite(text) from public;
grant execute on function public.join_team_by_invite(text) to authenticated;