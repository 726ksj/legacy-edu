-- 이전 마이그레이션의 RLS 정책은 questions에 대한 정책 안에서 다시
-- questions를 서브쿼리로 조회했는데, 그 서브쿼리도 같은 정책의 적용을
-- 받아서 무한 재귀(infinite recursion detected in policy)가 발생했다.
-- SECURITY DEFINER 함수로 내부 조회를 RLS 밖에서 실행하도록 우회한다.

create or replace function public.is_own_question_thread(thread_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.questions
    where id = thread_id and profile_id = auth.uid()
  );
$$;

drop policy if exists "questions_select_own_thread" on public.questions;
create policy "questions_select_own_thread" on public.questions
  for select using (
    auth.uid() = profile_id
    or public.is_own_question_thread(parent_id)
  );

drop policy if exists "questions_insert_own_thread" on public.questions;
create policy "questions_insert_own_thread" on public.questions
  for insert with check (
    auth.uid() = profile_id
    and (parent_id is null or public.is_own_question_thread(parent_id))
  );
