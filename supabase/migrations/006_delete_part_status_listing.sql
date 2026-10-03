begin;

create or replace function public.delete_part_status_listing(p_part_status_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part_id uuid;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.id, p.team_id
  into v_part_id, v_team_id
  from public.part_status as ps
  join public.parts as p on p.id = ps.part_id
  where ps.id = p_part_status_id
  for update of p, ps;

  if not found then
    raise exception 'Part status listing was not found';
  end if;
  if not private.can_manage_inventory(v_team_id) then
    raise exception 'You do not have permission to manage this inventory';
  end if;

  delete from public.part_status
  where id = p_part_status_id;

  if not exists (
    select 1
    from public.part_status as ps
    where ps.part_id = v_part_id
  ) then
    delete from public.task_parts
    where part_id = v_part_id;

    delete from public.parts
    where id = v_part_id;
  end if;
end;
$$;

revoke all on function public.delete_part_status_listing(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_part_status_listing(uuid)
  to authenticated;

commit;