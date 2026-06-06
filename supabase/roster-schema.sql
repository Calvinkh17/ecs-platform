-- Master student roster
create table public.school_students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade_level text not null,
  email text,
  year_joined integer not null,
  created_at timestamptz default now()
);

-- Link class enrollments back to the roster
alter table public.students
  add column school_student_id uuid references public.school_students(id) on delete set null;

-- RLS
alter table public.school_students enable row level security;

create policy "school_students_select" on public.school_students for select to authenticated using (true);
create policy "school_students_insert" on public.school_students for insert to authenticated with check (get_my_role() = 'admin');
create policy "school_students_update" on public.school_students for update to authenticated using (get_my_role() = 'admin');
create policy "school_students_delete" on public.school_students for delete to authenticated using (get_my_role() = 'admin');
