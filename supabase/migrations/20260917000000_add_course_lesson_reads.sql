-- 학생이 마지막으로 강좌의 차시 목록(나의 강의실 강좌 상세)을 확인한
-- 시각을 기록해서, 그 이후 새로 올라온 영상이 있으면 홈 화면/나의
-- 강의실 목록에 "새 영상" 표시를 띄울 수 있게 한다. chat_room_reads와
-- 동일한 구조.
create table public.course_lesson_reads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (profile_id, course_id)
);
alter table public.course_lesson_reads enable row level security;

create policy "course_lesson_reads_select_own" on public.course_lesson_reads
  for select using (auth.uid() = profile_id);

-- chat_room_reads와 마찬가지로 profile_id 본인 확인뿐 아니라, 실제로
-- 그 강좌를 수강 중인지도 같이 확인한다.
create policy "course_lesson_reads_upsert_own" on public.course_lesson_reads
  for insert with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.enrollments
      where course_id = course_lesson_reads.course_id and profile_id = auth.uid()
    )
  );

create policy "course_lesson_reads_update_own" on public.course_lesson_reads
  for update using (auth.uid() = profile_id)
  with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.enrollments
      where course_id = course_lesson_reads.course_id and profile_id = auth.uid()
    )
  );
