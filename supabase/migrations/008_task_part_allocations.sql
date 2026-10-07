begin;

alter table public.task_parts
  add column if not exists quantity integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_parts_quantity_nonnegative'
      and conrelid = 'public.task_parts'::regclass
  ) then
    alter table public.task_parts
      add constraint task_parts_quantity_nonnegative check (quantity >= 0);
  end if;
end;
$$;

update public.status_list
set name = case
  when lower(regexp_replace(trim(name), '[_-]+', ' ', 'g')) in ('inventory', 'in stock')
    then 'Inventory'
  when lower(regexp_replace(trim(name), '[_-]+', ' ', 'g')) in ('reserved', 'to be used')
    then 'Reserved'
  when lower(regexp_replace(trim(name), '[_-]+', ' ', 'g')) = 'in use'
    then 'In Use'
end
where lower(regexp_replace(trim(name), '[_-]+', ' ', 'g')) in (
  'inventory', 'in stock', 'reserved', 'to be used', 'in use'
);

insert into public.status_list (name, team_id, is_default)
select required.name, null, true
from (values ('Inventory'), ('Reserved'), ('In Use')) as required(name)
where not exists (
  select 1
  from public.status_list as existing
  where existing.team_id is null
    and existing.is_default
    and lower(regexp_replace(trim(existing.name), '[_-]+', ' ', 'g')) =
      lower(regexp_replace(trim(required.name), '[_-]+', ' ', 'g'))
);

