-- 강사/학생 두 역할뿐이던 회원코드/프로필에 '조교'(assistant)를 추가한다.
-- 조교는 아직 구체적인 권한 기능(성적 관리/채팅)이 없어 우선 분류만
-- 가능하게 하고, 회원가입은 선생님과 동일하게 최소 정보만 받는다.

alter table public.member_codes drop constraint member_codes_role_check;
alter table public.member_codes
  add constraint member_codes_role_check
  check (role in ('student', 'teacher', 'assistant'));

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'assistant'));
