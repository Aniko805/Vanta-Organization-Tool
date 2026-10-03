-- Keep one catalog identity within a team and within the global official catalog.
with ranked_catalog as (
  select
    id,
    first_value(id) over (
      partition by
        team_id,
        btrim(name),
        coalesce(btrim(sku), ''),
        coalesce(btrim(description), '')
      order by created_at, id
    ) as keeper_id,
    row_number() over (
      partition by
        team_id,
        btrim(name),
        coalesce(btrim(sku), ''),
        coalesce(btrim(description), '')
      order by created_at, id
    ) as row_number
  from public.part_catalog
  where team_id is not null or (team_id is null and is_official)
), duplicate_catalog as (
  select id, keeper_id
  from ranked_catalog
  where row_number > 1
)
update public.parts as p
set part_catalog_id = duplicate_catalog.keeper_id
from duplicate_catalog
where p.part_catalog_id = duplicate_catalog.id;

with ranked_catalog as (
  select
    id,
    row_number() over (
      partition by
        team_id,
        btrim(name),
        coalesce(btrim(sku), ''),
        coalesce(btrim(description), '')
      order by created_at, id
    ) as row_number
  from public.part_catalog
  where team_id is not null or (team_id is null and is_official)
)
delete from public.part_catalog as pc
using ranked_catalog
where pc.id = ranked_catalog.id
  and ranked_catalog.row_number > 1;

-- Repoint task links before removing duplicate team inventory rows.
with ranked_parts as (
  select
    id,
    first_value(id) over (
      partition by team_id, part_catalog_id
      order by created_at, id
    ) as keeper_id,
    row_number() over (
      partition by team_id, part_catalog_id
      order by created_at, id
    ) as row_number
  from public.parts
  where part_catalog_id is not null
), duplicate_parts as (
  select id, keeper_id
  from ranked_parts
  where row_number > 1
)
insert into public.task_parts (task_id, part_id)
select tp.task_id, duplicate_parts.keeper_id
from public.task_parts as tp
join duplicate_parts on duplicate_parts.id = tp.part_id
on conflict (task_id, part_id) do nothing;

with ranked_parts as (
  select
    id,
    first_value(id) over (
      partition by team_id, part_catalog_id
      order by created_at, id
    ) as keeper_id,
    row_number() over (
      partition by team_id, part_catalog_id
      order by created_at, id
    ) as row_number
  from public.parts
  where part_catalog_id is not null
), duplicate_parts as (
  select id, keeper_id
  from ranked_parts
  where row_number > 1
)
update public.part_status as ps
set part_id = duplicate_parts.keeper_id
from duplicate_parts
where ps.part_id = duplicate_parts.id;

with ranked_statuses as (
  select
    id,
    part_id,
    status_id,
    first_value(id) over (
      partition by part_id, status_id
      order by created_at, id
    ) as keeper_id,
    sum(quantity) over (partition by part_id, status_id) as total_quantity,
    row_number() over (
      partition by part_id, status_id
      order by created_at, id
    ) as row_number
  from public.part_status
  where part_id is not null and status_id is not null
)
update public.part_status as ps
set quantity = ranked_statuses.total_quantity,
    name = coalesce(sl.name, ps.name)
from ranked_statuses
left join public.status_list as sl on sl.id = ranked_statuses.status_id
where ps.id = ranked_statuses.keeper_id
  and ranked_statuses.row_number = 1;

with ranked_statuses as (
  select
    id,
    first_value(id) over (
      partition by part_id, status_id
      order by created_at, id
    ) as keeper_id,
    row_number() over (
      partition by part_id, status_id
      order by created_at, id
    ) as row_number
  from public.part_status
  where part_id is not null and status_id is not null
)
delete from public.part_status as ps
using ranked_statuses
where ps.id = ranked_statuses.id
  and ranked_statuses.row_number > 1;

with ranked_parts as (
  select
    id,
    first_value(id) over (
      partition by team_id, part_catalog_id
      order by created_at, id
    ) as keeper_id,
    row_number() over (
      partition by team_id, part_catalog_id
      order by created_at, id
    ) as row_number
  from public.parts
  where part_catalog_id is not null
), duplicate_parts as (
  select id
  from ranked_parts
  where row_number > 1
)
delete from public.task_parts as tp
using duplicate_parts
where tp.part_id = duplicate_parts.id;

with ranked_parts as (
  select
    id,
    first_value(id) over (
      partition by team_id, part_catalog_id
      order by created_at, id
    ) as keeper_id,
    row_number() over (
      partition by team_id, part_catalog_id
      order by created_at, id
    ) as row_number
  from public.parts
  where part_catalog_id is not null
)
delete from public.parts as p
using ranked_parts
where p.id = ranked_parts.id
  and ranked_parts.row_number > 1;

create unique index if not exists part_catalog_team_identity_uidx
  on public.part_catalog (
    team_id,
    btrim(name),
    coalesce(btrim(sku), ''),
    coalesce(btrim(description), '')
  )
  where team_id is not null;

create unique index if not exists part_catalog_official_identity_uidx
  on public.part_catalog (
    btrim(name),
    coalesce(btrim(sku), ''),
    coalesce(btrim(description), '')
  )
  where team_id is null and is_official;

create unique index if not exists parts_team_catalog_uidx
  on public.parts (team_id, part_catalog_id)
  where part_catalog_id is not null;

