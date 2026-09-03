-- 이전 수정(SECURITY DEFINER 함수)에도 재귀 오류가 남아있었다. 원인은
-- is_own_question_thread가 순수 SQL 언어 함수라서, 플래너가 함수 본문을
-- 호출부에 그대로 inline시켜버릴 수 있다는 점이다 - inline되면 SECURITY
-- DEFINER 경계가 사라지고, 내부 조회가 다시 호출자 권한(=같은 RLS
-- 정책)으로 평가되면서 재귀가 재현된다. plpgsql로 바꾸면 플래너가 절대
-- inline하지 않아 SECURITY DEFINER가 항상 그대로 적용된다.

create or replace function public.is_own_question_thread(thread_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1 from public.questions
    where id = thread_id and profile_id = auth.uid()
  );
end;
$$;
