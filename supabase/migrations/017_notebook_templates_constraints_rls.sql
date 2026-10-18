-- Notebook templates: foreign keys, checks, indexes, row level security, and RPCs.

begin;

alter table public.notebook_templates drop constraint if exists notebook_templates_team_id_fkey;
alter table public.notebook_templates
  add constraint notebook_templates_team_id_fkey
  foreign key (team_id) references public.teams (id) on delete cascade;

alter table public.notebook_templates drop constraint if exists notebook_templates_created_by_fkey;
alter table public.notebook_templates
  add constraint notebook_templates_created_by_fkey
  foreign key (created_by) references public.profiles (id);

alter table public.notebook_template_tabs drop constraint if exists notebook_template_tabs_template_id_fkey;
alter table public.notebook_template_tabs
  add constraint notebook_template_tabs_template_id_fkey
  foreign key (template_id) references public.notebook_templates (id) on delete cascade;

alter table public.notebook_template_sections drop constraint if exists notebook_template_sections_tab_id_fkey;
alter table public.notebook_template_sections
  add constraint notebook_template_sections_tab_id_fkey
  foreign key (tab_id) references public.notebook_template_tabs (id) on delete cascade;

alter table public.notebooks drop constraint if exists notebooks_team_id_fkey;
alter table public.notebooks
  add constraint notebooks_team_id_fkey
  foreign key (team_id) references public.teams (id) on delete cascade;

alter table public.notebooks drop constraint if exists notebooks_template_id_fkey;
alter table public.notebooks
  add constraint notebooks_template_id_fkey
  foreign key (template_id) references public.notebook_templates (id) on delete set null;

alter table public.notebooks drop constraint if exists notebooks_generated_by_fkey;
alter table public.notebooks
  add constraint notebooks_generated_by_fkey
  foreign key (generated_by) references public.profiles (id);

alter table public.notebook_sections drop constraint if exists notebook_sections_notebook_id_fkey;
alter table public.notebook_sections
  add constraint notebook_sections_notebook_id_fkey
  foreign key (notebook_id) references public.notebooks (id) on delete cascade;

alter table public.notebook_sections drop constraint if exists notebook_sections_edited_by_fkey;
alter table public.notebook_sections
  add constraint notebook_sections_edited_by_fkey
  foreign key (edited_by) references public.profiles (id);

alter table public.teams drop constraint if exists teams_ai_provider_check;
alter table public.teams
  add constraint teams_ai_provider_check
  check (ai_provider is null or ai_provider in ('deepseek', 'moonshot'));

alter table public.teams drop constraint if exists teams_ai_model_len;
alter table public.teams
  add constraint teams_ai_model_len
  check (ai_model is null or char_length(ai_model) <= 80);

alter table public.notebooks drop constraint if exists notebooks_status_check;
alter table public.notebooks
  add constraint notebooks_status_check
  check (status in ('draft', 'curated', 'failed'));

alter table public.notebook_templates drop constraint if exists notebook_templates_name_len;
alter table public.notebook_templates
  add constraint notebook_templates_name_len check (char_length(name) between 1 and 120);

alter table public.notebook_template_tabs drop constraint if exists notebook_template_tabs_name_len;
alter table public.notebook_template_tabs
  add constraint notebook_template_tabs_name_len check (char_length(name) between 1 and 80);

alter table public.notebook_template_sections drop constraint if exists notebook_template_sections_name_len;
alter table public.notebook_template_sections
  add constraint notebook_template_sections_name_len check (char_length(name) between 1 and 80);

alter table public.notebook_template_sections drop constraint if exists notebook_template_sections_hint_len;
alter table public.notebook_template_sections
  add constraint notebook_template_sections_hint_len
  check (prompt_hint is null or char_length(prompt_hint) <= 1000);

alter table public.notebooks drop constraint if exists notebooks_team_date_unique;
alter table public.notebooks
  add constraint notebooks_team_date_unique unique (team_id, notebook_date);

alter table public.notebook_template_tabs drop constraint if exists notebook_template_tabs_position_unique;
alter table public.notebook_template_tabs
  add constraint notebook_template_tabs_position_unique
  unique (template_id, position) deferrable initially immediate;

alter table public.notebook_template_sections drop constraint if exists notebook_template_sections_position_unique;
alter table public.notebook_template_sections
  add constraint notebook_template_sections_position_unique
  unique (tab_id, position) deferrable initially immediate;

