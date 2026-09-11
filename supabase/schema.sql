create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'teacher');
create type public.record_status as enum ('pending', 'active', 'inactive', 'approved', 'rejected');
create type public.attendance_status as enum ('present', 'absent', 'late');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  role public.user_role not null default 'student',
  student_code text unique,
  educational_level text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    educational_level,
    is_active
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student'),
    new.raw_user_meta_data->>'educational_level',
    false
  )
  on conflict (id) do update
  set full_name = coalesce(public.profiles.full_name, excluded.full_name),
      email = excluded.email,
      phone = coalesce(public.profiles.phone, excluded.phone),
      educational_level = coalesce(public.profiles.educational_level, excluded.educational_level),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  level text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  teacher_id uuid not null references public.profiles(id),
  course_link text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  content text not null default '',
  video_link text,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  lesson_order integer not null default 1 check (lesson_order > 0),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.record_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(student_id, course_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  amount numeric(10,2) not null check (amount >= 0),
  transaction_reference text not null,
  payment_date date not null default current_date,
  proof_path text,
  status public.record_status not null default 'pending',
  teacher_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.student_lesson_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  attendance_date date not null,
  status public.attendance_status not null,
  note text,
  created_at timestamptz not null default now(),
  unique(student_id, course_id, attendance_date)
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  description text not null default '',
  exam_date timestamptz,
  duration_minutes integer,
  total_marks numeric(8,2) not null default 0,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  marks numeric(8,2) not null default 1
);

create table public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(8,2),
  percentage numeric(5,2),
  result text,
  submitted_at timestamptz not null default now(),
  unique(exam_id, student_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  message text not null,
  is_published boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete set null,
  score numeric(8,2) not null,
  total_marks numeric(8,2) not null,
  percentage numeric(5,2) not null,
  result text not null,
  grade_date date not null default current_date
);
insert into public.settings(key, value) values ('instapay_number', '01014812293'), ('payment_instructions', 'Transfer the course fee via InstaPay, then submit your transaction reference.') on conflict do nothing;

create or replace function public.create_student_account(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_level text,
  p_student_code text
) returns jsonb
language plpgsql security definer set search_path = public, auth, extensions
as $$
declare new_id uuid := gen_random_uuid();
begin
  if not public.is_teacher() then raise exception 'Only an active teacher can create students'; end if;
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (new_id, 'authenticated', 'authenticated', p_email, crypt(p_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', p_full_name), now(), now());
  insert into public.profiles(id, full_name, email, phone, role, student_code, educational_level, is_active)
  values (new_id, p_full_name, p_email, p_phone, 'student', p_student_code, p_level, true);
  return jsonb_build_object('student_id', new_id, 'student_code', p_student_code);
end;
$$;
revoke all on function public.create_student_account(text, text, text, text, text, text) from public;
grant execute on function public.create_student_account(text, text, text, text, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.payments enable row level security;
alter table public.student_lesson_progress enable row level security;
alter table public.attendance enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.exam_submissions enable row level security;
alter table public.announcements enable row level security;
alter table public.settings enable row level security;
alter table public.support_messages enable row level security;
alter table public.grades enable row level security;

create or replace function public.is_teacher() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher' and is_active); $$;
create policy "students read own profile" on public.profiles for select using (id = auth.uid() or public.is_teacher());
create policy "students update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "teachers manage profiles" on public.profiles for all using (public.is_teacher()) with check (public.is_teacher());
create policy "active courses are visible" on public.courses for select using (status = 'active' or public.is_teacher());
create policy "teachers manage courses" on public.courses for all using (public.is_teacher()) with check (public.is_teacher());
create policy "lessons visible to enrolled students" on public.lessons for select using (public.is_teacher() or exists (select 1 from public.enrollments e where e.course_id = lessons.course_id and e.student_id = auth.uid() and e.status = 'approved'));
create policy "teachers manage lessons" on public.lessons for all using (public.is_teacher()) with check (public.is_teacher());
create policy "students read own enrollments" on public.enrollments for select using (student_id = auth.uid() or public.is_teacher());
create policy "students create own enrollment" on public.enrollments for insert with check (student_id = auth.uid());
create policy "teachers manage enrollments" on public.enrollments for all using (public.is_teacher()) with check (public.is_teacher());
create policy "students manage own payments" on public.payments for select using (student_id = auth.uid() or public.is_teacher());
create policy "students submit payments" on public.payments for insert with check (student_id = auth.uid());
create policy "teachers review payments" on public.payments for update using (public.is_teacher()) with check (public.is_teacher());
create policy "students manage own progress" on public.student_lesson_progress for all using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "teachers read progress" on public.student_lesson_progress for select using (public.is_teacher());
create policy "attendance access" on public.attendance for select using (student_id = auth.uid() or public.is_teacher());
create policy "teachers manage attendance" on public.attendance for all using (public.is_teacher()) with check (public.is_teacher());
create policy "exams visible to enrolled students" on public.exams for select using (public.is_teacher() or exists (select 1 from public.enrollments e where e.course_id = exams.course_id and e.student_id = auth.uid() and e.status = 'approved'));
create policy "teachers manage exams" on public.exams for all using (public.is_teacher()) with check (public.is_teacher());
create policy "questions follow exam access" on public.questions for select using (public.is_teacher() or exists (select 1 from public.exams x join public.enrollments e on e.course_id = x.course_id where x.id = questions.exam_id and e.student_id = auth.uid() and e.status = 'approved'));
create policy "teachers manage questions" on public.questions for all using (public.is_teacher()) with check (public.is_teacher());
create policy "students manage own submissions" on public.exam_submissions for all using (student_id = auth.uid() or public.is_teacher()) with check (student_id = auth.uid() or public.is_teacher());
create policy "published announcements visible" on public.announcements for select using (is_published and (course_id is null or exists (select 1 from public.enrollments e where e.course_id = announcements.course_id and e.student_id = auth.uid() and e.status = 'approved')) or public.is_teacher());
create policy "teachers manage announcements" on public.announcements for all using (public.is_teacher()) with check (public.is_teacher());
create policy "settings visible" on public.settings for select using (true);
create policy "teachers manage settings" on public.settings for all using (public.is_teacher()) with check (public.is_teacher());
create policy "students manage own support" on public.support_messages for all using (student_id = auth.uid() or public.is_teacher()) with check (student_id = auth.uid() or public.is_teacher());
create policy "grades access" on public.grades for select using (student_id = auth.uid() or public.is_teacher());
create policy "teachers manage grades" on public.grades for all using (public.is_teacher()) with check (public.is_teacher());