-- 공개 대상(visibility: 전체/일부 공개/일부 비공개)과는 별개로, 강좌
-- 관리 화면에서 특정 차시를 학생 전원에게 임시로 숨길 수 있는 스위치.
-- 기본값은 공개(false)다.
alter table public.lessons add column if not exists is_hidden boolean not null default false;

-- 앱 코드(canWatchLesson/filterWatchableLessons)에서는 이미 걸러내지만,
-- 학생 세션이 Supabase REST API를 직접 호출해 lessons를 조회하는 경로도
-- 있어(예: 나의 강의실 페이지, /watch 페이지) DB 레벨에서도 숨김 차시를
-- 걸러야 한다. 다만 이 강좌를 관리하는 강사/조교는 미리보기를 위해
-- 숨김 여부와 무관하게 조회할 수 있어야 한다 - is_chat_room_participant와
-- 동일한 이유로 SECURITY DEFINER 함수로 course_teachers를 확인한다.
--
-- 이 함수가 없던 그동안은 /watch 페이지의 "강사 미리보기" 기능이, 정작
-- 그 강좌에 학생으로 등록돼있지 않은 강사/조교에게는 RLS가 lessons 조회
-- 자체를 막아 항상 404가 떴다 - 여기서 같이 고친다.
create or replace function public.is_course_staff(target_course_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1 from public.course_teachers
    where course_id = target_course_id and profile_id = auth.uid()
  );
end;
$$;

drop policy if exists "lessons_select_enrolled" on public.lessons;

create policy "lessons_select_member" on public.lessons
  for select using (
    public.is_course_staff(course_id)
    or (
      not is_hidden
      and exists (
        select 1 from public.enrollments
        where enrollments.course_id = lessons.course_id
          and enrollments.profile_id = auth.uid()
      )
    )
  );
