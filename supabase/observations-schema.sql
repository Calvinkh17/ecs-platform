-- Observations table
create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.users(id) on delete cascade,
  observer_id uuid not null references public.users(id) on delete cascade,
  observation_number int not null check (observation_number between 1 and 4),
  date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- Observation responses table (one row per point per observation)
create table if not exists public.observation_responses (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations(id) on delete cascade,
  point_key text not null,
  status text not null default 'na' check (status in ('observed', 'not_observed', 'na')),
  created_at timestamptz not null default now(),
  unique(observation_id, point_key)
);

-- Enable RLS
alter table public.observations enable row level security;
alter table public.observation_responses enable row level security;

-- Admins can do everything on observations
create policy "observations_admin_all" on public.observations
  for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- Teachers can view their own observations
create policy "observations_teacher_select" on public.observations
  for select to authenticated
  using (teacher_id = auth.uid());

-- Admins can do everything on responses
create policy "observation_responses_admin_all" on public.observation_responses
  for all to authenticated
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- Teachers can view responses for their own observations
create policy "observation_responses_teacher_select" on public.observation_responses
  for select to authenticated
  using (
    observation_id in (
      select id from public.observations where teacher_id = auth.uid()
    )
  );

-- Grants
grant all on public.observations to authenticated;
grant all on public.observations to anon;
grant all on public.observation_responses to authenticated;
grant all on public.observation_responses to anon;