create or replace function private.transfer_task_part_quantity(
  p_part_id uuid,
  p_quantity integer,
  p_source_category text,
  p_destination_category text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
  v_source_names text[];
  v_destination_names text[];
  v_destination_status_id uuid;
  v_source record;
  v_remaining integer;
  v_transfer integer;
begin
  if p_quantity <= 0 then
    raise exception 'Part allocation quantity must be positive';
  end if;

  if p_source_category not in ('inventory', 'reserved', 'in_use')
    or p_destination_category not in ('inventory', 'reserved', 'in_use')
    or p_source_category = p_destination_category then
    raise exception 'Invalid inventory status transfer';
  end if;

  select team_id
  into v_team_id
  from public.parts
  where id = p_part_id
  for update;

  if not found then
    raise exception 'Part was not found';
  end if;

  v_source_names := case p_source_category
    when 'inventory' then array['inventory', 'in stock']
    when 'reserved' then array['reserved', 'to be used']
    else array['in use']
  end;
  v_destination_names := case p_destination_category
    when 'inventory' then array['inventory', 'in stock']
    when 'reserved' then array['reserved', 'to be used']
    else array['in use']
  end;

  select status.id
  into v_destination_status_id
  from public.status_list as status
  where lower(regexp_replace(trim(status.name), '[_-]+', ' ', 'g')) = any(v_destination_names)
    and (status.team_id = v_team_id or (status.team_id is null and status.is_default))
  order by case when status.team_id = v_team_id then 0 else 1 end, status.id
  limit 1;

  if v_destination_status_id is null then
    raise exception 'Destination inventory status is unavailable';
  end if;

  v_remaining := p_quantity;
  for v_source in
    select part_status.id, part_status.quantity
    from public.part_status
    join public.status_list as status on status.id = part_status.status_id
    where part_status.part_id = p_part_id
      and lower(regexp_replace(trim(status.name), '[_-]+', ' ', 'g')) = any(v_source_names)
      and (status.team_id = v_team_id or (status.team_id is null and status.is_default))
    order by case when status.team_id = v_team_id then 0 else 1 end,
      part_status.created_at,
      part_status.id
    for update of part_status
  loop
    v_transfer := least(v_remaining, v_source.quantity);
    if v_transfer > 0 then
      update public.part_status
      set quantity = quantity - v_transfer
      where id = v_source.id;
      v_remaining := v_remaining - v_transfer;
      exit when v_remaining = 0;
    end if;
  end loop;

  if v_remaining > 0 then
    raise exception 'Insufficient quantity in the source inventory status';
  end if;

  insert into public.part_status (part_id, status_id, quantity, created_by)
  values (p_part_id, v_destination_status_id, p_quantity, auth.uid())
  on conflict (part_id, status_id)
  do update set quantity = public.part_status.quantity + excluded.quantity;
end;
$$;

revoke all on function private.transfer_task_part_quantity(uuid, integer, text, text)
  from public, anon, authenticated;

create or replace function public.create_team_task_with_parts(
  p_team_id uuid,
  p_name text,
  p_description text,
  p_status text,
  p_importance text,
  p_due_date date,
  p_parent_id uuid,
  p_assignee_ids uuid[],
  p_part_allocations jsonb
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_allocation record;
  v_destination_category text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if not private.is_team_member(p_team_id) then
    raise exception 'You must be a member of this team to create a task';
  end if;
  if p_name is null or trim(p_name) = '' then
    raise exception 'Task name is required';
  end if;
  if p_status not in ('todo', 'in_progress', 'blocked', 'done') then
    raise exception 'Invalid task status';
  end if;
  if p_importance not in ('low', 'medium', 'high', 'critical') then
    raise exception 'Invalid task importance';
  end if;
  if p_parent_id is not null and not exists (
    select 1 from public.tasks
    where id = p_parent_id and team_id = p_team_id and not is_personal
  ) then
    raise exception 'Parent task must belong to this team';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_assignee_ids, array[]::uuid[])) as requested(user_id)
    where not exists (
      select 1 from public.team_members as member
      where member.team_id = p_team_id and member.user_id = requested.user_id
    )
  ) then
    raise exception 'Every assignee must belong to this team';
  end if;

  if jsonb_typeof(coalesce(p_part_allocations, '[]'::jsonb)) <> 'array' then
    raise exception 'Part allocations must be an array';
  end if;
  if jsonb_array_length(coalesce(p_part_allocations, '[]'::jsonb)) > 0
    and not private.can_manage_inventory(p_team_id) then
    raise exception 'Inventory manager access is required to reserve parts';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_part_allocations, '[]'::jsonb))
      as allocation(part_id uuid, quantity integer)
    group by part_id
    having count(*) > 1
  ) then
    raise exception 'A part may only be selected once per task';
  end if;

  insert into public.tasks (
    team_id, created_by, name, description, status, importance,
    due_date, is_personal, parent_id
  ) values (
    p_team_id, v_user_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''),
    p_status, p_importance, p_due_date, false, p_parent_id
  ) returning * into v_task;

  insert into public.task_assignees (task_id, user_id)
  select v_task.id, requested.user_id
  from (
    select distinct user_id
    from unnest(coalesce(p_assignee_ids, array[]::uuid[])) as assignees(user_id)
  ) as requested;

  v_destination_category := case
    when p_status = 'in_progress' then 'in_use'
    else 'reserved'
  end;

  for v_allocation in
    select allocation.part_id, allocation.quantity
    from jsonb_to_recordset(coalesce(p_part_allocations, '[]'::jsonb))
      as allocation(part_id uuid, quantity integer)
    order by allocation.part_id
  loop
    if v_allocation.part_id is null or v_allocation.quantity is null
      or v_allocation.quantity <= 0 then
      raise exception 'Each part allocation needs a part and positive quantity';
    end if;
    if not exists (
      select 1 from public.parts
      where id = v_allocation.part_id and team_id = p_team_id
    ) then
      raise exception 'Every selected part must belong to this team';
    end if;

    perform private.transfer_task_part_quantity(
      v_allocation.part_id,
      v_allocation.quantity,
      'inventory',
      v_destination_category
    );

    insert into public.task_parts (task_id, part_id, quantity)
    values (v_task.id, v_allocation.part_id, v_allocation.quantity);
  end loop;

  return v_task;
end;
$$;

revoke all on function public.create_team_task_with_parts(
  uuid, text, text, text, text, date, uuid, uuid[], jsonb
) from public, anon, authenticated;
grant execute on function public.create_team_task_with_parts(
  uuid, text, text, text, text, date, uuid, uuid[], jsonb
) to authenticated;

