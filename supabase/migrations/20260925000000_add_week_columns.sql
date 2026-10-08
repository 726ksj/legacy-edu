-- 강좌를 8주 커리큘럼으로 관리하기 위한 주차 컬럼.
--  - courses.start_date: 강좌별 시작일(선택). 주차별 날짜 범위 표시에 쓴다.
--  - lessons.week: 영상이 속한 주차(선택). 비워두면 "주차 미지정"으로 취급한다.
--  - vocab_sets.week: 단어장이 속한 주차(1~8). 기존 단어장은 주차를 모르니
--    null로 두고, 강사 화면의 "주차 미지정"에서 지정할 수 있게 한다.

alter table public.courses
  add column if not exists start_date date;

alter table public.lessons
  add column if not exists week smallint
  constraint lessons_week_check check (week between 1 and 8);

alter table public.vocab_sets
  add column if not exists week smallint
  constraint vocab_sets_week_check check (week between 1 and 8);