create unique index if not exists notebook_templates_one_team_default
  on public.notebook_templates (team_id)
  where team_id is not null and is_default;

create unique index if not exists notebook_templates_one_global_default
  on public.notebook_templates ((is_default))
  where team_id is null and is_default;

create index if not exists notebook_template_tabs_template_position_idx
  on public.notebook_template_tabs (template_id, position);

create index if not exists notebook_template_sections_tab_position_idx
  on public.notebook_template_sections (tab_id, position);

create index if not exists notebooks_team_date_idx
  on public.notebooks (team_id, notebook_date desc);

create index if not exists notebook_sections_order_idx
  on public.notebook_sections (notebook_id, tab_position, section_position);

alter table public.notebook_templates enable row level security;
alter table public.notebook_template_tabs enable row level security;
alter table public.notebook_template_sections enable row level security;
alter table public.notebooks enable row level security;
alter table public.notebook_sections enable row level security;

revoke all on table public.notebook_templates, public.notebook_template_tabs,
  public.notebook_template_sections, public.notebooks, public.notebook_sections
  from anon, authenticated;

grant select, insert, update, delete on table public.notebook_templates to authenticated;
grant select, insert, update, delete on table public.notebook_template_tabs to authenticated;
grant select, insert, update, delete on table public.notebook_template_sections to authenticated;
grant select, insert, update, delete on table public.notebooks to authenticated;
grant select, insert, update, delete on table public.notebook_sections to authenticated;

drop policy if exists notebook_templates_select on public.notebook_templates;
create policy notebook_templates_select
  on public.notebook_templates for select to authenticated
  using (team_id is null or private.is_team_member(team_id));

drop policy if exists notebook_templates_insert_admin on public.notebook_templates;
create policy notebook_templates_insert_admin
  on public.notebook_templates for insert to authenticated
  with check (team_id is not null and private.can_manage_team_roles(team_id));

drop policy if exists notebook_templates_update_admin on public.notebook_templates;
create policy notebook_templates_update_admin
  on public.notebook_templates for update to authenticated
  using (team_id is not null and private.can_manage_team_roles(team_id))
  with check (team_id is not null and private.can_manage_team_roles(team_id));

drop policy if exists notebook_templates_delete_admin on public.notebook_templates;
create policy notebook_templates_delete_admin
  on public.notebook_templates for delete to authenticated
  using (team_id is not null and private.can_manage_team_roles(team_id));

drop policy if exists notebook_template_tabs_select on public.notebook_template_tabs;
create policy notebook_template_tabs_select
  on public.notebook_template_tabs for select to authenticated
  using (
    exists (
      select 1
      from public.notebook_templates as template
      where template.id = template_id
        and (template.team_id is null or private.is_team_member(template.team_id))
    )
  );

