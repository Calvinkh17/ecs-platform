-- Parent-student links
create table public.parent_students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.school_students(id) on delete cascade,
  created_at timestamptz default now(),
  unique(parent_id, student_id)
);

alter table public.parent_students enable row level security;

-- Admins can manage all links
create policy "parent_students_select_admin" on public.parent_students for select to authenticated using (get_my_role() = 'admin');
create policy "parent_students_insert_admin" on public.parent_students for insert to authenticated with check (get_my_role() = 'admin');
create policy "parent_students_delete_admin" on public.parent_students for delete to authenticated using (get_my_role() = 'admin');

-- Parents can read their own links
create policy "parent_students_select_parent" on public.parent_students for select to authenticated using (auth.uid() = parent_id);

-- Grants
grant select, insert, update, delete on public.parent_students to authenticated;

-- Allow parents to read grades for their linked students only
create policy "grades_select_parent" on public.grades for select to authenticated
  using (
    get_my_role() = 'parent' and
    student_id in (
      select s.id from public.students s
      inner join public.parent_students ps on ps.student_id = s.school_student_id
      where ps.parent_id = auth.uid()
    )
  );
