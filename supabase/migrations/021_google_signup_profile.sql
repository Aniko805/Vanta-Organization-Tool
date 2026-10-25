-- Profile creation for Google sign-in.
--
-- Google users have no password and no sign-up form, so there is no
-- `username` in their metadata. This replaces public.handle_new_user() so a
-- profile is still created for them, using what Google supplies in
-- raw_user_meta_data (name, given_name, family_name, picture).
--
-- Behaviour for email/password sign-ups is unchanged: an explicit `username`
-- in the metadata is used as-is, and no names or avatar are invented.
-- Safe to run more than once: the function is replaced, the trigger is
-- recreated, and the insert ignores an existing profile for the same user id.
-- It runs as security definer, so it does not touch any RLS policy.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := nullif(btrim(coalesce(meta->>'full_name', meta->>'name', '')), '');
  first_name_value text;
  last_name_value text;
  avatar_value text := nullif(btrim(coalesce(meta->>'avatar_url', meta->>'picture', '')), '');
  username_value text := nullif(btrim(coalesce(meta->>'username', '')), '');
  base_username text;
  suffix int := 0;
begin
  first_name_value := nullif(btrim(coalesce(
    meta->>'given_name',
    split_part(coalesce(full_name, ''), ' ', 1)
  )), '');
  last_name_value := nullif(btrim(coalesce(
    meta->>'family_name',
    case
      when position(' ' in coalesce(full_name, '')) > 0
        then substr(full_name, position(' ' in full_name) + 1)
    end
  )), '');

  -- No username supplied (Google): derive one from the email and keep it
  -- unique, because profiles.username is unique and not null.
  if username_value is null then
    base_username := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
    if base_username = '' then
      base_username := 'user';
    end if;

    username_value := base_username;
    while exists (select 1 from public.profiles where username = username_value) loop
      suffix := suffix + 1;
      username_value := base_username || suffix::text;
    end loop;
  end if;

  insert into public.profiles (id, username, first_name, last_name, avatar_image)
  values (new.id, username_value, first_name_value, last_name_value, avatar_value)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
