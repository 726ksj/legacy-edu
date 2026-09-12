-- course_notices_select_authenticated는 "로그인만 하면 전부 조회 가능"이라
-- 자기가 수강하지도, 담당하지도 않는 다른 강좌의 공지까지 Supabase REST
-- API로 직접 읽을 수 있었다. 일반 notices 테이블은 이미
-- 20260831153709_restrict_notices_to_members.sql에서 회원 전용으로
-- 좁혔지만, 강좌별 공지는 그 강좌의 수강생/담당 강사·조교로 범위를
-- 좁혀야 하는데 빠져 있었다.
--
-- course_teachers는 RLS 정책이 없는(서비스롤 전용) 테이블이라 일반 권한
-- 세션에서는 subquery로 직접 조회할 수 없다 -
-- is_chat_room_participant()(20260904090000_add_chat_rooms.sql)와 동일한
-- 이유로 SECURITY DEFINER 함수로 우회한다.
create or replace function public.is_course_member(target_course_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if exists (
    select 1 from public.enrollments
    where course_id = target_course_id and profile_id = auth.uid()
  ) then
    return true;
  end if;

  return exists (
    select 1 from public.course_teachers
    where course_id = target_course_id and profile_id = auth.uid()
  );
end;
$$;

drop policy if exists "course_notices_select_authenticated" on public.course_notices;

create policy "course_notices_select_member" on public.course_notices
  for select using (public.is_course_member(course_id));
