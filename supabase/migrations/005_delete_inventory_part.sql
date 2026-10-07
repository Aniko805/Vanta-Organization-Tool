begin;

create or replace function public.delete_part_from_inventory(p_part_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.team_id
  into v_team_id
  from public.parts as p
  where p.id = p_part_id
  for update;

  if not found then
    raise exception 'Part was not found';
  end if;
  if not private.can_manage_inventory(v_team_id) then
    raise exception 'You do not have permission to manage this inventory';
  end if;

  delete from public.task_parts
  where part_id = p_part_id;

  delete from public.part_status
  where part_id = p_part_id;

  delete from public.parts
  where id = p_part_id;
end;
$$;

revoke all on function public.delete_part_from_inventory(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_part_from_inventory(uuid)
  to authenticated;

commit;