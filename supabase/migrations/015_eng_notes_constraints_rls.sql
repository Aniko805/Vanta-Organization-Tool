-- Engineering notes: foreign keys, checks, indexes, grants, and row level security.

begin;

alter table public.eng_notes drop constraint if exists eng_notes_team_id_fkey;
alter table public.eng_notes
  add constraint eng_notes_team_id_fkey
  foreign key (team_id) references public.teams (id) on delete cascade;

alter table public.eng_notes drop constraint if exists eng_notes_author_id_fkey;
alter table public.eng_notes
  add constraint eng_notes_author_id_fkey
  foreign key (author_id) references public.profiles (id);

alter table public.eng_notes drop constraint if exists eng_notes_task_id_fkey;
alter table public.eng_notes
  add constraint eng_notes_task_id_fkey
  foreign key (task_id) references public.tasks (id) on delete set null;

alter table public.eng_note_images drop constraint if exists eng_note_images_note_id_fkey;
alter table public.eng_note_images
  add constraint eng_note_images_note_id_fkey
  foreign key (note_id) references public.eng_notes (id) on delete cascade;

alter table public.eng_note_images drop constraint if exists eng_note_images_team_id_fkey;
alter table public.eng_note_images
  add constraint eng_note_images_team_id_fkey
  foreign key (team_id) references public.teams (id) on delete cascade;

alter table public.eng_note_images drop constraint if exists eng_note_images_created_by_fkey;
alter table public.eng_note_images
  add constraint eng_note_images_created_by_fkey
  foreign key (created_by) references public.profiles (id);

alter table public.eng_notes drop constraint if exists eng_notes_body_len;
alter table public.eng_notes
  add constraint eng_notes_body_len check (char_length(body) <= 16000);

alter table public.eng_notes drop constraint if exists eng_notes_title_len;
alter table public.eng_notes
  add constraint eng_notes_title_len check (title is null or char_length(title) <= 200);

alter table public.eng_notes drop constraint if exists eng_notes_subteam_len;
alter table public.eng_notes
  add constraint eng_notes_subteam_len check (subteam is null or char_length(subteam) <= 80);

alter table public.eng_note_images drop constraint if exists eng_note_images_byte_size_positive;
alter table public.eng_note_images
  add constraint eng_note_images_byte_size_positive check (byte_size > 0);

alter table public.eng_note_images drop constraint if exists eng_note_images_position_nonnegative;
alter table public.eng_note_images
  add constraint eng_note_images_position_nonnegative check (position >= 0);

alter table public.eng_note_images drop constraint if exists eng_note_images_mime_allowlist;
alter table public.eng_note_images
  add constraint eng_note_images_mime_allowlist check (
    mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/heic')
  );

alter table public.eng_note_images drop constraint if exists eng_note_images_caption_len;
alter table public.eng_note_images
  add constraint eng_note_images_caption_len check (caption is null or char_length(caption) <= 500);

create unique index if not exists eng_note_images_storage_path_key
  on public.eng_note_images (storage_path);

create index if not exists eng_notes_team_date_idx
  on public.eng_notes (team_id, note_date desc, created_at desc);

create index if not exists eng_notes_team_updated_idx
  on public.eng_notes (team_id, updated_at);

create index if not exists eng_note_images_note_position_idx
  on public.eng_note_images (note_id, position);

create or replace function public.touch_eng_note_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists eng_notes_touch_updated_at on public.eng_notes;
create trigger eng_notes_touch_updated_at
  before update on public.eng_notes
  for each row
  execute function public.touch_eng_note_updated_at();

alter table public.eng_notes enable row level security;
alter table public.eng_note_images enable row level security;

revoke all on table public.eng_notes, public.eng_note_images from anon, authenticated;
grant select, insert, update, delete on table public.eng_notes to authenticated;
grant select, insert, update, delete on table public.eng_note_images to authenticated;

grant execute on function private.can_manage_team_roles(uuid) to authenticated;

drop policy if exists eng_notes_select_members on public.eng_notes;
create policy eng_notes_select_members
  on public.eng_notes for select to authenticated
  using (private.is_team_member(team_id));

drop policy if exists eng_notes_insert_members on public.eng_notes;
create policy eng_notes_insert_members
  on public.eng_notes for insert to authenticated
  with check (
    private.is_team_member(team_id)
    and author_id = (select auth.uid())
  );

drop policy if exists eng_notes_update_author_or_admin on public.eng_notes;
create policy eng_notes_update_author_or_admin
  on public.eng_notes for update to authenticated
  using (
    private.is_team_member(team_id)
    and (
      author_id = (select auth.uid())
      or private.can_manage_team_roles(team_id)
    )
  )
  with check (
    private.is_team_member(team_id)
    and (
      author_id = (select auth.uid())
      or private.can_manage_team_roles(team_id)
    )
  );

drop policy if exists eng_notes_delete_author_or_admin on public.eng_notes;
create policy eng_notes_delete_author_or_admin
  on public.eng_notes for delete to authenticated
  using (
    private.is_team_member(team_id)
    and (
      author_id = (select auth.uid())
      or private.can_manage_team_roles(team_id)
    )
  );

drop policy if exists eng_note_images_select_members on public.eng_note_images;
create policy eng_note_images_select_members
  on public.eng_note_images for select to authenticated
  using (private.is_team_member(team_id));

drop policy if exists eng_note_images_insert_members on public.eng_note_images;
create policy eng_note_images_insert_members
  on public.eng_note_images for insert to authenticated
  with check (
    private.is_team_member(team_id)
    and created_by = (select auth.uid())
    and exists (
      select 1
      from public.eng_notes as note
      where note.id = note_id
        and note.team_id = team_id
    )
  );

drop policy if exists eng_note_images_update_author_or_admin on public.eng_note_images;
create policy eng_note_images_update_author_or_admin
  on public.eng_note_images for update to authenticated
  using (
    private.is_team_member(team_id)
    and (
      created_by = (select auth.uid())
      or private.can_manage_team_roles(team_id)
    )
  )
  with check (
    private.is_team_member(team_id)
    and (
      created_by = (select auth.uid())
      or private.can_manage_team_roles(team_id)
    )
  );

drop policy if exists eng_note_images_delete_author_or_admin on public.eng_note_images;
create policy eng_note_images_delete_author_or_admin
  on public.eng_note_images for delete to authenticated
  using (
    private.is_team_member(team_id)
    and (
      created_by = (select auth.uid())
      or private.can_manage_team_roles(team_id)
    )
  );

update storage.buckets
set public = false,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/heic']
where id = 'notebook';

drop policy if exists notebook_storage_select on storage.objects;
create policy notebook_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'notebook'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_team_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists notebook_storage_insert on storage.objects;
create policy notebook_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'notebook'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_team_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists notebook_storage_update on storage.objects;
create policy notebook_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'notebook'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_team_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'notebook'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_team_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists notebook_storage_delete on storage.objects;
create policy notebook_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'notebook'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.is_team_member(((storage.foldername(name))[1])::uuid)
  );

commit;
