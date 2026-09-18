-- Expo 앱은 이 프로젝트에 서버 액션이 없어 Supabase에 직접 접속하는데,
-- score_reports는 클라이언트 insert 정책이 없다(관리자 엑셀 업로드로만
-- 채워지는 구조). 그래서 학생이 테스트를 제출하면 vocab_test_results와
-- score_reports 요약 행을 한 번에 SECURITY DEFINER 함수로 기록해서, RLS를
-- 우회하되 auth.uid() 범위 밖의 데이터는 절대 건드리지 못하게 좁힌다.

create or replace function public.submit_vocab_test_result(
  p_vocab_set_id uuid,
  p_score numeric,
  p_total_count integer,
  p_correct_count integer,
  p_wrong_words jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result_id uuid;
  v_set_title text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not public.is_vocab_set_assigned(p_vocab_set_id) then
    raise exception 'vocab set % is not assigned to current user', p_vocab_set_id;
  end if;

  select title into v_set_title
  from public.vocab_sets
  where id = p_vocab_set_id;

  insert into public.vocab_test_results
    (profile_id, vocab_set_id, score, total_count, correct_count, wrong_words)
  values
    (auth.uid(), p_vocab_set_id, p_score, p_total_count, p_correct_count, p_wrong_words)
  returning id into v_result_id;

  insert into public.score_reports
    (profile_id, report_type, title, score, exam_date, extra_data)
  values
    (
      auth.uid(),
      'vocab_test',
      coalesce(v_set_title, '단어 테스트'),
      p_score::text,
      current_date,
      jsonb_build_object('total_count', p_total_count, 'correct_count', p_correct_count)
    );

  return v_result_id;
end;
$$;