drop policy if exists notebook_template_tabs_write_admin on public.notebook_template_tabs;
create policy notebook_template_tabs_write_admin
  on public.notebook_template_tabs for all to authenticated
  using (
    exists (
      select 1
      from public.notebook_templates as template
      where template.id = template_id
        and template.team_id is not null
        and private.can_manage_team_roles(template.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.notebook_templates as template
      where template.id = template_id
        and template.team_id is not null
        and private.can_manage_team_roles(template.team_id)
    )
  );

drop policy if exists notebook_template_sections_select on public.notebook_template_sections;
create policy notebook_template_sections_select
  on public.notebook_template_sections for select to authenticated
  using (
    exists (
      select 1
      from public.notebook_template_tabs as tab
      join public.notebook_templates as template on template.id = tab.template_id
      where tab.id = tab_id
        and (template.team_id is null or private.is_team_member(template.team_id))
    )
  );

drop policy if exists notebook_template_sections_write_admin on public.notebook_template_sections;
create policy notebook_template_sections_write_admin
  on public.notebook_template_sections for all to authenticated
  using (
    exists (
      select 1
      from public.notebook_template_tabs as tab
      join public.notebook_templates as template on template.id = tab.template_id
      where tab.id = tab_id
        and template.team_id is not null
        and private.can_manage_team_roles(template.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.notebook_template_tabs as tab
      join public.notebook_templates as template on template.id = tab.template_id
      where tab.id = tab_id
        and template.team_id is not null
        and private.can_manage_team_roles(template.team_id)
    )
  );

drop policy if exists notebooks_select_members on public.notebooks;
create policy notebooks_select_members
  on public.notebooks for select to authenticated
  using (private.is_team_member(team_id));

drop policy if exists notebooks_insert_members on public.notebooks;
create policy notebooks_insert_members
  on public.notebooks for insert to authenticated
  with check (private.is_team_member(team_id));

drop policy if exists notebooks_update_members on public.notebooks;
create policy notebooks_update_members
  on public.notebooks for update to authenticated
  using (private.is_team_member(team_id))
  with check (private.is_team_member(team_id));

drop policy if exists notebooks_delete_admin on public.notebooks;
create policy notebooks_delete_admin
  on public.notebooks for delete to authenticated
  using (private.can_manage_team_roles(team_id));

drop policy if exists notebook_sections_select_members on public.notebook_sections;
create policy notebook_sections_select_members
  on public.notebook_sections for select to authenticated
  using (
    exists (
      select 1
      from public.notebooks as notebook
      where notebook.id = notebook_id
        and private.is_team_member(notebook.team_id)
    )
  );

drop policy if exists notebook_sections_insert_members on public.notebook_sections;
create policy notebook_sections_insert_members
  on public.notebook_sections for insert to authenticated
  with check (
    exists (
      select 1
      from public.notebooks as notebook
      where notebook.id = notebook_id
        and private.is_team_member(notebook.team_id)
    )
  );

drop policy if exists notebook_sections_update_members on public.notebook_sections;
create policy notebook_sections_update_members
  on public.notebook_sections for update to authenticated
  using (
    exists (
      select 1
      from public.notebooks as notebook
      where notebook.id = notebook_id
        and private.is_team_member(notebook.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.notebooks as notebook
      where notebook.id = notebook_id
        and private.is_team_member(notebook.team_id)
    )
  );

drop policy if exists notebook_sections_delete_admin on public.notebook_sections;
create policy notebook_sections_delete_admin
  on public.notebook_sections for delete to authenticated
  using (
    exists (
      select 1
      from public.notebooks as notebook
      where notebook.id = notebook_id
        and private.can_manage_team_roles(notebook.team_id)
    )
  );

create or replace function public.clone_notebook_template(
  p_template_id uuid,
  p_team_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.notebook_templates;
  v_new_id uuid;
  v_tab public.notebook_template_tabs;
  v_new_tab uuid;
  v_section public.notebook_template_sections;
begin
  if not private.can_manage_team_roles(p_team_id) then
    raise exception 'Only a team admin can fork a notebook template';
  end if;

  select * into v_source
  from public.notebook_templates
  where id = p_template_id;

  if not found then
    raise exception 'Template not found';
  end if;

  if v_source.team_id is not null and v_source.team_id <> p_team_id then
    raise exception 'That template belongs to another team';
  end if;

  update public.notebook_templates
  set is_default = false,
      updated_at = now()
  where team_id = p_team_id
    and is_default;

  insert into public.notebook_templates (
    team_id, name, description, is_default, created_by
  )
  values (
    p_team_id, v_source.name, v_source.description, true, auth.uid()
  )
  returning id into v_new_id;

  for v_tab in
    select *
    from public.notebook_template_tabs
    where template_id = p_template_id
    order by position
  loop
    insert into public.notebook_template_tabs (template_id, name, position)
    values (v_new_id, v_tab.name, v_tab.position)
    returning id into v_new_tab;

    for v_section in
      select *
      from public.notebook_template_sections
      where tab_id = v_tab.id
      order by position
    loop
      insert into public.notebook_template_sections (tab_id, name, position, prompt_hint)
      values (v_new_tab, v_section.name, v_section.position, v_section.prompt_hint);
    end loop;
  end loop;

  return v_new_id;
end;
$$;

create or replace function public.apply_template_to_notebook(p_notebook_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notebook public.notebooks;
  v_tab public.notebook_template_tabs;
  v_section public.notebook_template_sections;
begin
  select * into v_notebook
  from public.notebooks
  where id = p_notebook_id;

  if not found then
    raise exception 'Notebook not found';
  end if;

  if not private.is_team_member(v_notebook.team_id) then
    raise exception 'Not a member of this team';
  end if;

  if exists (
    select 1 from public.notebook_sections where notebook_id = p_notebook_id
  ) then
    return;
  end if;

  if v_notebook.template_id is null then
    return;
  end if;

  for v_tab in
    select *
    from public.notebook_template_tabs
    where template_id = v_notebook.template_id
    order by position
  loop
    for v_section in
      select *
      from public.notebook_template_sections
      where tab_id = v_tab.id
      order by position
    loop
      insert into public.notebook_sections (
        notebook_id,
        tab_name,
        tab_position,
        section_name,
        section_position,
        content
      )
      values (
        p_notebook_id,
        v_tab.name,
        v_tab.position,
        v_section.name,
        v_section.position,
        ''
      );
    end loop;
  end loop;
end;
$$;

create or replace function public.import_notebook_template(
  p_team_id uuid,
  p_payload jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_description text;
  v_tabs jsonb;
  v_tab jsonb;
  v_sections jsonb;
  v_section jsonb;
  v_tab_index integer := 0;
  v_section_index integer := 0;
  v_new_id uuid;
  v_tab_id uuid;
  v_make_default boolean;
  v_tab_name text;
  v_section_name text;
begin
  if not private.can_manage_team_roles(p_team_id) then
    raise exception 'Only a team admin can import a notebook template';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Template JSON must be an object with a name and tabs';
  end if;

  if p_payload ? 'schemaVersion' and (p_payload->>'schemaVersion')::integer is distinct from 1 then
    raise exception 'Unsupported template schema version';
  end if;

  v_name := btrim(coalesce(p_payload->>'name', ''));
  v_description := nullif(btrim(coalesce(p_payload->>'description', '')), '');
  v_tabs := p_payload->'tabs';

  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception 'Template name must be between 1 and 120 characters';
  end if;

  if v_tabs is null or jsonb_typeof(v_tabs) <> 'array' then
    raise exception 'Template JSON must include a tabs array';
  end if;

  if jsonb_array_length(v_tabs) > 8 then
    raise exception 'A template can have at most 8 tabs';
  end if;

  for v_tab in select value from jsonb_array_elements(v_tabs)
  loop
    if jsonb_typeof(v_tab) <> 'object' then
      raise exception 'Each tab must be an object with a name and sections';
    end if;
    v_tab_name := btrim(coalesce(v_tab->>'name', ''));
    if char_length(v_tab_name) < 1 or char_length(v_tab_name) > 80 then
      raise exception 'Each tab name must be between 1 and 80 characters';
    end if;
    v_sections := v_tab->'sections';
    if v_sections is null or jsonb_typeof(v_sections) <> 'array' then
      raise exception 'Each tab must include a sections array';
    end if;
    if jsonb_array_length(v_sections) > 12 then
      raise exception 'A tab can have at most 12 sections';
    end if;
    for v_section in select value from jsonb_array_elements(v_sections)
    loop
      v_section_name := btrim(coalesce(v_section->>'name', ''));
      if char_length(v_section_name) < 1 or char_length(v_section_name) > 80 then
        raise exception 'Each section name must be between 1 and 80 characters';
      end if;
      if v_section ? 'promptHint'
        and v_section->>'promptHint' is not null
        and char_length(v_section->>'promptHint') > 1000 then
        raise exception 'A section prompt hint must be 1000 characters or fewer';
      end if;
    end loop;
  end loop;

  select not exists (
    select 1
    from public.notebook_templates
    where team_id = p_team_id
      and is_default
  ) into v_make_default;

  insert into public.notebook_templates (
    team_id, name, description, is_default, created_by
  )
  values (p_team_id, v_name, v_description, v_make_default, auth.uid())
  returning id into v_new_id;

  for v_tab in select value from jsonb_array_elements(v_tabs)
  loop
    v_tab_name := btrim(v_tab->>'name');
    insert into public.notebook_template_tabs (template_id, name, position)
    values (v_new_id, v_tab_name, v_tab_index)
    returning id into v_tab_id;
    v_tab_index := v_tab_index + 1;
    v_section_index := 0;
    for v_section in select value from jsonb_array_elements(v_tab->'sections')
    loop
      insert into public.notebook_template_sections (tab_id, name, position, prompt_hint)
      values (
        v_tab_id,
        btrim(v_section->>'name'),
        v_section_index,
        nullif(btrim(coalesce(v_section->>'promptHint', '')), '')
      );
      v_section_index := v_section_index + 1;
    end loop;
  end loop;

  return v_new_id;
end;
$$;

create or replace function public.set_active_notebook_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
begin
  select team_id into v_team_id
  from public.notebook_templates
  where id = p_template_id;

  if v_team_id is null then
    raise exception 'The shared default template cannot be selected as a team template';
  end if;

  if not private.can_manage_team_roles(v_team_id) then
    raise exception 'Only a team admin can choose the active template';
  end if;

  update public.notebook_templates
  set is_default = false,
      updated_at = now()
  where team_id = v_team_id
    and is_default
    and id <> p_template_id;

  update public.notebook_templates
  set is_default = true,
      updated_at = now()
  where id = p_template_id;
end;
$$;

create or replace function public.reorder_notebook_template_tabs(
  p_template_id uuid,
  p_tab_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
  v_index integer := 0;
  v_tab_id uuid;
begin
  select team_id into v_team_id
  from public.notebook_templates
  where id = p_template_id;

  if v_team_id is null or not private.can_manage_team_roles(v_team_id) then
    raise exception 'Only a team admin can reorder template tabs';
  end if;

  if coalesce(array_length(p_tab_ids, 1), 0) <> (
    select count(*) from public.notebook_template_tabs where template_id = p_template_id
  ) then
    raise exception 'Reorder must include every tab';
  end if;

  set constraints notebook_template_tabs_position_unique deferred;

  foreach v_tab_id in array p_tab_ids
  loop
    update public.notebook_template_tabs
    set position = v_index
    where id = v_tab_id
      and template_id = p_template_id;
    v_index := v_index + 1;
  end loop;

  update public.notebook_templates
  set updated_at = now()
  where id = p_template_id;
end;
$$;

create or replace function public.reorder_notebook_template_sections(
  p_tab_id uuid,
  p_section_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id uuid;
  v_index integer := 0;
  v_section_id uuid;
begin
  select template.team_id into v_team_id
  from public.notebook_template_tabs as tab
  join public.notebook_templates as template on template.id = tab.template_id
  where tab.id = p_tab_id;

  if v_team_id is null or not private.can_manage_team_roles(v_team_id) then
    raise exception 'Only a team admin can reorder template sections';
  end if;

  if coalesce(array_length(p_section_ids, 1), 0) <> (
    select count(*) from public.notebook_template_sections where tab_id = p_tab_id
  ) then
    raise exception 'Reorder must include every section';
  end if;

  set constraints notebook_template_sections_position_unique deferred;

  foreach v_section_id in array p_section_ids
  loop
    update public.notebook_template_sections
    set position = v_index
    where id = v_section_id
      and tab_id = p_tab_id;
    v_index := v_index + 1;
  end loop;
end;
$$;

create or replace function public.set_team_notebook_ai(
  p_team_id uuid,
  p_provider text,
  p_model text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_manage_team_roles(p_team_id) then
    raise exception 'Only a team admin can choose the notebook provider';
  end if;

  if p_provider is not null and p_provider not in ('deepseek', 'moonshot') then
    raise exception 'Provider must be deepseek or moonshot';
  end if;

  if p_model is not null and char_length(btrim(p_model)) > 80 then
    raise exception 'Model name must be 80 characters or fewer';
  end if;

  update public.teams
  set ai_provider = p_provider,
      ai_model = nullif(btrim(coalesce(p_model, '')), ''),
      updated_at = now()
  where id = p_team_id;
end;
$$;

revoke all on function public.clone_notebook_template(uuid, uuid) from public, anon;
revoke all on function public.apply_template_to_notebook(uuid) from public, anon;
revoke all on function public.import_notebook_template(uuid, jsonb) from public, anon;
revoke all on function public.set_active_notebook_template(uuid) from public, anon;
revoke all on function public.reorder_notebook_template_tabs(uuid, uuid[]) from public, anon;
revoke all on function public.reorder_notebook_template_sections(uuid, uuid[]) from public, anon;
revoke all on function public.set_team_notebook_ai(uuid, text, text) from public, anon;

grant execute on function public.clone_notebook_template(uuid, uuid) to authenticated;
grant execute on function public.apply_template_to_notebook(uuid) to authenticated;
grant execute on function public.import_notebook_template(uuid, jsonb) to authenticated;
grant execute on function public.set_active_notebook_template(uuid) to authenticated;
grant execute on function public.reorder_notebook_template_tabs(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_notebook_template_sections(uuid, uuid[]) to authenticated;
grant execute on function public.set_team_notebook_ai(uuid, text, text) to authenticated;

commit;
