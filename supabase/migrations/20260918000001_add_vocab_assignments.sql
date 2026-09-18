-- 단어장을 "강좌 단위"(기본) 또는 "학생 개인 단위"(집중 관리)로 배정한다.
-- 강좌 단위로 배정해두면 이후 그 강좌에 새로 등록하는 학생도 별도 작업
-- 없이 자동으로 포함된다(등록 시점에 행을 미리 만들어두지 않고, 조회 시
-- enrollments를 조인해서 판단하기 때문). course_id/profile_id 중 정확히
-- 하나만 채운다.
--
-- 배정 등록/수정은 기존 course_teachers/teacher_codes와 동일하게 관리자
-- 서버 액션(서비스롤)에서만 하므로, 이 테이블에는 select 정책만 둔다.

create table public.vocab_assignments (
  id uuid primary key default gen_random_uuid(),
  vocab_set_id uuid not null references public.vocab_sets(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  constraint vocab_assignments_target_check check (
    (course_id is not null and profile_id is null)
    or (course_id is null and profile_id is not null)
  )
);

create unique index vocab_assignments_course_uidx
  on public.vocab_assignments (vocab_set_id, course_id)
  where course_id is not null;

create unique index vocab_assignments_profile_uidx
  on public.vocab_assignments (vocab_set_id, profile_id)
  where profile_id is not null;

alter table public.vocab_assignments enable row level security;

create policy "vocab_assignments_select_member" on public.vocab_assignments
  for select using (
    profile_id = auth.uid()
    or (course_id is not null and public.is_course_member(course_id))
  );

-- 현재 로그인한 사용자가 해당 단어장을 볼 수 있는지(강좌 배정 또는 개인
-- 배정) 판정한다. vocab_assignments/course_teachers가 RLS로 잠겨 있어
-- 일반 세션에서는 서브쿼리로 직접 조회할 수 없으므로, 기존
-- is_course_member()와 동일한 이유로 SECURITY DEFINER 함수로 우회한다.
-- plpgsql로 작성해 플래너가 inline하지 않도록 한다
-- (20260903140000_fix_question_thread_rls_recursion_v2.sql 참고).
create or replace function public.is_vocab_set_assigned(target_vocab_set_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1
    from public.vocab_assignments va
    where va.vocab_set_id = target_vocab_set_id
      and (
        va.profile_id = auth.uid()
        or (va.course_id is not null and public.is_course_member(va.course_id))
      )
  );
end;
$$;

create policy "vocab_sets_select_visible" on public.vocab_sets
  for select using (
    created_by = auth.uid()
    or public.is_vocab_set_assigned(id)
  );

create policy "vocab_words_select_visible" on public.vocab_words
  for select using (
    exists (
      select 1 from public.vocab_sets vs
      where vs.id = vocab_words.vocab_set_id
        and (vs.created_by = auth.uid() or public.is_vocab_set_assigned(vs.id))
    )
  );
