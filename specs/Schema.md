-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  username text NOT NULL UNIQUE,
  avatar_url text,
  bio text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team_number text UNIQUE,
  owner_id uuid,
  invite_code text NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text) UNIQUE,
  created_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.team_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  name text,
  is_admin boolean NOT NULL DEFAULT false,
  can_manage_members boolean NOT NULL DEFAULT false,
  can_manage_tasks boolean NOT NULL DEFAULT false,
  can_manage_inventory boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_roles_pkey PRIMARY KEY (id),
  CONSTRAINT team_roles_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_members_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.member_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  role_id uuid NOT NULL,
  CONSTRAINT member_roles_pkey PRIMARY KEY (id),
  CONSTRAINT member_roles_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.team_members(id),
  CONSTRAINT member_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.team_roles(id)
);
CREATE TABLE public.parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  name text NOT NULL,
  sku text,
  status text NOT NULL DEFAULT 'inventory'::text CHECK (status = ANY (ARRAY['inventory'::text, 'to_be_used'::text, 'used'::text, 'removed'::text])),
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  quantity smallint,
  CONSTRAINT parts_pkey PRIMARY KEY (id),
  CONSTRAINT parts_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT parts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo'::text CHECK (status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text, 'blocked'::text])),
  importance text NOT NULL DEFAULT 'medium'::text CHECK (importance = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  category text,
  competition_status text,
  due_date date,
  is_personal boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.task_assignees (
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT task_assignees_pkey PRIMARY KEY (user_id, task_id),
  CONSTRAINT task_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_assignees_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.task_role_assignees (
  task_id uuid NOT NULL,
  role_id uuid NOT NULL,
  CONSTRAINT task_role_assignees_pkey PRIMARY KEY (task_id, role_id),
  CONSTRAINT task_role_assignees_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_role_assignees_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.team_roles(id)
);
CREATE TABLE public.task_parts (
  task_id uuid NOT NULL,
  part_id uuid NOT NULL,
  CONSTRAINT task_parts_pkey PRIMARY KEY (task_id, part_id),
  CONSTRAINT task_parts_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id),
  CONSTRAINT task_parts_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id)
);
CREATE TABLE public.subtasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo'::text CHECK (status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text, 'blocked'::text])),
  importance text NOT NULL DEFAULT 'medium'::text CHECK (importance = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subtasks_pkey PRIMARY KEY (id),
  CONSTRAINT subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.subtask_assignees (
  subtask_id uuid NOT NULL,
  user_id uuid NOT NULL,
  CONSTRAINT subtask_assignees_pkey PRIMARY KEY (subtask_id, user_id),
  CONSTRAINT subtask_assignees_subtask_id_fkey FOREIGN KEY (subtask_id) REFERENCES public.subtasks(id),
  CONSTRAINT subtask_assignees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);