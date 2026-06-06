-- ============================================================
-- AUTH SCHEMA — paste into Supabase SQL Editor and run
-- ============================================================

-- 1. Role enum
create type user_role as enum ('pending', 'admin', 'teacher', 'parent', 'student');

-- 2. Users table
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  role       user_role not null default 'pending',
  created_at timestamptz default now()
);

-- 3. teacher_id on classes
alter table public.classes
  add column if not exists teacher_id uuid references public.users(id) on delete set null;

-- 4. Auto-create user row on first sign-in
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Role helper (security definer bypasses RLS)
create or replace function public.get_my_role()
returns text language sql stable security definer as $$
  select role::text from public.users where id = auth.uid();
$$;

-- 6. Enable RLS
alter table public.users       enable row level security;
alter table public.classes     enable row level security;
alter table public.students    enable row level security;
alter table public.assignments enable row level security;
alter table public.grades      enable row level security;

-- 7. Revoke old blanket grants, re-grant via RLS
revoke all on public.classes     from anon, authenticated;
revoke all on public.students    from anon, authenticated;
revoke all on public.assignments from anon, authenticated;
revoke all on public.grades      from anon, authenticated;

grant select, insert, update, delete on public.users       to authenticated;
grant select, insert, update, delete on public.classes     to authenticated;
grant select, insert, update, delete on public.students    to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.grades      to authenticated;

-- ============================================================
-- POLICIES
-- ============================================================

-- users
drop policy if exists "users: read own"       on public.users;
drop policy if exists "users: admin read all" on public.users;
drop policy if exists "users: insert own"     on public.users;
drop policy if exists "users: admin update"   on public.users;

create policy "users: read own"       on public.users for select using (auth.uid() = id);
create policy "users: admin read all" on public.users for select using (get_my_role() = 'admin');
create policy "users: insert own"     on public.users for insert with check (auth.uid() = id);
create policy "users: admin update"   on public.users for update using (get_my_role() = 'admin') with check (get_my_role() = 'admin');

-- classes
drop policy if exists "classes: teacher select"       on public.classes;
drop policy if exists "classes: teacher insert"       on public.classes;
drop policy if exists "classes: teacher update"       on public.classes;
drop policy if exists "classes: teacher delete"       on public.classes;
drop policy if exists "classes: parent student read"  on public.classes;

create policy "classes: teacher select" on public.classes for select using (teacher_id = auth.uid() or get_my_role() = 'admin');
create policy "classes: teacher insert" on public.classes for insert with check (teacher_id = auth.uid() or get_my_role() = 'admin');
create policy "classes: teacher update" on public.classes for update using (teacher_id = auth.uid() or get_my_role() = 'admin') with check (teacher_id = auth.uid() or get_my_role() = 'admin');
create policy "classes: teacher delete" on public.classes for delete using (teacher_id = auth.uid() or get_my_role() = 'admin');
create policy "classes: parent student read" on public.classes for select using (get_my_role() in ('parent', 'student'));

-- students
drop policy if exists "students: teacher select"      on public.students;
drop policy if exists "students: teacher insert"      on public.students;
drop policy if exists "students: teacher update"      on public.students;
drop policy if exists "students: teacher delete"      on public.students;
drop policy if exists "students: parent student read" on public.students;

create policy "students: teacher select" on public.students for select using (get_my_role() = 'admin' or exists (select 1 from public.classes where classes.id = students.class_id and classes.teacher_id = auth.uid()));
create policy "students: teacher insert" on public.students for insert with check (get_my_role() = 'admin' or exists (select 1 from public.classes where classes.id = students.class_id and classes.teacher_id = auth.uid()));
create policy "students: teacher update" on public.students for update using (get_my_role() = 'admin' or exists (select 1 from public.classes where classes.id = students.class_id and classes.teacher_id = auth.uid()));
create policy "students: teacher delete" on public.students for delete using (get_my_role() = 'admin' or exists (select 1 from public.classes where classes.id = students.class_id and classes.teacher_id = auth.uid()));
create policy "students: parent student read" on public.students for select using (get_my_role() in ('parent', 'student'));

-- assignments
drop policy if exists "assignments: teacher select"      on public.assignments;
drop policy if exists "assignments: teacher insert"      on public.assignments;
drop policy if exists "assignments: teacher update"      on public.assignments;
drop policy if exists "assignments: teacher delete"      on public.assignments;
drop policy if exists "assignments: parent student read" on public.assignments;

create policy "assignments: teacher select" on public.assignments for select using (get_my_role() = 'admin' or exists (select 1 from public.classes where classes.id = assignments.class_id and classes.teacher_id = auth.uid()));
create policy "assignments: teacher insert" on public.assignments for insert with check (get_my_role() = 'admin' or exists (select 1 from public.classes where classes.id = assignments.class_id and classes.teacher_id = auth.uid()));
create policy "assignments: teacher update" on public.assignments for update using (get_my_role() = 'admin' or exists (select 1 from public.classes where classes.id = assignments.class_id and classes.teacher_id = auth.uid()));
create policy "assignments: teacher delete" on public.assignments for delete using (get_my_role() = 'admin' or exists (select 1 from public.classes where classes.id = assignments.class_id and classes.teacher_id = auth.uid()));
create policy "assignments: parent student read" on public.assignments for select using (get_my_role() in ('parent', 'student'));

-- grades
drop policy if exists "grades: teacher select"      on public.grades;
drop policy if exists "grades: teacher insert"      on public.grades;
drop policy if exists "grades: teacher update"      on public.grades;
drop policy if exists "grades: teacher delete"      on public.grades;
drop policy if exists "grades: parent student read" on public.grades;

create policy "grades: teacher select" on public.grades for select using (get_my_role() = 'admin' or exists (select 1 from public.assignments join public.classes on classes.id = assignments.class_id where assignments.id = grades.assignment_id and classes.teacher_id = auth.uid()));
create policy "grades: teacher insert" on public.grades for insert with check (get_my_role() = 'admin' or exists (select 1 from public.assignments join public.classes on classes.id = assignments.class_id where assignments.id = grades.assignment_id and classes.teacher_id = auth.uid()));
create policy "grades: teacher update" on public.grades for update using (get_my_role() = 'admin' or exists (select 1 from public.assignments join public.classes on classes.id = assignments.class_id where assignments.id = grades.assignment_id and classes.teacher_id = auth.uid()));
create policy "grades: teacher delete" on public.grades for delete using (get_my_role() = 'admin' or exists (select 1 from public.assignments join public.classes on classes.id = assignments.class_id where assignments.id = grades.assignment_id and classes.teacher_id = auth.uid()));
create policy "grades: parent student read" on public.grades for select using (get_my_role() in ('parent', 'student'));

-- ============================================================
-- After your first sign-in, run this to make yourself admin:
-- update public.users set role = 'admin' where email = 'your@email.com';
-- ============================================================
