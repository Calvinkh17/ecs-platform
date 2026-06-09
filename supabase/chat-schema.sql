-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.channel_members (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  constraint channel_members_channel_user_unique unique (channel_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.message_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  mentioned_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table public.chat_channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.message_mentions enable row level security;

-- chat_channels: admin sees all; members see their own channels
create policy "chat_channels_select" on public.chat_channels
  for select to authenticated
  using (
    get_my_role() = 'admin'
    or exists (
      select 1 from public.channel_members
      where channel_id = chat_channels.id and user_id = auth.uid()
    )
  );

create policy "chat_channels_insert_admin" on public.chat_channels
  for insert to authenticated
  with check (get_my_role() = 'admin');

create policy "chat_channels_delete_admin" on public.chat_channels
  for delete to authenticated
  using (get_my_role() = 'admin');

-- channel_members: admin sees all; members see who's in their own channels
create policy "channel_members_select" on public.channel_members
  for select to authenticated
  using (
    get_my_role() = 'admin'
    or user_id = auth.uid()
    or exists (
      select 1 from public.channel_members cm2
      where cm2.channel_id = channel_members.channel_id and cm2.user_id = auth.uid()
    )
  );

create policy "channel_members_insert_admin" on public.channel_members
  for insert to authenticated
  with check (get_my_role() = 'admin');

-- admin can remove anyone; users can remove themselves (leave channel)
create policy "channel_members_delete" on public.channel_members
  for delete to authenticated
  using (get_my_role() = 'admin' or user_id = auth.uid());

-- users update their own last_read_at
create policy "channel_members_update_own" on public.channel_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- chat_messages: channel members can read and write
create policy "chat_messages_select_member" on public.chat_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.channel_members
      where channel_id = chat_messages.channel_id and user_id = auth.uid()
    )
  );

create policy "chat_messages_insert_member" on public.chat_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.channel_members
      where channel_id = chat_messages.channel_id and user_id = auth.uid()
    )
  );

-- message_mentions: channel members can read; sender (channel member) can insert
create policy "message_mentions_select" on public.message_mentions
  for select to authenticated
  using (
    mentioned_user_id = auth.uid()
    or exists (
      select 1 from public.chat_messages msg
      join public.channel_members cm on cm.channel_id = msg.channel_id
      where msg.id = message_mentions.message_id and cm.user_id = auth.uid()
    )
  );

create policy "message_mentions_insert_member" on public.message_mentions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.chat_messages msg
      join public.channel_members cm on cm.channel_id = msg.channel_id
      where msg.id = message_id and cm.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Grants
-- ─────────────────────────────────────────────────────────────

grant all on public.chat_channels to authenticated;
grant all on public.chat_channels to anon;
grant all on public.channel_members to authenticated;
grant all on public.channel_members to anon;
grant all on public.chat_messages to authenticated;
grant all on public.chat_messages to anon;
grant all on public.message_mentions to authenticated;
grant all on public.message_mentions to anon;

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_chat_messages_channel_created
  on public.chat_messages(channel_id, created_at desc);

create index if not exists idx_channel_members_user_id
  on public.channel_members(user_id);

create index if not exists idx_channel_members_channel_id
  on public.channel_members(channel_id);

create index if not exists idx_message_mentions_user_id
  on public.message_mentions(mentioned_user_id);

create index if not exists idx_message_mentions_message_id
  on public.message_mentions(message_id);

-- ─────────────────────────────────────────────────────────────
-- Unread mention count (used by nav badge)
-- ─────────────────────────────────────────────────────────────

create or replace function get_unread_mention_count()
returns integer
language sql
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.message_mentions mm
  join public.chat_messages cm on cm.id = mm.message_id
  join public.channel_members cmb
    on cmb.channel_id = cm.channel_id
    and cmb.user_id = auth.uid()
  where mm.mentioned_user_id = auth.uid()
    and cm.created_at > cmb.last_read_at;
$$;

grant execute on function get_unread_mention_count() to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.message_mentions;
