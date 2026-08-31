-- "강사 관리"(표시용 카드)와 "선생님 계정 관리"(로그인 계정)가 따로 놀아서
-- 하나로 합친다. instructors 행이 실제 로그인 계정에 연결될 수 있게 하고,
-- 선생님 초대 코드도 이제 강사 카드에서 바로 발급한다.

alter table public.instructors
  add column profile_id uuid references public.profiles(id) on delete set null;

-- teacher_codes는 이번 세션에 막 만들어졌고 아직 실제로 쓰인 적이 없어
-- (전부 미사용) 안전하게 구조를 바꿀 수 있다. teacher_name 대신 어느
-- 강사 카드에 연결할지를 나타내는 instructor_id로 바꾼다.
alter table public.teacher_codes
  drop column teacher_name,
  add column instructor_id uuid not null references public.instructors(id);
