-- course_teachers는 지금까지 "이 강좌를 관리하는 선생님"만 담았는데,
-- 조교도 강좌 단위로 배정해서 그 강좌 수강생의 성적만 관리하게 하려면
-- 한 프로필이 같은 강좌에 "선생님 자격"과 "조교 자격" 중 어느 쪽으로
-- 연결됐는지 구분할 수 있어야 한다. 기존 행은 전부 선생님 배정이었으니
-- default 'teacher'로 백필한다.

alter table public.course_teachers
  add column role text not null default 'teacher'
  check (role in ('teacher', 'assistant'));

-- 강좌당 담당 선생님 1명, 담당 조교 1명까지만 두는 UI와 맞춰 DB에서도
-- 강제한다 (기존 unique(course_id, profile_id)는 그대로 둔다).
alter table public.course_teachers
  add constraint course_teachers_course_id_role_key unique (course_id, role);
