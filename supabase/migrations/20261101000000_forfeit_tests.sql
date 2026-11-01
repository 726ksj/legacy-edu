-- 시험 도중 앱을 나가거나 닫으면 그 상태 그대로 제출한다.
--   - 이미 확정한 답은 그대로 두고, 아직 풀지 않은 문제는 오답으로 처리해 회차를 끝낸다.
--   - 점수·종합 점수·성적 리포트는 정상 제출과 같은 규칙으로 계산한다(2차 시험이면 종합 점수 기록).
--   - 풀지 않은 문제는 단어 오답노트에는 쌓지 않는다(풀어서 틀린 것만 쌓인다).
--   - 끝난 회차에서는 풀지 않은 문제의 정답도 결과 화면에 보여 준다.
--   - 이미 끝났거나 시작하지 않은 회차에 불러도 아무 일도 하지 않는다(여러 번 불러도 안전).


-- 단어: 풀던 응시를 그 상태로 제출한다.
create or replace function public.forfeit_vocab_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.vocab_test_attempts%rowtype;
  v_correct integer;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_attempt
  from public.vocab_test_attempts
  where id = p_attempt_id and profile_id = v_uid
  for update;
  if not found then
    raise exception 'attempt not found';
  end if;

  if v_attempt.status <> 'in_progress' then
    return jsonb_build_object('forfeited', false);
  end if;

  update public.vocab_test_questions
  set is_correct = false, answered_at = now()
  where attempt_id = p_attempt_id and selected_index is null;

  select count(*) into v_correct
  from public.vocab_test_questions
  where attempt_id = p_attempt_id and is_correct;

  update public.vocab_test_attempts
  set status = 'completed',
      completed_at = now(),
      correct_count = v_correct,
      score = round(v_correct * 100.0 / total_count, 1)
  where id = p_attempt_id;

  if v_attempt.round_no = 3 then
    perform public.vocab_record_final_result(p_attempt_id);
  end if;

  return jsonb_build_object('forfeited', true);
end;
$$;

revoke all on function public.forfeit_vocab_attempt(uuid) from public;
grant execute on function public.forfeit_vocab_attempt(uuid) to authenticated;

-- 끝난 응시에서는 풀지 않은(이탈로 제출된) 문제의 정답과 예시 문장도 내려 준다.
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
          'correct_index', case when q.selected_index is not null or a.status = 'completed' then q.correct_index end,
          'example', case when q.selected_index is not null or a.status = 'completed' then w.example end,
          'example_meaning', case when q.selected_index is not null or a.status = 'completed' then w.example_meaning end
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

-- 순서 배열: 풀던 회차를 그 상태로 제출한다(아직 열지 않은 문제도 오답 기록을 만든다).
create or replace function public.forfeit_order_round(p_set_id uuid, p_round smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q uuid;
  v_done boolean;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if not exists (
    select 1 from public.order_sets s
    where s.id = p_set_id and not s.is_hidden and public.is_course_member(s.course_id)
  ) then
    raise exception 'set not available';
  end if;

  if public.order_round_state(v_uid, p_set_id, p_round) <> 'in_progress' then
    return jsonb_build_object('forfeited', false);
  end if;

  for v_q in select public.order_round_members(v_uid, p_set_id, p_round) loop
    if not exists (
      select 1 from public.order_attempts a
      where a.profile_id = v_uid and a.question_id = v_q and a.round_no = p_round
        and a.answered_at is not null
    ) then
      perform public.start_order_attempt(v_q, p_round);
      update public.order_attempts a
      set is_correct = false, answered_at = now()
      where a.profile_id = v_uid and a.question_id = v_q and a.round_no = p_round;
    end if;
  end loop;

  v_done := public.order_after_answer(v_uid, p_set_id, p_round);
  return jsonb_build_object('forfeited', true, 'round_completed', v_done);
end;
$$;

revoke all on function public.forfeit_order_round(uuid, smallint) from public;
grant execute on function public.forfeit_order_round(uuid, smallint) to authenticated;

-- 문장 배열: 풀던 회차를 그 상태로 제출한다(아직 열지 않은 문제도 오답 기록을 만든다).
create or replace function public.forfeit_sentence_round(p_set_id uuid, p_round smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q uuid;
  v_done boolean;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if not exists (
    select 1 from public.sentence_sets s
    where s.id = p_set_id and not s.is_hidden and public.is_course_member(s.course_id)
  ) then
    raise exception 'set not available';
  end if;

  if public.sentence_round_state(v_uid, p_set_id, p_round) <> 'in_progress' then
    return jsonb_build_object('forfeited', false);
  end if;

  for v_q in select public.sentence_round_members(v_uid, p_set_id, p_round) loop
    if not exists (
      select 1 from public.sentence_attempts a
      where a.profile_id = v_uid and a.question_id = v_q and a.round_no = p_round
        and a.answered_at is not null
    ) then
      perform public.start_sentence_attempt(v_q, p_round);
      update public.sentence_attempts a
      set is_correct = false, answered_at = now()
      where a.profile_id = v_uid and a.question_id = v_q and a.round_no = p_round;
    end if;
  end loop;

  v_done := public.sentence_after_answer(v_uid, p_set_id, p_round);
  return jsonb_build_object('forfeited', true, 'round_completed', v_done);
end;
$$;

revoke all on function public.forfeit_sentence_round(uuid, smallint) from public;
grant execute on function public.forfeit_sentence_round(uuid, smallint) to authenticated;

-- 어순 배열: 풀던 회차를 그 상태로 제출한다(아직 열지 않은 문제도 오답 기록을 만든다).
create or replace function public.forfeit_writing_round(p_set_id uuid, p_round smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q uuid;
  v_done boolean;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if not exists (
    select 1 from public.writing_sets s
    where s.id = p_set_id and not s.is_hidden and public.is_course_member(s.course_id)
  ) then
    raise exception 'set not available';
  end if;

  if public.writing_round_state(v_uid, p_set_id, p_round) <> 'in_progress' then
    return jsonb_build_object('forfeited', false);
  end if;

  for v_q in select public.writing_round_members(v_uid, p_set_id, p_round) loop
    if not exists (
      select 1 from public.writing_attempts a
      where a.profile_id = v_uid and a.sentence_id = v_q and a.round_no = p_round and a.attempt_no = 1
        and a.submitted_at is not null
    ) then
      perform public.start_writing_attempt(v_q, p_round);
      update public.writing_attempts a
      set is_correct = false, submitted_at = now()
      where a.profile_id = v_uid and a.sentence_id = v_q and a.round_no = p_round and a.attempt_no = 1;
    end if;
  end loop;

  v_done := public.writing_after_answer(v_uid, p_set_id, p_round);
  return jsonb_build_object('forfeited', true, 'round_completed', v_done);
end;
$$;

revoke all on function public.forfeit_writing_round(uuid, smallint) from public;
grant execute on function public.forfeit_writing_round(uuid, smallint) to authenticated;
