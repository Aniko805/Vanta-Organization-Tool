-- Official catalog identity.
-- Numbered 012 because 011_team_delete_cascade.sql already occupies 011.
--
-- The Supabase SQL editor runs each statement on its own connection, so
-- temporary tables cannot be shared between statements. This file is one
-- DO block so the dedupe tables live for the whole migration.
--
-- (manufacturer, sku) is the stable key for official rows. The older
-- (name, sku, description) index stays until a goBILDA import shows no
-- regressions. Team-scoped rows are not covered by the new index.

do $migration$
begin
  alter table public.part_catalog
    add column if not exists product_url text,
    add column if not exists image_url text,
    add column if not exists category text,
    add column if not exists source text;

  update public.part_catalog
  set manufacturer = btrim(manufacturer)
  where team_id is null
    and is_official
    and manufacturer is not null
    and manufacturer is distinct from btrim(manufacturer);

  -- Manufacturer is derivable only when a prior import recorded `source`.
  update public.part_catalog
  set manufacturer = case btrim(source)
    when 'gobilda' then 'goBILDA'
    when 'rev' then 'REV Robotics'
    else manufacturer
  end
  where team_id is null
    and is_official
    and (manufacturer is null or btrim(manufacturer) = '')
    and source is not null
    and btrim(source) in ('gobilda', 'rev');

  create temporary table official_catalog_dupes on commit drop as
  with ranked as (
    select
      id,
      first_value(id) over (
        partition by coalesce(btrim(manufacturer), ''), btrim(sku)
        order by created_at, id
      ) as keeper_id,
      row_number() over (
        partition by coalesce(btrim(manufacturer), ''), btrim(sku)
        order by created_at, id
      ) as row_number
    from public.part_catalog
    where team_id is null
      and is_official
      and sku is not null
      and btrim(sku) <> ''
  )
  select id, keeper_id
  from ranked
  where row_number > 1;

  create temporary table official_catalog_group on commit drop as
  select keeper_id as catalog_id, keeper_id
  from official_catalog_dupes
  union
  select id, keeper_id
  from official_catalog_dupes;

  -- One inventory row per team should survive for each official identity.
  -- Prefer the part that already points at the keeper catalog row.
  create temporary table official_part_drops on commit drop as
  with ranked_parts as (
    select
      p.id as part_id,
      first_value(p.id) over (
        partition by p.team_id, g.keeper_id
        order by
          case when p.part_catalog_id = g.keeper_id then 0 else 1 end,
          p.created_at,
          p.id
      ) as keep_part_id,
      row_number() over (
        partition by p.team_id, g.keeper_id
        order by
          case when p.part_catalog_id = g.keeper_id then 0 else 1 end,
          p.created_at,
          p.id
      ) as row_number
    from public.parts as p
    join official_catalog_group as g on g.catalog_id = p.part_catalog_id
  )
  select part_id as drop_part_id, keep_part_id
  from ranked_parts
  where row_number > 1;

  insert into public.task_parts (task_id, part_id, quantity)
  select tp.task_id, drops.keep_part_id, sum(tp.quantity)
  from public.task_parts as tp
  join official_part_drops as drops on drops.drop_part_id = tp.part_id
  group by tp.task_id, drops.keep_part_id
  on conflict (task_id, part_id) do update
  set quantity = public.task_parts.quantity + excluded.quantity;

  delete from public.task_parts as tp
  using official_part_drops as drops
  where tp.part_id = drops.drop_part_id;

  insert into public.part_status (part_id, status_id, quantity, created_by)
  select
    drops.keep_part_id,
    ps.status_id,
    sum(ps.quantity),
    (array_agg(ps.created_by))[1]
  from public.part_status as ps
  join official_part_drops as drops on drops.drop_part_id = ps.part_id
  group by drops.keep_part_id, ps.status_id
  on conflict (part_id, status_id) do update
  set quantity = public.part_status.quantity + excluded.quantity;

  delete from public.part_status as ps
  using official_part_drops as drops
  where ps.part_id = drops.drop_part_id;

  delete from public.parts as p
  using official_part_drops as drops
  where p.id = drops.drop_part_id;

  update public.parts as p
  set
    part_catalog_id = g.keeper_id,
    updated_at = now()
  from official_catalog_group as g
  where p.part_catalog_id = g.catalog_id
    and p.part_catalog_id is distinct from g.keeper_id;

  delete from public.part_catalog as pc
  using official_catalog_dupes as dupes
  where pc.id = dupes.id;

  create unique index if not exists part_catalog_official_manufacturer_sku_uidx
    on public.part_catalog (btrim(manufacturer), btrim(sku))
    where team_id is null
      and is_official
      and sku is not null;
end
$migration$;
