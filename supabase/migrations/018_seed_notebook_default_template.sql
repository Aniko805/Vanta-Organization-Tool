-- Idempotent global engineering-notebook template.

do $$
declare
  v_template_id uuid;
  v_tab_names text[] := array['Software', 'Hardware', 'Business'];
  v_section_names text[] := array['Accomplishments', 'Lessons Learned', 'To-be-completed'];
  v_hints text[] := array[
    '3–7 concrete bullets, past tense, name the mechanism or file changed.',
    '2–5 concrete lessons from today, past tense, name what changed the decision.',
    'Short bullets of remaining work. Cite an open task when it matches.'
  ];
  v_tab_name text;
  v_tab_id uuid;
  v_tab_index integer;
  v_section_index integer;
begin
  select id into v_template_id
  from public.notebook_templates
  where team_id is null
    and name = 'Vulcan Default'
  limit 1;

  if v_template_id is null then
    insert into public.notebook_templates (team_id, name, description, is_default)
    values (
      null,
      'Vulcan Default',
      'Starting structure for an FTC engineering notebook.',
      true
    )
    returning id into v_template_id;
  end if;

  if exists (
    select 1 from public.notebook_template_tabs where template_id = v_template_id
  ) then
    return;
  end if;

  v_tab_index := 0;
  foreach v_tab_name in array v_tab_names
  loop
    insert into public.notebook_template_tabs (template_id, name, position)
    values (v_template_id, v_tab_name, v_tab_index)
    returning id into v_tab_id;

    v_section_index := 0;
    while v_section_index < array_length(v_section_names, 1)
    loop
      insert into public.notebook_template_sections (tab_id, name, position, prompt_hint)
      values (
        v_tab_id,
        v_section_names[v_section_index + 1],
        v_section_index,
        v_hints[v_section_index + 1]
      );
      v_section_index := v_section_index + 1;
    end loop;

    v_tab_index := v_tab_index + 1;
  end loop;
end;
$$;
