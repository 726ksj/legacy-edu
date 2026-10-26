-- 단어 시험 문항에 예시 문장 뜻(vocab_words.example_meaning)을 함께 내려 준다.
-- 예시 문장과 마찬가지로 답한 문항에만 담아 준다(정답을 미리 알려 주지 않기 위해).
create or replace function public.get_vocab_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select jsonb_build_object(
    'id', a.id,
    'vocab_set_id', a.vocab_set_id,
    'round_no', a.round_no,
    'status', a.status,
    'total_count', a.total_count,
    'correct_count', a.correct_count,
    'score', a.score,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', q.position,
          'word', w.word,
          'choices', q.choices,
          'selected_index', q.selected_index,
          'is_correct', q.is_correct,
          'correct_index', case when q.selected_index is not null then q.correct_index end,
          'example', case when q.selected_index is not null then w.example end,
          'example_meaning', case when q.selected_index is not null then w.example_meaning end
        )
        order by q.position
      )
      from public.vocab_test_questions q
      join public.vocab_words w on w.id = q.word_id
      where q.attempt_id = a.id
    ), '[]'::jsonb)
  ) into v_result
  from public.vocab_test_attempts a
  where a.id = p_attempt_id and a.profile_id = v_uid;

  if v_result is null then
    raise exception 'attempt not found';
  end if;
  return v_result;
end;
$$;