create or replace function public.update_team_task_status(
  p_task_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_allocation record;
  v_source_category text;
  v_destination_category text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_status not in ('todo', 'in_progress', 'blocked', 'done') then
    raise exception 'Invalid task status';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id and not is_personal
  for update;
  if not found then
    raise exception 'Team task was not found';
  end if;
  if not private.is_team_member(v_task.team_id) then
    raise exception 'You must be a member of this team to update its task';
  end if;
  if v_task.status = p_status then
    return;
  end if;

  v_source_category := case
    when v_task.status = 'in_progress' then 'in_use'
    else 'reserved'
  end;
  v_destination_category := case
    when p_status = 'in_progress' then 'in_use'
    else 'reserved'
  end;

  if v_source_category <> v_destination_category and exists (
    select 1 from public.task_parts
    where task_id = v_task.id and quantity > 0
  ) then
    if exists (
      select 1
      from public.task_parts as allocation
      join public.parts as part on part.id = allocation.part_id
      where allocation.task_id = v_task.id
        and allocation.quantity > 0
        and part.team_id <> v_task.team_id
    ) then
      raise exception 'A task allocation references inventory outside this team';
    end if;
    if not private.can_manage_inventory(v_task.team_id) then
      raise exception 'Inventory manager access is required to move allocated parts';
    end if;

    for v_allocation in
      select part_id, quantity
      from public.task_parts
      where task_id = v_task.id and quantity > 0
      order by part_id
      for update
    loop
      perform private.transfer_task_part_quantity(
        v_allocation.part_id,
        v_allocation.quantity,
        v_source_category,
        v_destination_category
      );
    end loop;
  end if;

  update public.tasks
  set status = p_status, updated_at = now()
  where id = v_task.id;
end;
$$;

create or replace function public.replace_team_task_parts(
  p_task_id uuid,
  p_part_allocations jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
  v_allocation record;
  v_source_category text;
  v_destination_category text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if jsonb_typeof(coalesce(p_part_allocations, '[]'::jsonb)) <> 'array' then
    raise exception 'Part allocations must be an array';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id and not is_personal
  for update;
  if not found then
    raise exception 'Team task was not found';
  end if;
  if not private.is_team_member(v_task.team_id)
    or not private.can_manage_inventory(v_task.team_id) then
    raise exception 'Inventory manager access is required to change task parts';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(coalesce(p_part_allocations, '[]'::jsonb))
      as allocation(part_id uuid, quantity integer)
    group by part_id
    having count(*) > 1
  ) then
    raise exception 'A part may only be selected once per task';
  end if;
  if exists (
    select 1
    from public.task_parts as allocation
    join public.parts as part on part.id = allocation.part_id
    where allocation.task_id = v_task.id
      and allocation.quantity > 0
      and part.team_id <> v_task.team_id
  ) then
    raise exception 'A task allocation references inventory outside this team';
  end if;

  v_source_category := case
    when v_task.status = 'in_progress' then 'in_use'
    else 'reserved'
  end;
  v_destination_category := v_source_category;

  for v_allocation in
    select part_id, quantity
    from public.task_parts
    where task_id = v_task.id and quantity > 0
    order by part_id
    for update
  loop
    perform private.transfer_task_part_quantity(
      v_allocation.part_id,
      v_allocation.quantity,
      v_source_category,
      'inventory'
    );
  end loop;
  delete from public.task_parts where task_id = v_task.id;

  for v_allocation in
    select allocation.part_id, allocation.quantity
    from jsonb_to_recordset(coalesce(p_part_allocations, '[]'::jsonb))
      as allocation(part_id uuid, quantity integer)
    order by allocation.part_id
  loop
    if v_allocation.part_id is null or v_allocation.quantity is null
      or v_allocation.quantity <= 0 then
      raise exception 'Each part allocation needs a part and positive quantity';
    end if;
    if not exists (
      select 1 from public.parts
      where id = v_allocation.part_id and team_id = v_task.team_id
    ) then
      raise exception 'Every selected part must belong to this team';
    end if;

    perform private.transfer_task_part_quantity(
      v_allocation.part_id,
      v_allocation.quantity,
      'inventory',
      v_destination_category
    );
    insert into public.task_parts (task_id, part_id, quantity)
    values (v_task.id, v_allocation.part_id, v_allocation.quantity);
  end loop;
end;
$$;

revoke all on function public.replace_team_task_parts(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_team_task_parts(uuid, jsonb)
  to authenticated;

revoke all on function public.update_team_task_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_team_task_status(uuid, text)
  to authenticated;

create or replace function public.delete_task_tree(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_root public.tasks%rowtype;
  v_task_ids uuid[];
  v_allocation record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_root
  from public.tasks
  where id = p_task_id
  for update;
  if not found then
    raise exception 'Task was not found';
  end if;

  if v_root.is_personal then
    if v_root.created_by <> v_user_id then
      raise exception 'You do not own this personal task';
    end if;
  elsif not exists (
    select 1 from public.teams
    where id = v_root.team_id and owner_id = v_user_id
  ) and not exists (
    select 1
    from public.team_members as member
    join public.member_roles as member_role on member_role.member_id = member.id
    join public.team_roles as role on role.id = member_role.role_id
    where member.team_id = v_root.team_id
      and member.user_id = v_user_id
      and role.team_id = v_root.team_id
      and (role.is_admin or role.can_manage_tasks)
  ) then
    raise exception 'You do not have permission to manage this team task';
  end if;

  with recursive task_tree(id) as (
    select id from public.tasks where id = p_task_id
    union
    select child.id
    from public.tasks as child
    join task_tree as parent on child.parent_id = parent.id
  )
  select array_agg(id) into v_task_ids from task_tree;

  if v_root.is_personal and exists (
    select 1 from public.tasks
    where id = any(v_task_ids)
      and (not is_personal or created_by <> v_user_id or team_id is not null)
  ) then
    raise exception 'The personal task tree contains tasks outside your ownership';
  end if;
  if not v_root.is_personal and exists (
    select 1 from public.tasks
    where id = any(v_task_ids)
      and (is_personal or team_id is distinct from v_root.team_id)
  ) then
    raise exception 'The team task tree contains tasks from another scope';
  end if;
  if exists (
    select 1
    from public.task_parts as allocation
    join public.parts as part on part.id = allocation.part_id
    where allocation.task_id = any(v_task_ids)
      and allocation.quantity > 0
      and (v_root.is_personal or part.team_id <> v_root.team_id)
  ) then
    raise exception 'The task tree contains an allocation outside its inventory scope';
  end if;

  perform 1 from public.tasks where id = any(v_task_ids) for update;

  for v_allocation in
    select task_parts.part_id, task_parts.quantity, task.status
    from public.task_parts
    join public.tasks as task on task.id = task_parts.task_id
    where task_parts.task_id = any(v_task_ids)
      and task_parts.quantity > 0
    order by task_parts.part_id, task_parts.task_id
  loop
    perform private.transfer_task_part_quantity(
      v_allocation.part_id,
      v_allocation.quantity,
      case when v_allocation.status = 'in_progress' then 'in_use' else 'reserved' end,
      'inventory'
    );
  end loop;

  if to_regclass('public.subtasks') is not null then
    if to_regclass('public.subtask_assignees') is not null then
      execute
        'delete from public.subtask_assignees
         where subtask_id in (
           select id from public.subtasks where task_id = any($1)
         )'
        using v_task_ids;
    end if;
    execute 'delete from public.subtasks where task_id = any($1)'
      using v_task_ids;
  end if;

  delete from public.task_assignees where task_id = any(v_task_ids);
  delete from public.task_role_assignees where task_id = any(v_task_ids);
  delete from public.task_parts where task_id = any(v_task_ids);
  delete from public.tasks where id = any(v_task_ids);
end;
$$;

revoke all on function public.delete_task_tree(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_task_tree(uuid)
  to authenticated;

revoke insert, update, delete on table public.task_parts
  from public, anon, authenticated;
grant select on table public.task_parts to authenticated;

commit;