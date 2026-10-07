begin;

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
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_root
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
    select 1
    from public.teams as t
    where t.id = v_root.team_id
      and t.owner_id = v_user_id
  ) and not exists (
    select 1
    from public.team_members as tm
    join public.member_roles as mr on mr.member_id = tm.id
    join public.team_roles as tr on tr.id = mr.role_id
    where tm.team_id = v_root.team_id
      and tm.user_id = v_user_id
      and tr.team_id = v_root.team_id
      and (tr.is_admin or tr.can_manage_tasks)
  ) then
    raise exception 'You do not have permission to manage this team task';
  end if;

  with recursive task_tree(id) as (
    select id
    from public.tasks
    where id = p_task_id
    union
    select child.id
    from public.tasks as child
    join task_tree as parent on child.parent_id = parent.id
  )
  select array_agg(id)
  into v_task_ids
  from task_tree;

  if v_root.is_personal and exists (
    select 1
    from public.tasks
    where id = any(v_task_ids)
      and (not is_personal or created_by <> v_user_id or team_id is not null)
  ) then
    raise exception 'The personal task tree contains tasks outside your ownership';
  end if;

  if not v_root.is_personal and exists (
    select 1
    from public.tasks
    where id = any(v_task_ids)
      and (is_personal or team_id is distinct from v_root.team_id)
  ) then
    raise exception 'The team task tree contains tasks from another scope';
  end if;

  perform 1
  from public.tasks
  where id = any(v_task_ids)
  for update;

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

revoke delete on table public.tasks from public, anon, authenticated;

commit;