-- 학생/선생님 가입을 하나의 회원가입 화면 + 하나의 코드 체계로 합친다.
-- 기존 student_codes를 회원코드(member_codes)로 확장해서 재사용하고,
-- 강좌 배정은 코드 발급 시점이 아니라 강좌 관리 화면에서 하도록 바꾸면서
-- teacher_codes(및 그걸 위해 instructors에 얹었던 profile_id 연결)는 더
-- 이상 필요 없어져 제거한다. 둘 다 이번 세션에 막 만들어졌고 아직 실제로
-- 쓰인 적이 없어 안전하게 되돌릴 수 있다.

alter table public.student_codes rename to member_codes;
alter table public.member_codes rename column student_name to member_name;
alter table public.member_codes
  add column role text not null default 'student'
  check (role in ('student', 'teacher'));

alter table public.profiles rename column student_code_id to member_code_id;

-- teacher_codes를 참조하는 profiles.teacher_code_id부터 먼저 지워야
-- teacher_codes 테이블을 지울 수 있다(외래키 의존성 순서).
alter table public.profiles drop column if exists teacher_code_id;
drop table if exists public.teacher_codes;
alter table public.instructors drop column if exists profile_id;
