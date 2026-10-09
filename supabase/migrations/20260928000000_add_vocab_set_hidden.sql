-- 단어장을 학생에게 임시로 숨기는 스위치(영상의 lessons.is_hidden과 같은 개념).
-- 배정(vocab_assignments)과 단어는 그대로 두고 플래그만 바꾸므로, 다시
-- 공개하면 이전 상태 그대로 돌아온다. 이미 응시한 결과도 남는다.

alter table public.vocab_sets
  add column if not exists is_hidden boolean not null default false;

-- 학생 열람/테스트 제출 판정의 단일 지점인 is_vocab_set_assigned()에서 숨긴
-- 단어장을 거른다. 이 함수를 쓰는 vocab_sets/vocab_words 조회 정책과
-- submit_vocab_test_result() 모두 숨긴 단어장을 거부하게 된다. (만든 강사
-- 본인은 정책의 created_by 조건으로 숨긴 단어장도 계속 본다.)
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
    join public.vocab_sets vs on vs.id = va.vocab_set_id
    where va.vocab_set_id = target_vocab_set_id
      and not vs.is_hidden
      and (
        va.profile_id = auth.uid()
        or (va.course_id is not null and public.is_course_member(va.course_id))
      )
  );
end;
$$;
