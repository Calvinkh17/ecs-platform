-- ================================================================
-- RLS SECURITY AUDIT FIX
-- Run in full in the Supabase SQL Editor.
-- All statements are idempotent — safe to re-run.
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. ENSURE RLS IS ENABLED ON ALL TABLES
-- auth-schema.sql covers the core tables; repeated here as a
-- safety net in case any table was recreated without RLS.
-- ────────────────────────────────────────────────────────────────
alter table public.users                 enable row level security;
alter table public.classes               enable row level security;
alter table public.students              enable row level security;
alter table public.assignments           enable row level security;
alter table public.grades                enable row level security;
alter table public.school_students       enable row level security;
alter table public.observations          enable row level security;
alter table public.observation_responses enable row level security;
alter table public.parent_students       enable row level security;
alter table public.announcements         enable row level security;
alter table public.announcement_access   enable row level security;
alter table public.read_announcements    enable row level security;
alter table public.chat_channels         enable row level security;
alter table public.channel_members       enable row level security;
alter table public.chat_messages         enable row level security;
alter table public.message_mentions      enable row level security;


-- ────────────────────────────────────────────────────────────────
-- 2. REVOKE ALL GRANTS FROM THE ANON ROLE
-- Several schema files incorrectly used "grant all to anon".
-- Unauthenticated requests must never reach application tables.
-- ────────────────────────────────────────────────────────────────
revoke all on public.users                 from anon;
revoke all on public.classes               from anon;
revoke all on public.students              from anon;
revoke all on public.assignments           from anon;
revoke all on public.grades                from anon;
revoke all on public.school_students       from anon;
revoke all on public.observations          from anon;
revoke all on public.observation_responses from anon;
revoke all on public.parent_students       from anon;
revoke all on public.announcements         from anon;
revoke all on public.announcement_access   from anon;
revoke all on public.read_announcements    from anon;
revoke all on public.chat_channels         from anon;
revoke all on public.channel_members       from anon;
revoke all on public.chat_messages         from anon;
revoke all on public.message_mentions      from anon;


-- ────────────────────────────────────────────────────────────────
-- 3. CONFIRM AUTHENTICATED ROLE HAS CORRECT GRANTS
-- Only DML — no TRUNCATE, REFERENCES, or TRIGGER.
-- ────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.users                 to authenticated;
grant select, insert, update, delete on public.classes               to authenticated;
grant select, insert, update, delete on public.students              to authenticated;
grant select, insert, update, delete on public.assignments           to authenticated;
grant select, insert, update, delete on public.grades                to authenticated;
grant select, insert, update, delete on public.school_students       to authenticated;
grant select, insert, update, delete on public.observations          to authenticated;
grant select, insert, update, delete on public.observation_responses to authenticated;
grant select, insert, update, delete on public.parent_students       to authenticated;
grant select, insert, update, delete on public.announcements         to authenticated;
grant select, insert, update, delete on public.announcement_access   to authenticated;
grant select, insert, update, delete on public.read_announcements    to authenticated;
grant select, insert, update, delete on public.chat_channels         to authenticated;
grant select, insert, update, delete on public.channel_members       to authenticated;
grant select, insert, update, delete on public.chat_messages         to authenticated;
grant select, insert, update, delete on public.message_mentions      to authenticated;


-- ────────────────────────────────────────────────────────────────
-- 4. FIX channel_members RECURSIVE RLS POLICY
-- The original channel_members_select policy queried
-- channel_members inside its own USING clause, causing Postgres
-- to recurse infinitely. A SECURITY DEFINER helper function
-- bypasses RLS on its internal query, breaking the cycle.
-- ────────────────────────────────────────────────────────────────
create or replace function public.is_channel_member(p_channel_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.channel_members
    where channel_id = p_channel_id and user_id = p_user_id
  );
$$;

grant execute on function public.is_channel_member(uuid, uuid) to authenticated;

drop policy if exists "channel_members_select" on public.channel_members;
create policy "channel_members_select" on public.channel_members
  for select to authenticated
  using (
    get_my_role() = 'admin'
    or user_id = auth.uid()
    or is_channel_member(channel_id, auth.uid())
  );


-- ────────────────────────────────────────────────────────────────
-- 5. ADD MISSING TEACHER READ POLICY ON users
-- Without this, teachers loading the chat page can only see
-- themselves — no other staff appear in @mention autocomplete
-- or the channel members list.
-- ────────────────────────────────────────────────────────────────
drop policy if exists "users: teacher read staff" on public.users;
create policy "users: teacher read staff" on public.users
  for select
  using (
    get_my_role() = 'teacher'
    and role in ('admin', 'teacher')
  );


-- ────────────────────────────────────────────────────────────────
-- 6. FIX OVERLY-BROAD PARENT / STUDENT READ POLICIES
--
-- The original policies used `get_my_role() in ('parent','student')`
-- with no further filter, meaning every parent could read every
-- student, class, assignment, and grade across the school.
--
-- Correct behaviour: parents and students may only see data for
-- their own linked children (via the parent_students join table).
-- Admins and teachers are unaffected — their policies are separate.
-- ────────────────────────────────────────────────────────────────

-- SECURITY DEFINER helpers to avoid circular RLS between classes ↔ students.
-- classes: parent student read → queries students
-- students: teacher select    → queries classes  → infinite recursion
-- Fix: query students/parent_students from SECURITY DEFINER functions
-- that bypass RLS, breaking the cycle.

create or replace function public.get_child_class_ids(p_user_id uuid)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select s.class_id
  from public.students s
  join public.parent_students ps on ps.student_id = s.school_student_id
  where ps.parent_id = p_user_id
    and s.class_id is not null;
$$;

create or replace function public.get_child_student_ids(p_user_id uuid)
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select s.id
  from public.students s
  join public.parent_students ps on ps.student_id = s.school_student_id
  where ps.parent_id = p_user_id;
$$;

grant execute on function public.get_child_class_ids(uuid)   to authenticated;
grant execute on function public.get_child_student_ids(uuid) to authenticated;

-- CLASSES --------------------------------------------------------
drop policy if exists "classes: parent student read" on public.classes;
create policy "classes: parent student read" on public.classes
  for select
  using (
    get_my_role() in ('parent', 'student')
    and id in (select get_child_class_ids(auth.uid()))
  );

-- STUDENTS -------------------------------------------------------
drop policy if exists "students: parent student read" on public.students;
create policy "students: parent student read" on public.students
  for select
  using (
    get_my_role() in ('parent', 'student')
    and school_student_id in (
      select student_id from public.parent_students where parent_id = auth.uid()
    )
  );

-- ASSIGNMENTS ----------------------------------------------------
drop policy if exists "assignments: parent student read" on public.assignments;
create policy "assignments: parent student read" on public.assignments
  for select
  using (
    get_my_role() in ('parent', 'student')
    and class_id in (select get_child_class_ids(auth.uid()))
  );

-- GRADES ---------------------------------------------------------
drop policy if exists "grades: parent student read" on public.grades;
drop policy if exists "grades_select_parent"        on public.grades;
create policy "grades: parent student read" on public.grades
  for select to authenticated
  using (
    get_my_role() in ('parent', 'student')
    and student_id in (select get_child_student_ids(auth.uid()))
  );
