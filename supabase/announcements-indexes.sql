-- Speed up the most-recent feed query
create index if not exists idx_announcements_created_at
  on public.announcements(created_at desc);

-- Speed up per-user read lookups and the unread count join
create index if not exists idx_read_announcements_user_announcement
  on public.read_announcements(user_id, announcement_id);

create index if not exists idx_read_announcements_announcement_id
  on public.read_announcements(announcement_id);

-- Speed up access checks by user_id and expiry filter
create index if not exists idx_announcement_access_user_id
  on public.announcement_access(user_id);

create index if not exists idx_announcement_access_expires_at
  on public.announcement_access(expires_at)
  where expires_at is not null;

-- Single-query unread count used by the nav badge
-- Returns the number of announcements the current user has not read
create or replace function get_unread_announcement_count()
returns integer
language sql
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.announcements a
  where not exists (
    select 1 from public.read_announcements r
    where r.announcement_id = a.id
      and r.user_id = auth.uid()
  );
$$;

grant execute on function get_unread_announcement_count() to authenticated;
