begin;

drop trigger if exists on_task_part_inserted on public.task_parts;
drop function if exists public.handle_task_part_link();

commit;