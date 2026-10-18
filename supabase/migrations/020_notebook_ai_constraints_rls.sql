-- Curation runs: foreign keys, checks, indexes, row level security, and the commit RPC.

begin;

alter table public.notebook_runs drop constraint if exists notebook_runs_notebook_id_fkey;
alter table public.notebook_runs
  add constraint notebook_runs_notebook_id_fkey
  foreign key (notebook_id) references public.notebooks (id) on delete cascade;

alter table public.notebook_runs drop constraint if exists notebook_runs_team_id_fkey;
alter table public.notebook_runs
  add constraint notebook_runs_team_id_fkey
  foreign key (team_id) references public.teams (id) on delete cascade;

alter table public.notebook_runs drop constraint if exists notebook_runs_requested_by_fkey;
alter table public.notebook_runs
  add constraint notebook_runs_requested_by_fkey
  foreign key (requested_by) references public.profiles (id);

alter table public.notebook_run_events drop constraint if exists notebook_run_events_run_id_fkey;
alter table public.notebook_run_events
  add constraint notebook_run_events_run_id_fkey
  foreign key (run_id) references public.notebook_runs (id) on delete cascade;

alter table public.notebook_section_refs drop constraint if exists notebook_section_refs_section_id_fkey;
alter table public.notebook_section_refs
  add constraint notebook_section_refs_section_id_fkey
  foreign key (section_id) references public.notebook_sections (id) on delete cascade;

alter table public.notebook_section_refs drop constraint if exists notebook_section_refs_note_id_fkey;
alter table public.notebook_section_refs
  add constraint notebook_section_refs_note_id_fkey
  foreign key (note_id) references public.eng_notes (id) on delete cascade;

alter table public.notebook_section_refs drop constraint if exists notebook_section_refs_task_id_fkey;
alter table public.notebook_section_refs
  add constraint notebook_section_refs_task_id_fkey
  foreign key (task_id) references public.tasks (id) on delete cascade;

alter table public.notebook_section_refs drop constraint if exists notebook_section_refs_image_id_fkey;
alter table public.notebook_section_refs
  add constraint notebook_section_refs_image_id_fkey
  foreign key (image_id) references public.eng_note_images (id) on delete cascade;

alter table public.notebook_runs drop constraint if exists notebook_runs_status_check;
alter table public.notebook_runs
  add constraint notebook_runs_status_check
  check (status in ('running', 'succeeded', 'failed'));

alter table public.notebook_run_events drop constraint if exists notebook_run_events_level_check;
alter table public.notebook_run_events
  add constraint notebook_run_events_level_check
  check (level in ('info', 'warn', 'error'));

alter table public.notebook_section_refs drop constraint if exists notebook_section_refs_kind_check;
alter table public.notebook_section_refs
  add constraint notebook_section_refs_kind_check
  check (
    (
      kind = 'note'
      and note_id is not null
      and task_id is null
      and image_id is null
    )
    or (
      kind = 'task'
      and task_id is not null
      and note_id is null
      and image_id is null
    )
    or (
      kind = 'image'
      and image_id is not null
      and note_id is null
      and task_id is null
    )
  );

create unique index if not exists notebook_section_refs_dedupe
  on public.notebook_section_refs (section_id, kind, (coalesce(note_id, task_id, image_id)));

create index if not exists notebook_runs_notebook_started_idx
  on public.notebook_runs (notebook_id, started_at desc);

create index if not exists notebook_section_refs_section_idx
  on public.notebook_section_refs (section_id);

create index if not exists notebook_section_refs_note_idx
  on public.notebook_section_refs (note_id);

alter table public.notebook_runs enable row level security;
alter table public.notebook_run_events enable row level security;
alter table public.notebook_section_refs enable row level security;

revoke all on table public.notebook_runs, public.notebook_run_events, public.notebook_section_refs
  from anon, authenticated;

grant select, insert, update, delete on table public.notebook_runs to authenticated;
grant select, insert, update, delete on table public.notebook_run_events to authenticated;
grant select, insert, update, delete on table public.notebook_section_refs to authenticated;

drop policy if exists notebook_runs_select_members on public.notebook_runs;
create policy notebook_runs_select_members
  on public.notebook_runs for select to authenticated
  using (private.is_team_member(team_id));

drop policy if exists notebook_runs_insert_members on public.notebook_runs;
create policy notebook_runs_insert_members
  on public.notebook_runs for insert to authenticated
  with check (
    private.is_team_member(team_id)
    and requested_by = (select auth.uid())
  );

