-- 커리큘럼을 학교급(고등/중등) > 트랙(예비 고등/고등 내신) 2단계로
-- 묶는다. 홈 화면에 노출될 카테고리(개인별 난이도 맞춤 시스템, 매 수업
-- 진행 시스템)는 이 계층에 속하지 않으므로 track_id는 nullable로 두고,
-- 아직은 그대로 미배정 상태로 남겨둔다(홈 화면 이전은 별도 작업).

create table public.curriculum_school_levels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.curriculum_tracks (
  id uuid primary key default gen_random_uuid(),
  school_level_id uuid not null references public.curriculum_school_levels(id) on delete cascade,
  slug text not null,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (school_level_id, slug)
);

alter table public.curriculum_categories
  add column track_id uuid references public.curriculum_tracks(id) on delete set null;

alter table public.curriculum_school_levels enable row level security;
alter table public.curriculum_tracks enable row level security;

create policy "curriculum_school_levels_select_all"
  on public.curriculum_school_levels
  for select
  using (true);

create policy "curriculum_tracks_select_all"
  on public.curriculum_tracks
  for select
  using (true);