create unique index if not exists part_status_part_status_uidx
  on public.part_status (part_id, status_id)
  where part_id is not null and status_id is not null;

create or replace function public.add_part_to_inventory(
  p_team_id uuid,
  p_catalog_id uuid,
  p_name text,
  p_sku text,
  p_description text,
  p_status_id uuid,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_catalog_id uuid;
  v_part_id uuid;
  v_status_name text;
  v_name text := btrim(coalesce(p_name, ''));
  v_sku text := nullif(btrim(coalesce(p_sku, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not private.can_manage_inventory(p_team_id) then
    raise exception 'You do not have permission to manage this inventory';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select sl.name
  into v_status_name
  from public.status_list as sl
  where sl.id = p_status_id
    and (
      sl.team_id = p_team_id
      or (sl.team_id is null and sl.is_default)
    );
  if not found then
    raise exception 'Status is not available to this team';
  end if;

  if p_catalog_id is not null then
    select pc.id
    into v_catalog_id
    from public.part_catalog as pc
    where pc.id = p_catalog_id
      and (
        pc.team_id = p_team_id
        or (pc.team_id is null and pc.is_official)
      );
    if not found then
      raise exception 'Catalog item is not available to this team';
    end if;
  else
    if v_name = '' then
      raise exception 'Part name is required';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(
      p_team_id::text || chr(31) || v_name || chr(31) ||
      coalesce(v_sku, '') || chr(31) || coalesce(v_description, ''),
      0
    ));

    select pc.id
    into v_catalog_id
    from public.part_catalog as pc
    where pc.team_id = p_team_id
      and btrim(pc.name) = v_name
      and coalesce(btrim(pc.sku), '') = coalesce(v_sku, '')
      and coalesce(btrim(pc.description), '') = coalesce(v_description, '')
    order by pc.created_at, pc.id
    limit 1;

    if v_catalog_id is null then
      select pc.id
      into v_catalog_id
      from public.part_catalog as pc
      where pc.team_id is null
        and pc.is_official
        and btrim(pc.name) = v_name
        and coalesce(btrim(pc.sku), '') = coalesce(v_sku, '')
        and coalesce(btrim(pc.description), '') = coalesce(v_description, '')
      order by pc.created_at, pc.id
      limit 1;
    end if;

    if v_catalog_id is null then
      insert into public.part_catalog (
        name,
        sku,
        description,
        team_id,
        is_official,
        created_by
      )
      values (
        v_name,
        v_sku,
        v_description,
        p_team_id,
        false,
        auth.uid()
      )
      returning id into v_catalog_id;
    end if;
  end if;

  insert into public.parts (team_id, part_catalog_id, created_by)
  values (p_team_id, v_catalog_id, auth.uid())
  on conflict (team_id, part_catalog_id) where part_catalog_id is not null
  do update set updated_at = now()
  returning id into v_part_id;

  insert into public.part_status (
    part_id,
    status_id,
    name,
    quantity,
    created_by
  )
  values (
    v_part_id,
    p_status_id,
    v_status_name,
    p_quantity,
    auth.uid()
  )
  on conflict (part_id, status_id)
    where part_id is not null and status_id is not null
  do update set
    quantity = public.part_status.quantity + excluded.quantity,
    name = excluded.name;

  return v_part_id;
end;
$$;

create or replace function public.merge_part_status(
  p_part_status_id uuid,
  p_status_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_part_id uuid;
  v_team_id uuid;
  v_source_status_id uuid;
  v_source_quantity integer;
  v_status_name text;
  v_target_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select p.id, p.team_id
  into v_part_id, v_team_id
  from public.part_status as source
  join public.parts as p on p.id = source.part_id
  where source.id = p_part_status_id
  for update of p;
  if not found then
    raise exception 'Part status was not found';
  end if;
  if not private.can_manage_inventory(v_team_id) then
    raise exception 'You do not have permission to manage this inventory';
  end if;

  select sl.name
  into v_status_name
  from public.status_list as sl
  where sl.id = p_status_id
    and (
      sl.team_id = v_team_id
      or (sl.team_id is null and sl.is_default)
    );
  if not found then
    raise exception 'Status is not available to this team';
  end if;

  select source.status_id, source.quantity
  into v_source_status_id, v_source_quantity
  from public.part_status as source
  where source.id = p_part_status_id
  for update;

  if v_source_status_id is not distinct from p_status_id then
    update public.part_status
    set name = v_status_name
    where id = p_part_status_id;
    return;
  end if;

  select target.id
  into v_target_id
  from public.part_status as target
  where target.part_id = v_part_id
    and target.status_id = p_status_id
  for update;

  if v_target_id is null then
    update public.part_status
    set status_id = p_status_id,
        name = v_status_name
    where id = p_part_status_id;
  else
    update public.part_status
    set quantity = quantity + v_source_quantity,
        name = v_status_name
    where id = v_target_id;
    delete from public.part_status
    where id = p_part_status_id;
  end if;
end;
$$;

revoke all on function public.add_part_to_inventory(uuid, uuid, text, text, text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.add_part_to_inventory(uuid, uuid, text, text, text, uuid, integer)
  to authenticated;
revoke all on function public.merge_part_status(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.merge_part_status(uuid, uuid)
  to authenticated;