drop policy if exists notebook_runs_update_requester on public.notebook_runs;
create policy notebook_runs_update_requester
  on public.notebook_runs for update to authenticated
  using (
    private.is_team_member(team_id)
    and requested_by = (select auth.uid())
  )
  with check (
    private.is_team_member(team_id)
    and requested_by = (select auth.uid())
  );

drop policy if exists notebook_run_events_select_members on public.notebook_run_events;
create policy notebook_run_events_select_members
  on public.notebook_run_events for select to authenticated
  using (
    exists (
      select 1
      from public.notebook_runs as run
      where run.id = run_id
        and private.is_team_member(run.team_id)
    )
  );

drop policy if exists notebook_run_events_insert_requester on public.notebook_run_events;
create policy notebook_run_events_insert_requester
  on public.notebook_run_events for insert to authenticated
  with check (
    exists (
      select 1
      from public.notebook_runs as run
      where run.id = run_id
        and private.is_team_member(run.team_id)
        and run.requested_by = (select auth.uid())
    )
  );

drop policy if exists notebook_section_refs_select_members on public.notebook_section_refs;
create policy notebook_section_refs_select_members
  on public.notebook_section_refs for select to authenticated
  using (
    exists (
      select 1
      from public.notebook_sections as section
      join public.notebooks as notebook on notebook.id = section.notebook_id
      where section.id = section_id
        and private.is_team_member(notebook.team_id)
    )
  );

drop policy if exists notebook_section_refs_write_members on public.notebook_section_refs;
create policy notebook_section_refs_write_members
  on public.notebook_section_refs for all to authenticated
  using (
    exists (
      select 1
      from public.notebook_sections as section
      join public.notebooks as notebook on notebook.id = section.notebook_id
      where section.id = section_id
        and private.is_team_member(notebook.team_id)
    )
  )
  with check (
    exists (
      select 1
      from public.notebook_sections as section
      join public.notebooks as notebook on notebook.id = section.notebook_id
      where section.id = section_id
        and private.is_team_member(notebook.team_id)
    )
  );

create or replace function private.notebook_curation_cooldown_seconds()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 120;
$$;

create or replace function public.notebook_curation_cooldown_seconds()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select private.notebook_curation_cooldown_seconds();
$$;

