begin;

alter table public.team_roles
  drop constraint if exists team_roles_team_id_fkey,
  add constraint team_roles_team_id_fkey
    foreign key (team_id) references public.teams(id) on delete cascade;

alter table public.team_members
  drop constraint if exists team_members_team_id_fkey,
  add constraint team_members_team_id_fkey
    foreign key (team_id) references public.teams(id) on delete cascade;

alter table public.parts
  drop constraint if exists parts_team_id_fkey,
  add constraint parts_team_id_fkey
    foreign key (team_id) references public.teams(id) on delete cascade;

alter table public.tasks
  drop constraint if exists tasks_team_id_fkey,
  add constraint tasks_team_id_fkey
    foreign key (team_id) references public.teams(id) on delete cascade;

alter table public.part_catalog
  drop constraint if exists part_catalog_team_id_fkey,
  add constraint part_catalog_team_id_fkey
    foreign key (team_id) references public.teams(id) on delete cascade;

alter table public.status_list
  drop constraint if exists status_list_team_id_fkey,
  add constraint status_list_team_id_fkey
    foreign key (team_id) references public.teams(id) on delete cascade;

alter table public.member_roles
  drop constraint if exists member_roles_member_id_fkey,
  add constraint member_roles_member_id_fkey
    foreign key (member_id) references public.team_members(id) on delete cascade,
  drop constraint if exists member_roles_role_id_fkey,
  add constraint member_roles_role_id_fkey
    foreign key (role_id) references public.team_roles(id) on delete cascade;

alter table public.task_assignees
  drop constraint if exists task_assignees_task_id_fkey,
  add constraint task_assignees_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade;

alter table public.task_role_assignees
  drop constraint if exists task_role_assignees_task_id_fkey,
  add constraint task_role_assignees_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade,
  drop constraint if exists task_role_assignees_role_id_fkey,
  add constraint task_role_assignees_role_id_fkey
    foreign key (role_id) references public.team_roles(id) on delete cascade;

alter table public.task_parts
  drop constraint if exists task_parts_task_id_fkey,
  add constraint task_parts_task_id_fkey
    foreign key (task_id) references public.tasks(id) on delete cascade,
  drop constraint if exists task_parts_part_id_fkey,
  add constraint task_parts_part_id_fkey
    foreign key (part_id) references public.parts(id) on delete cascade;

alter table public.part_status
  drop constraint if exists part_status_status_id_fkey,
  add constraint part_status_status_id_fkey
    foreign key (status_id) references public.status_list(id) on delete cascade,
  drop constraint if exists part_status_part_id_fkey,
  add constraint part_status_part_id_fkey
    foreign key (part_id) references public.parts(id) on delete cascade;

commit;