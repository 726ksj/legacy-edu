-- 학생이 단어 테스트를 볼 때마다 쌓이는 상세 결과. 요약 점수는
-- submit_vocab_test_result() 함수가 score_reports에도 함께 기록해서
-- 마이페이지 > 성적 리포트 > 단어 테스트 화면에 그대로 노출되게 한다.
--
-- score_reports와 마찬가지로(baseline의 "학생은 자신의 리포트만 조회
-- 가능" 정책 참고) insert 정책은 두지 않는다. 클라이언트가 직접 쓰지
-- 못하게 막고, 다음 마이그레이션의 SECURITY DEFINER 함수를 통해서만
-- 기록되게 해서 점수 조작을 막는다.

create table public.vocab_test_results (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  vocab_set_id uuid not null references public.vocab_sets(id) on delete cascade,
  score numeric not null,
  total_count integer not null,
  correct_count integer not null check (correct_count >= 0 and correct_count <= total_count),
  wrong_words jsonb not null default '[]'::jsonb,
  tested_at timestamptz not null default now()
);

alter table public.vocab_test_results enable row level security;

create policy "vocab_test_results_select_own" on public.vocab_test_results
  for select using (profile_id = auth.uid());