create or replace function private.notebook_seconds_since_success(p_notebook_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select floor(extract(epoch from (now() - max(run.finished_at))))::integer
  from public.notebook_runs as run
  where run.notebook_id = p_notebook_id
    and run.status = 'succeeded'
    and run.finished_at is not null;
$$;

create or replace function public.notebook_seconds_since_success(p_notebook_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.notebooks as notebook
    where notebook.id = p_notebook_id
      and private.is_team_member(notebook.team_id)
  ) then
    raise exception 'Notebook not found';
  end if;

  return private.notebook_seconds_since_success(p_notebook_id);
end;
$$;

create or replace function public.commit_notebook_curation(
  p_run_id uuid,
  p_sections jsonb,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_note_count integer,
  p_source_max_updated_at timestamptz,
  p_provider text,
  p_model text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.notebook_runs;
  v_notebook public.notebooks;
  v_section jsonb;
  v_section_id uuid;
  v_content text;
  v_ref jsonb;
  v_kind text;
  v_note_id uuid;
  v_task_id uuid;
  v_image_id uuid;
begin
  if p_sections is null or jsonb_typeof(p_sections) <> 'array' then
    raise exception 'Curation payload must be a list of sections';
  end if;

  select * into v_run from public.notebook_runs where id = p_run_id;
  if not found then
    raise exception 'Curation run not found';
  end if;

  if v_run.requested_by is distinct from auth.uid() then
    raise exception 'Only the person who started this run can save it';
  end if;

  if not private.is_team_member(v_run.team_id) then
    raise exception 'Not a member of this team';
  end if;

  select * into v_notebook from public.notebooks where id = v_run.notebook_id;
  if not found or v_notebook.team_id <> v_run.team_id then
    raise exception 'Notebook not found';
  end if;

  for v_section in select value from jsonb_array_elements(p_sections)
  loop
    v_section_id := (v_section->>'id')::uuid;
    if not exists (
      select 1
      from public.notebook_sections as section
      where section.id = v_section_id
        and section.notebook_id = v_notebook.id
    ) then
      raise exception 'A section in the curation result does not belong to this notebook';
    end if;

    if v_section ? 'refs' and jsonb_typeof(v_section->'refs') = 'array' then
      for v_ref in select value from jsonb_array_elements(v_section->'refs')
      loop
        v_kind := v_ref->>'kind';
        v_note_id := nullif(v_ref->>'note_id', '')::uuid;
        v_task_id := nullif(v_ref->>'task_id', '')::uuid;
        v_image_id := nullif(v_ref->>'image_id', '')::uuid;

        if v_kind = 'note' then
          if not exists (
            select 1
            from public.eng_notes as note
            where note.id = v_note_id
              and note.team_id = v_notebook.team_id
              and note.note_date = v_notebook.notebook_date
          ) then
            raise exception 'A note citation is outside this notebook day';
          end if;
        elsif v_kind = 'image' then
          if not exists (
            select 1
            from public.eng_note_images as image
            join public.eng_notes as note on note.id = image.note_id
            where image.id = v_image_id
              and note.team_id = v_notebook.team_id
              and note.note_date = v_notebook.notebook_date
          ) then
            raise exception 'An image citation is outside this notebook day';
          end if;
        elsif v_kind = 'task' then
          if not exists (
            select 1
            from public.tasks as task
            where task.id = v_task_id
              and task.team_id = v_notebook.team_id
              and task.is_personal = false
          ) then
            raise exception 'A task citation is outside this team';
          end if;
        else
          raise exception 'Unknown citation kind';
        end if;
      end loop;
    end if;
  end loop;

  for v_section in select value from jsonb_array_elements(p_sections)
  loop
    v_section_id := (v_section->>'id')::uuid;
    v_content := coalesce(v_section->>'content', '');

    update public.notebook_sections
    set content = v_content,
        is_user_edited = false,
        edited_by = null,
        edited_at = null
    where id = v_section_id;

    delete from public.notebook_section_refs where section_id = v_section_id;

    if v_section ? 'refs' and jsonb_typeof(v_section->'refs') = 'array' then
      for v_ref in select value from jsonb_array_elements(v_section->'refs')
      loop
        v_kind := v_ref->>'kind';
        v_note_id := nullif(v_ref->>'note_id', '')::uuid;
        v_task_id := nullif(v_ref->>'task_id', '')::uuid;
        v_image_id := nullif(v_ref->>'image_id', '')::uuid;

        insert into public.notebook_section_refs (section_id, kind, note_id, task_id, image_id)
        select
          v_section_id,
          v_kind,
          case when v_kind = 'note' then v_note_id else null end,
          case when v_kind = 'task' then v_task_id else null end,
          case when v_kind = 'image' then v_image_id else null end
        where not exists (
          select 1
          from public.notebook_section_refs as existing
          where existing.section_id = v_section_id
            and existing.kind = v_kind
            and coalesce(existing.note_id, existing.task_id, existing.image_id)
              = coalesce(v_note_id, v_task_id, v_image_id)
        );
      end loop;
    end if;
  end loop;

  update public.notebooks
  set status = 'curated',
      generated_at = now(),
      generated_by = auth.uid(),
      provider = p_provider,
      model = p_model,
      source_note_count = coalesce(p_note_count, 0),
      source_max_updated_at = p_source_max_updated_at,
      updated_at = now()
  where id = v_notebook.id;

  update public.notebook_runs
  set status = 'succeeded',
      finished_at = now(),
      error = null,
      note_count = p_note_count,
      prompt_tokens = p_prompt_tokens,
      completion_tokens = p_completion_tokens,
      provider = p_provider,
      model = p_model
  where id = p_run_id;
end;
$$;

revoke all on function private.notebook_curation_cooldown_seconds() from public, anon, authenticated;
grant execute on function private.notebook_curation_cooldown_seconds() to authenticated;

revoke all on function private.notebook_seconds_since_success(uuid) from public, anon, authenticated;

revoke all on function public.notebook_curation_cooldown_seconds() from public, anon;
revoke all on function public.notebook_seconds_since_success(uuid) from public, anon;
revoke all on function public.commit_notebook_curation(uuid, jsonb, integer, integer, integer, timestamptz, text, text) from public, anon;

grant execute on function public.notebook_curation_cooldown_seconds() to authenticated;
grant execute on function public.notebook_seconds_since_success(uuid) to authenticated;
grant execute on function public.commit_notebook_curation(uuid, jsonb, integer, integer, integer, timestamptz, text, text) to authenticated;

commit;
