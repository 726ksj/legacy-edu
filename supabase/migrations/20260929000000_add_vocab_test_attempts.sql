-- 앱 단어 테스트(응시) 흐름. 문제 출제와 정답 판정을 서버(DB 함수)에서 하고,
-- 앱은 보기만 받는다. 정답 위치(correct_index)는 학생이 그 문항에 답한
-- 뒤에만 돌려주므로 네트워크를 들여다봐도 미리 알 수 없고, 재접속해도 같은
-- 문항 순서와 보기가 유지된다(저장된 문항을 그대로 읽는다).
--
-- 회차 규칙(범위: 1~3회, 4·5회는 round_no 5까지 자리를 열어 둠):
--   1회: 단어장에서 랜덤 30개(30개 미만이면 전부)
--   2회: 1회에서 틀린 것만(0개면 생략)
--   3회: 다시 랜덤 30개
-- 각 회차는 학생·단어장당 한 번만 있다. 3회가 끝나면 점수(1회, 최종, 종합
-- 40:60)를 vocab_test_results와 score_reports에 기록한다.
-- 객관식 보기는 같은 단어장의 다른 단어들의 뜻에서 만든다(정답 + 오답 3개).

create table public.vocab_test_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  vocab_set_id uuid not null references public.vocab_sets(id) on delete cascade,
  round_no smallint not null check (round_no between 1 and 5),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  total_count integer not null check (total_count > 0),
  correct_count integer,
  score numeric,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (profile_id, vocab_set_id, round_no)
);

create index vocab_test_attempts_profile_set_idx
  on public.vocab_test_attempts (profile_id, vocab_set_id);

alter table public.vocab_test_attempts enable row level security;

create policy "vocab_test_attempts_select_own" on public.vocab_test_attempts
  for select using (profile_id = auth.uid());

-- 문항(정답 위치 포함)은 RLS 정책을 두지 않아 학생이 직접 읽지 못하고,
-- 아래 SECURITY DEFINER 함수를 통해서만 접근한다.
create table public.vocab_test_questions (
  attempt_id uuid not null references public.vocab_test_attempts(id) on delete cascade,
  position integer not null,
  word_id uuid not null references public.vocab_words(id) on delete cascade,
  choices jsonb not null,
  correct_index smallint not null,
  selected_index smallint,
  is_correct boolean,
  answered_at timestamptz,
  primary key (attempt_id, position)
);

alter table public.vocab_test_questions enable row level security;

-- ---------------------------------------------------------------------
-- 내부 함수: 다음에 응시할 회차. 더 볼 회차가 없으면 null.
-- ---------------------------------------------------------------------
create or replace function public.vocab_next_round(p_uid uuid, p_set uuid)
returns smallint
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_wrong1 integer;
begin
  if not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set
      and round_no = 1 and status = 'completed'
  ) then
    return 1;
  end if;

  select count(*) into v_wrong1
  from public.vocab_test_questions q
  join public.vocab_test_attempts a on a.id = q.attempt_id
  where a.profile_id = p_uid and a.vocab_set_id = p_set
    and a.round_no = 1 and q.is_correct = false;

  if v_wrong1 > 0 and not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and round_no = 2
  ) then
    return 2;
  end if;

  if not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and round_no = 3
  ) then
    return 3;
  end if;

  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 내부 함수: 3회가 끝났을 때 종합 점수를 성적 리포트에 기록한다.
