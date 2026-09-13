create extension if not exists pgcrypto;

do $$
declare
  teacher_id uuid;
begin
  select id into teacher_id
  from auth.users
  where email = 'teacher@english-zone.local';

  if teacher_id is null then
    teacher_id := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      teacher_id,
      'authenticated',
      'authenticated',
      'teacher@english-zone.local',
      crypt('Abdelrahman3177', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Mr. Abdelrahman Mohamed","role":"teacher"}'::jsonb,
      now(),
      now()
    );
  end if;

  update auth.users
  set encrypted_password = crypt('Abdelrahman3177', gen_salt('bf')),
      email = 'teacher@english-zone.local',
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Mr. Abdelrahman Mohamed","role":"teacher"}'::jsonb,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
  where id = teacher_id;

  insert into public.profiles (id, full_name, email, role, is_active)
  values (teacher_id, 'Mr. Abdelrahman Mohamed', 'teacher@english-zone.local', 'teacher', true)
  on conflict (id) do update
  set role = 'teacher', is_active = true, full_name = excluded.full_name, updated_at = now();
end;
$$;

create or replace function public.teacher_login(p_teacher_code text)
returns text
language sql
security definer
stable
set search_path = public, auth, extensions
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.role = 'teacher'
    and p.is_active
    and crypt(p_teacher_code, u.encrypted_password) = u.encrypted_password
  limit 1;
$$;

revoke all on function public.teacher_login(text) from public;
grant execute on function public.teacher_login(text) to anon, authenticated;
