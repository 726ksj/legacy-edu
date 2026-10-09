-- 강좌별 커리큘럼 주차 수. null이면 주차 구성을 쓰지 않는 강좌(영상 목록만).
-- 관리자가 강좌를 만들 때 정하고, 강사/관리자 강좌 관리 화면이 이 값으로
-- 주차 목록을 구성한다.
--
-- 영상/단어장의 주차 값은 강좌마다 상한이 다르므로 8주 고정 제약을 풀고
-- (1 이상, 최대 52), 강좌별 상한은 서버 액션에서 검증한다.

alter table public.courses
  add column if not exists total_weeks smallint
  constraint courses_total_weeks_check check (total_weeks between 1 and 52);

alter table public.lessons drop constraint if exists lessons_week_check;
alter table public.lessons
  add constraint lessons_week_check check (week between 1 and 52);

alter table public.vocab_sets drop constraint if exists vocab_sets_week_check;
alter table public.vocab_sets
  add constraint vocab_sets_week_check check (week between 1 and 52);

-- 이미 주차를 지정해 둔 강좌는 기존 8주 구성을 유지한다.
update public.courses c
set total_weeks = 8
where c.total_weeks is null
  and (
    exists (select 1 from public.lessons l where l.course_id = c.id and l.week is not null)
    or exists (
      select 1
      from public.vocab_assignments va
      join public.vocab_sets vs on vs.id = va.vocab_set_id
      where va.course_id = c.id and vs.week is not null
    )
  );