-- ---------------------------------------------------------------------
create or replace function public.vocab_record_final_result(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.vocab_test_attempts%rowtype;
  v_first numeric;
  v_total numeric;
  v_title text;
  v_wrong jsonb;
begin
  select * into v_attempt from public.vocab_test_attempts where id = p_attempt_id;

  select score into v_first
  from public.vocab_test_attempts
  where profile_id = v_attempt.profile_id
    and vocab_set_id = v_attempt.vocab_set_id and round_no = 1;

  -- 종합 점수 = 1회 × 40% + 최종(마지막 회차) × 60% (반올림)
  v_total := round(coalesce(v_first, 0) * 0.4 + v_attempt.score * 0.6);

  select title into v_title from public.vocab_sets where id = v_attempt.vocab_set_id;

  select coalesce(jsonb_agg(
    jsonb_build_object('word', w.word, 'meaning', w.meaning)
    order by q.position
  ), '[]'::jsonb) into v_wrong
  from public.vocab_test_questions q
  join public.vocab_words w on w.id = q.word_id
  where q.attempt_id = p_attempt_id and q.is_correct = false;

  insert into public.vocab_test_results
    (profile_id, vocab_set_id, score, total_count, correct_count, wrong_words)
  values
    (v_attempt.profile_id, v_attempt.vocab_set_id, v_total,
     v_attempt.total_count, v_attempt.correct_count, v_wrong);

  insert into public.score_reports
    (profile_id, report_type, title, score, exam_date, extra_data)
  values
    (v_attempt.profile_id, 'vocab_test', coalesce(v_title, '단어 테스트'),
     v_total::text, current_date,
     jsonb_build_object(
       'first_try', v_first,
       'final', v_attempt.score,
       'total', v_total,
       'total_count', v_attempt.total_count,
       'correct_count', v_attempt.correct_count
     ));
end;
$$;

-- ---------------------------------------------------------------------
-- 응시 시작(또는 진행 중인 응시 이어하기). 시도 id를 돌려준다.
-- ---------------------------------------------------------------------
create or replace function public.start_vocab_attempt(p_vocab_set_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt_id uuid;
  v_round smallint;
  v_word_ids uuid[];
  v_word_id uuid;
  v_position integer;
  v_correct text;
  v_choices text[];
  v_correct_index integer;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if not public.is_vocab_set_assigned(p_vocab_set_id) then
    raise exception 'vocab set % is not assigned to current user', p_vocab_set_id;
  end if;

  -- 진행 중인 응시가 있으면 새로 만들지 않고 이어서 푼다(같은 문항/보기).
  select id into v_attempt_id
  from public.vocab_test_attempts
  where profile_id = v_uid and vocab_set_id = p_vocab_set_id
    and status = 'in_progress';
  if found then
    return v_attempt_id;
  end if;

  if (
    select count(distinct lower(btrim(meaning)))
    from public.vocab_words where vocab_set_id = p_vocab_set_id
  ) < 4 then
    raise exception 'vocab set needs at least 4 distinct meanings';
  end if;

  v_round := public.vocab_next_round(v_uid, p_vocab_set_id);
  if v_round is null then
    raise exception 'no further round';
  end if;

  if v_round = 2 then
    -- 1회에서 틀린 단어만 (순서는 섞는다)
    select array_agg(word_id) into v_word_ids
    from (
      select q.word_id
      from public.vocab_test_questions q
      join public.vocab_test_attempts a on a.id = q.attempt_id
      where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
        and a.round_no = 1 and q.is_correct = false
      order by random()
    ) t;
  else
    -- 1·3회: 단어장에서 랜덤 30개
    select array_agg(id) into v_word_ids
    from (
      select id from public.vocab_words
      where vocab_set_id = p_vocab_set_id
      order by random()
      limit 30
    ) t;
  end if;

  if v_word_ids is null or array_length(v_word_ids, 1) is null then
    raise exception 'no words to test';
  end if;

  insert into public.vocab_test_attempts
    (profile_id, vocab_set_id, round_no, total_count)
  values
    (v_uid, p_vocab_set_id, v_round, array_length(v_word_ids, 1))
  returning id into v_attempt_id;

  v_position := 0;
  foreach v_word_id in array v_word_ids loop
    select btrim(meaning) into v_correct
    from public.vocab_words where id = v_word_id;

    -- 오답 보기: 같은 단어장 다른 단어들의 뜻 중 서로 다르고 정답과도 다른
    -- 것 3개. 정답과 섞어서 순서를 무작위로 만든다.
    select array_agg(c order by random()) into v_choices
    from (
      select v_correct as c
      union all
      (
        select m from (
          select distinct on (lower(btrim(meaning))) btrim(meaning) as m
          from public.vocab_words
          where vocab_set_id = p_vocab_set_id and id <> v_word_id
            and lower(btrim(meaning)) <> lower(v_correct)
          order by lower(btrim(meaning))
        ) d
        order by random()
        limit 3
      )
    ) all_choices;

    v_correct_index := array_position(v_choices, v_correct) - 1;
    v_position := v_position + 1;

    insert into public.vocab_test_questions
      (attempt_id, position, word_id, choices, correct_index)
    values
      (v_attempt_id, v_position, v_word_id, to_jsonb(v_choices), v_correct_index);
  end loop;

  return v_attempt_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 응시 내용 조회. 정답 위치/예시 문장은 답한 문항에만 담아 준다.
-- ---------------------------------------------------------------------
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
          'example', case when q.selected_index is not null then w.example end
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

-- ---------------------------------------------------------------------
-- 답안 제출. 한 번 확정한 답은 바꿀 수 없고, 같은 문항을 다시 보내면 저장된
-- 결과를 그대로 돌려준다(중복 요청에도 기록은 1건).
-- 마지막 문항이면 회차를 완료하고, 3회라면 종합 점수를 리포트에 기록한다.
-- ---------------------------------------------------------------------
create or replace function public.answer_vocab_question(
  p_attempt_id uuid,
  p_position integer,
  p_selected_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.vocab_test_attempts%rowtype;
  v_q public.vocab_test_questions%rowtype;
  v_correct_count integer;
  v_finished boolean := false;
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

  select * into v_q
  from public.vocab_test_questions
  where attempt_id = p_attempt_id and position = p_position
  for update;
  if not found then
    raise exception 'question not found';
  end if;

  if v_q.selected_index is not null then
    return jsonb_build_object(
      'is_correct', v_q.is_correct,
      'correct_index', v_q.correct_index,
      'finished', v_attempt.status = 'completed'
    );
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'attempt already completed';
  end if;
  if p_selected_index is null
     or p_selected_index < 0
     or p_selected_index >= jsonb_array_length(v_q.choices) then
    raise exception 'invalid choice';
  end if;

  update public.vocab_test_questions
  set selected_index = p_selected_index,
      is_correct = (p_selected_index = v_q.correct_index),
      answered_at = now()
  where attempt_id = p_attempt_id and position = p_position;

  if not exists (
    select 1 from public.vocab_test_questions
    where attempt_id = p_attempt_id and selected_index is null
  ) then
    select count(*) into v_correct_count
    from public.vocab_test_questions
    where attempt_id = p_attempt_id and is_correct;

    update public.vocab_test_attempts
    set status = 'completed',
        completed_at = now(),
        correct_count = v_correct_count,
        score = round(v_correct_count * 100.0 / total_count, 1)
    where id = p_attempt_id;

    if v_attempt.round_no = 3 then
      perform public.vocab_record_final_result(p_attempt_id);
    end if;
    v_finished := true;
  end if;

  return jsonb_build_object(
    'is_correct', p_selected_index = v_q.correct_index,
    'correct_index', v_q.correct_index,
    'finished', v_finished
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 단어장별 응시 현황: 회차별 결과, 이어 풀 응시, 다음 회차, 점수.
-- ---------------------------------------------------------------------
create or replace function public.get_vocab_test_status(p_vocab_set_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_first numeric;
  v_final numeric;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if not public.is_vocab_set_assigned(p_vocab_set_id) then
    raise exception 'vocab set % is not assigned to current user', p_vocab_set_id;
  end if;

  select score into v_first from public.vocab_test_attempts
  where profile_id = v_uid and vocab_set_id = p_vocab_set_id
    and round_no = 1 and status = 'completed';
  select score into v_final from public.vocab_test_attempts
  where profile_id = v_uid and vocab_set_id = p_vocab_set_id
    and round_no = 3 and status = 'completed';

  return jsonb_build_object(
    'rounds', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'attempt_id', a.id,
          'round_no', a.round_no,
          'status', a.status,
          'total_count', a.total_count,
          'correct_count', a.correct_count,
          'score', a.score
        )
        order by a.round_no
      )
      from public.vocab_test_attempts a
      where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
    ), '[]'::jsonb),
    'next_round', public.vocab_next_round(v_uid, p_vocab_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

-- 내부 함수는 앱에서 호출하지 못하게 막고, 앱용 함수만 로그인 사용자에게 연다.
revoke all on function public.vocab_next_round(uuid, uuid) from public;
revoke all on function public.vocab_record_final_result(uuid) from public;
revoke all on function public.start_vocab_attempt(uuid) from public;
revoke all on function public.get_vocab_attempt(uuid) from public;
revoke all on function public.answer_vocab_question(uuid, integer, integer) from public;
revoke all on function public.get_vocab_test_status(uuid) from public;

grant execute on function public.start_vocab_attempt(uuid) to authenticated;
grant execute on function public.get_vocab_attempt(uuid) to authenticated;
grant execute on function public.answer_vocab_question(uuid, integer, integer) to authenticated;
grant execute on function public.get_vocab_test_status(uuid) to authenticated;
