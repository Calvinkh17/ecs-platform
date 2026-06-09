-- Announcements
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Per-user send access (for time-limited volunteer access)
create table if not exists public.announcement_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz,
  can_send boolean not null default true,
  created_at timestamptz not null default now(),
  constraint announcement_access_user_id_unique unique (user_id)
);

-- Read tracking (badge unread count)
create table if not exists public.read_announcements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  constraint read_announcements_user_announcement_unique unique (user_id, announcement_id)
);

-- Enable RLS
alter table public.announcements enable row level security;
alter table public.announcement_access enable row level security;
alter table public.read_announcements enable row level security;

-- announcements: all authenticated users can read
create policy "announcements_select_all" on public.announcements
  for select to authenticated using (true);

-- announcements: admins, teachers, and users with valid access can insert
create policy "announcements_insert_authorized" on public.announcements
  for insert to authenticated
  with check (
    get_my_role() in ('admin', 'teacher')
    or exists (
      select 1 from public.announcement_access
      where user_id = auth.uid()
        and can_send = true
        and (expires_at is null or expires_at > now())
    )
  );

-- announcement_access: admins can do everything
create policy "announcement_access_admin_all" on public.announcement_access
  for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- announcement_access: users can read their own record
create policy "announcement_access_own_select" on public.announcement_access
  for select to authenticated
  using (user_id = auth.uid());

-- read_announcements: users can manage their own records
create policy "read_announcements_own_all" on public.read_announcements
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Grants
grant all on public.announcements to authenticated;
grant all on public.announcements to anon;
grant all on public.announcement_access to authenticated;
grant all on public.announcement_access to anon;
grant all on public.read_announcements to authenticated;
grant all on public.read_announcements to anon;

-- Enable realtime (run these in Supabase SQL editor or via dashboard)
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.read_announcements;
