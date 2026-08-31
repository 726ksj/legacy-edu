-- 강사 카드(instructors)를 선생님 로그인 계정(profiles)에 선택적으로
-- 연결한다. 회원코드 관리에서 선생님 계정을 삭제하면 연결된 강사 카드도
-- 함께 삭제되도록 on delete cascade로 건다 (지난번 병합 시도 때는
-- set null이었는데, 이번엔 계정 삭제 시 카드도 같이 지워지길 원해서 다르다).
-- 한 계정은 강사 카드 하나에만 연결되도록 unique도 건다.

alter table public.instructors
  add column profile_id uuid references public.profiles(id) on delete cascade;

alter table public.instructors
  add constraint instructors_profile_id_key unique (profile_id);
