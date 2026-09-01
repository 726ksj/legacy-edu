-- 학생이 강의를 얼마나 봤는지(진도율) 기록한다. 되감아도 진도가 줄어들지
-- 않도록(watched_seconds는 "가장 멀리 도달한 지점") 앱 코드에서 max로
-- 갱신하고, completed_at은 한 번 달성하면 계속 유지한다.

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watched_seconds numeric not null default 0,
  duration_seconds numeric,
  percent integer not null default 0 check (percent between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (profile_id, lesson_id)
);

alter table public.lesson_progress enable row level security;

create policy "lesson_progress_select_own" on public.lesson_progress
  for select using (auth.uid() = profile_id);

create policy "lesson_progress_insert_own" on public.lesson_progress
  for insert with check (auth.uid() = profile_id);

create policy "lesson_progress_update_own" on public.lesson_progress
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
