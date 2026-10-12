-- 화면 변경 사항 반영:
--  1) 단어 시험 이름/규칙 정리: 1차 시험 → 1차 재시험 → 2차 시험 → 2차 재시험 →
--     3차 재시험(= 앞선 시험들에서 "두 번 이상 틀린" 단어만). 최소 2번(1차·2차
--     시험), 최대 5번 응시한다. 주차 종합 점수는 1차 시험 × 0.4 + 2차 시험 × 0.6.
--  2) 지각 응시: 강좌 시작일 기준으로 "지난 주차"의 시험을 처음 시작하면 그
--     시도에 is_late를 남긴다. 점수 반영 방식은 미정이라, 지각 응시는 시도
--     기록(점수 포함)만 남기고 성적 리포트/학습 결과에는 기록하지 않는다
--     (방식이 정해지면 시도 기록으로 되살릴 수 있다).
--  3) 이번 주 할 일: 강좌별 현재 주차의 시험과 지난 주차의 미완료 시험 목록.
-- 강좌 시작일이 없으면 현재 주차를 알 수 없어 지각 판정도 하지 않는다.

alter table public.vocab_test_attempts
  add column if not exists is_late boolean not null default false;
alter table public.writing_attempts
  add column if not exists is_late boolean not null default false;

-- 강좌 시작일 기준 현재 주차(KST). 시작일이 없으면 null, 시작 전이면 0 이하.
create or replace function public.course_current_week(p_course uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when c.start_date is null then null
    else floor(((now() at time zone 'Asia/Seoul')::date - c.start_date) / 7.0)::int + 1 end
  from public.courses c where c.id = p_course
$$;

-- 지난 주차(= 현재 주차보다 앞선 주차)인지. 주차나 시작일이 없으면 false.
create or replace function public.week_is_late(p_course uuid, p_week smallint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_week is not null and public.course_current_week(p_course) is not null
    and p_week < public.course_current_week(p_course), false)
$$;

create or replace function public.vocab_set_is_late(p_set uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_or(public.week_is_late(va.course_id, vs.week)), false)
  from public.vocab_assignments va
  join public.vocab_sets vs on vs.id = va.vocab_set_id
  where va.vocab_set_id = p_set and va.course_id is not null
    and public.is_course_member(va.course_id)
$$;

create or replace function public.writing_set_is_late(p_set uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.week_is_late(ws.course_id, ws.week), false)
  from public.writing_sets ws where ws.id = p_set
$$;

-- ---------------------------------------------------------------------
-- 다음 응시 회차(round_no 1~5). 더 볼 회차가 없으면 null.
--   1 = 1차 시험, 2 = 1차 재시험, 3 = 2차 시험, 4 = 2차 재시험,
--   5 = 3차 재시험(1~4번째 응시에서 두 번 이상 틀린 단어가 있을 때)
-- ---------------------------------------------------------------------
create or replace function public.vocab_next_round(p_uid uuid, p_set uuid)
returns smallint
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_wrong integer;
begin
  -- 진행 중인 응시가 있으면 새 회차는 없다(그 응시를 이어서 푼다).
  if exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and status = 'in_progress'
  ) then
    return null;
  end if;

  -- 1차 시험
  if not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set
      and round_no = 1 and status = 'completed'
  ) then
    return 1;
  end if;

  -- 1차 재시험: 1차 시험 오답이 있을 때만
  select count(*) into v_wrong
  from public.vocab_test_questions q
  join public.vocab_test_attempts a on a.id = q.attempt_id
  where a.profile_id = p_uid and a.vocab_set_id = p_set
    and a.round_no = 1 and q.is_correct = false;
  if v_wrong > 0 and not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and round_no = 2
  ) then
    return 2;
  end if;

  -- 2차 시험
  if not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and round_no = 3
  ) then
    return 3;
  end if;

  -- 2차 재시험: 2차 시험 오답이 있을 때만
  select count(*) into v_wrong
  from public.vocab_test_questions q
  join public.vocab_test_attempts a on a.id = q.attempt_id
  where a.profile_id = p_uid and a.vocab_set_id = p_set
    and a.round_no = 3 and q.is_correct = false;
  if v_wrong > 0 and not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and round_no = 4
  ) then
    return 4;
  end if;

  -- 3차 재시험: 앞선 응시(1~4번째)에서 두 번 이상 틀린 단어가 있을 때만
  select count(*) into v_wrong from (
    select q.word_id
    from public.vocab_test_questions q
    join public.vocab_test_attempts a on a.id = q.attempt_id
    where a.profile_id = p_uid and a.vocab_set_id = p_set
      and a.round_no between 1 and 4 and a.status = 'completed'
      and q.is_correct = false
    group by q.word_id
    having count(*) >= 2
  ) t;
  if v_wrong > 0 and not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and round_no = 5
  ) then
    return 5;
  end if;

  return null;
end;
$$;

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
  v_pool uuid[];
  v_source_round smallint;
  v_pool_round smallint;
  v_late boolean;
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

  -- 재시험 회차(2·4·5)는 직전 회차의 틀린 단어만 출제한다:
  --   2(1차 재시험) = 1차 시험 오답, 4(2차 재시험) = 2차 시험 오답,
  --   5(3차 재시험) = 1~4번째 응시에서 두 번 이상 틀린 단어
  v_source_round := case v_round when 2 then 1 when 4 then 3 else null end;

  if v_round = 5 then
    select array_agg(word_id) into v_word_ids
    from (
      select q.word_id
      from public.vocab_test_questions q
      join public.vocab_test_attempts a on a.id = q.attempt_id
      where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
        and a.round_no between 1 and 4 and a.status = 'completed'
        and q.is_correct = false
      group by q.word_id
      having count(*) >= 2
      order by random()
    ) t;
  elsif v_source_round is not null then
    select array_agg(word_id) into v_word_ids
    from (
      select q.word_id
      from public.vocab_test_questions q
      join public.vocab_test_attempts a on a.id = q.attempt_id
      where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
        and a.round_no = v_source_round and q.is_correct = false
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

  -- 오답 보기를 가져올 단어 범위. 1·3회는 그 회차의 30개, 재시험은 원래
  -- 전체 단어에서 가져온다(2회 = 1회의 30개, 4·5회 = 3회의 30개). 틀린
  -- 단어가 4개 미만이어도 보기가 모자라지 않게 하기 위해서다.
  v_pool_round := case v_round when 2 then 1 when 4 then 3 else null end;

  if v_round = 5 then
    -- 3차 재시험: 1차·2차 시험에 나온 단어 전체에서 보기를 만든다.
    select array_agg(q.word_id) into v_pool
    from public.vocab_test_questions q
    join public.vocab_test_attempts a on a.id = q.attempt_id
    where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
      and a.round_no in (1, 3);
  elsif v_pool_round is not null then
    select array_agg(q.word_id) into v_pool
    from public.vocab_test_questions q
    join public.vocab_test_attempts a on a.id = q.attempt_id
    where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
      and a.round_no = v_pool_round;
  else
    v_pool := v_word_ids;
  end if;

  -- 지각 응시 여부는 첫 시험을 시작한 시점으로 정해 같은 단어장의 이후 응시에
  -- 그대로 이어진다.
  v_late := coalesce(
    (select a.is_late from public.vocab_test_attempts a
     where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id and a.round_no = 1),
    public.vocab_set_is_late(p_vocab_set_id)
  );

  insert into public.vocab_test_attempts
    (profile_id, vocab_set_id, round_no, total_count, is_late)
  values
    (v_uid, p_vocab_set_id, v_round, array_length(v_word_ids, 1), v_late)
  returning id into v_attempt_id;

  v_position := 0;
  foreach v_word_id in array v_word_ids loop
    select btrim(meaning) into v_correct
    from public.vocab_words where id = v_word_id;

    -- 오답 보기: 위 단어 범위(v_pool)의 다른 단어들의 뜻 중 서로 다르고
    -- 정답과도 다른 것 3개를 우선 쓰고, 범위 안에서 모자라면 같은
    -- 단어장의 나머지 단어에서 채운다. 정답과 섞어 순서를 무작위로 만든다.
    select array_agg(c order by random()) into v_choices
    from (
      select v_correct as c
      union all
      (
        select m from (
          select distinct on (key) m, key, in_pool
          from (
            select btrim(meaning) as m,
                   lower(btrim(meaning)) as key,
                   (id = any(v_pool)) as in_pool
            from public.vocab_words
            where vocab_set_id = p_vocab_set_id and id <> v_word_id
              and lower(btrim(meaning)) <> lower(v_correct)
          ) x
          order by key, in_pool desc
        ) d
        order by in_pool desc, random()
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

  -- 지각 응시는 점수 반영 방식이 정해질 때까지 성적/학습 결과에 기록하지 않는다
  -- (시도 기록에는 점수가 그대로 남는다).
  if exists (
    select 1 from public.vocab_test_attempts
    where profile_id = v_attempt.profile_id
      and vocab_set_id = v_attempt.vocab_set_id
      and round_no = 1 and is_late
  ) then
    return;
  end if;

  select score into v_first
  from public.vocab_test_attempts
  where profile_id = v_attempt.profile_id
    and vocab_set_id = v_attempt.vocab_set_id and round_no = 1;

  -- 종합 점수 = 1차 시험 × 40% + 2차 시험 × 60% (반올림)
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
    'is_late', coalesce(
      (select a.is_late from public.vocab_test_attempts a
       where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id and a.round_no = 1),
      public.vocab_set_is_late(p_vocab_set_id)
    ),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

create or replace function public.start_writing_attempt(p_sentence_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sentence public.writing_sentences%rowtype;
  v_set_id uuid;
  v_attempt public.writing_attempts%rowtype;
  v_chunks text[];
  v_n integer;
  v_order integer[];
  v_texts text[];
  v_pieces jsonb;
  v_try integer;
  v_next_no integer;
  v_late boolean;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select s.* into v_sentence
  from public.writing_sentences s
  join public.writing_sets ws on ws.id = s.writing_set_id
  where s.id = p_sentence_id
    and not ws.is_hidden
    and public.is_course_member(ws.course_id);
  if not found then
    raise exception 'sentence not available';
  end if;
  v_set_id := v_sentence.writing_set_id;

  select * into v_attempt
  from public.writing_attempts
  where profile_id = v_uid and sentence_id = p_sentence_id and submitted_at is null
  order by attempt_no desc
  limit 1;

  if not found then
    select array(select jsonb_array_elements_text(v_sentence.chunks)) into v_chunks;
    v_n := coalesce(array_length(v_chunks, 1), 0);
    if v_n < 2 then
      raise exception 'sentence has too few chunks';
    end if;

    -- 정답 순서와 다르게 섞는다(모든 조각이 같은 글자면 어쩔 수 없이 그대로).
    for v_try in 1..10 loop
      select array_agg(i order by random()) into v_order
      from generate_series(1, v_n) i;
      select array_agg(v_chunks[o]) into v_texts from unnest(v_order) o;
      exit when v_texts is distinct from v_chunks;
    end loop;

    select jsonb_agg(jsonb_build_object('id', t.pos, 'text', t.txt) order by t.pos)
    into v_pieces
    from unnest(v_texts) with ordinality as t(txt, pos);

    select coalesce(max(attempt_no), 0) + 1 into v_next_no
    from public.writing_attempts
    where profile_id = v_uid and sentence_id = p_sentence_id;

    -- 지각 응시 여부는 이 세트를 처음 시작한 시점으로 정해 이후 시도에 이어진다.
    v_late := coalesce(
      (select a.is_late from public.writing_attempts a
       where a.profile_id = v_uid and a.writing_set_id = v_set_id
       order by a.started_at limit 1),
      public.writing_set_is_late(v_set_id)
    );

    insert into public.writing_attempts
      (profile_id, sentence_id, writing_set_id, attempt_no, pieces, is_late)
    values
      (v_uid, p_sentence_id, v_set_id, v_next_no, v_pieces, v_late)
    returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'attempt_no', v_attempt.attempt_no,
    'sentence_id', v_sentence.id,
    'order_no', v_sentence.order_no,
    'korean', v_sentence.korean,
    'pieces', v_attempt.pieces,
    'already_completed', coalesce((
      select r.completed from public.writing_sentence_results r
      where r.profile_id = v_uid and r.sentence_id = p_sentence_id
    ), false)
  );
end;
$$;

create or replace function public.submit_writing_attempt(
  p_attempt_id uuid,
  p_piece_ids integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.writing_attempts%rowtype;
  v_sentence public.writing_sentences%rowtype;
  v_chunks text[];
  v_piece_texts text[];
  v_arrangement text[];
  v_n integer;
  v_correct boolean;
  v_accuracy numeric;
  v_result public.writing_sentence_results%rowtype;
  v_was_completed boolean;
  v_attempts_after integer;
  v_points integer := 0;
  v_newly_completed boolean := false;
  v_total integer;
  v_done integer;
  v_set_points integer;
  v_set_completed boolean := false;
  v_set_title text;
  v_first_try integer;
  v_late boolean;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_attempt
  from public.writing_attempts
  where id = p_attempt_id and profile_id = v_uid
  for update;
  if not found then
    raise exception 'attempt not found';
  end if;

  select * into v_sentence from public.writing_sentences where id = v_attempt.sentence_id;
  select array(select jsonb_array_elements_text(v_sentence.chunks)) into v_chunks;
  v_n := array_length(v_chunks, 1);

  if v_attempt.submitted_at is not null then
    return jsonb_build_object(
      'is_correct', v_attempt.is_correct,
      'attempt_no', v_attempt.attempt_no,
      'english', v_sentence.english,
      'korean', v_sentence.korean,
      'chunks', v_sentence.chunks,
      'key_phrases', v_sentence.key_phrases,
      'already_submitted', true
    );
  end if;

  -- 조각 id 검증: 전부 한 번씩, 1..n
  if p_piece_ids is null or coalesce(array_length(p_piece_ids, 1), 0) <> v_n
     or (select count(distinct x) from unnest(p_piece_ids) x) <> v_n
     or exists (select 1 from unnest(p_piece_ids) x where x < 1 or x > v_n) then
    raise exception 'invalid arrangement';
  end if;

  select array_agg(p ->> 'text' order by (p ->> 'id')::int) into v_piece_texts
  from jsonb_array_elements(v_attempt.pieces) p;
  select array_agg(v_piece_texts[x] order by ord) into v_arrangement
  from unnest(p_piece_ids) with ordinality as t(x, ord);

  v_correct := v_arrangement = v_chunks;
  v_accuracy := round(public.writing_lcs_length(v_chunks, v_arrangement)::numeric / v_n, 3);

  -- 문장 결과 행 확보(없으면 만든다)
  insert into public.writing_sentence_results (profile_id, sentence_id, writing_set_id)
  values (v_uid, v_attempt.sentence_id, v_attempt.writing_set_id)
  on conflict (profile_id, sentence_id) do nothing;

  select * into v_result
  from public.writing_sentence_results
  where profile_id = v_uid and sentence_id = v_attempt.sentence_id
  for update;
  v_was_completed := v_result.completed;

  update public.writing_attempts
  set submitted_ids = to_jsonb(p_piece_ids),
      is_correct = v_correct,
      order_accuracy = v_accuracy,
      is_official = not v_was_completed,
      submitted_at = now()
  where id = p_attempt_id;

  if not v_was_completed then
    v_attempts_after := v_result.attempts + 1;
    if v_correct then
      v_points := case v_attempts_after when 1 then 5 when 2 then 3 else 1 end;
      v_newly_completed := true;
      update public.writing_sentence_results
      set attempts = v_attempts_after,
          completed = true,
          first_try_correct = (v_attempts_after = 1),
          points = v_points,
          completed_at = now()
      where profile_id = v_uid and sentence_id = v_attempt.sentence_id;
    else
      update public.writing_sentence_results
      set attempts = v_attempts_after
      where profile_id = v_uid and sentence_id = v_attempt.sentence_id;
    end if;
  end if;

  -- 세트의 모든 문장을 완성했으면 한 번만 성적 리포트에 기록한다.
  if v_newly_completed then
    select count(*) into v_total
    from public.writing_sentences where writing_set_id = v_attempt.writing_set_id;
    select count(*), coalesce(sum(points), 0), count(*) filter (where first_try_correct)
    into v_done, v_set_points, v_first_try
    from public.writing_sentence_results
    where profile_id = v_uid and writing_set_id = v_attempt.writing_set_id and completed;

    if v_done = v_total and not exists (
      select 1 from public.writing_set_completions
      where profile_id = v_uid and writing_set_id = v_attempt.writing_set_id
    ) then
      v_set_completed := true;
      select title into v_set_title from public.writing_sets where id = v_attempt.writing_set_id;

      insert into public.writing_set_completions
        (profile_id, writing_set_id, points, max_points)
      values (v_uid, v_attempt.writing_set_id, v_set_points, v_total * 5);

      -- 지각 응시는 점수 반영 방식이 정해질 때까지 성적 리포트에 기록하지 않는다.
      select coalesce((
        select a.is_late from public.writing_attempts a
        where a.profile_id = v_uid and a.writing_set_id = v_attempt.writing_set_id
        order by a.started_at limit 1
      ), false) into v_late;

      if not v_late then
        insert into public.score_reports
          (profile_id, report_type, title, score, exam_date, extra_data)
        values
          (v_uid, 'writing_test', coalesce(v_set_title, '서술형 테스트'),
           round(v_set_points * 100.0 / (v_total * 5))::text, current_date,
           jsonb_build_object(
             'points', v_set_points,
             'max_points', v_total * 5,
             'first_try_rate', round(v_first_try * 100.0 / v_total),
             'sentence_count', v_total
           ));
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'is_correct', v_correct,
    'attempt_no', v_attempt.attempt_no,
    'english', v_sentence.english,
    'korean', v_sentence.korean,
    'chunks', v_sentence.chunks,
    'key_phrases', v_sentence.key_phrases,
    'submitted_chunks', to_jsonb(v_arrangement),
    'order_accuracy', v_accuracy,
    'points', v_points,
    'sentence_completed', v_newly_completed,
    'was_already_completed', v_was_completed,
    'set_completed', v_set_completed
  );
end;
$$;

create or replace function public.get_writing_set_progress(p_set_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_sentences jsonb;
  v_total integer;
  v_done integer;
  v_points integer;
  v_first integer;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if not exists (
    select 1 from public.writing_sets ws
    where ws.id = p_set_id and not ws.is_hidden and public.is_course_member(ws.course_id)
  ) then
    raise exception 'writing set not available';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'sentence_id', s.id,
      'order_no', s.order_no,
      'korean', s.korean,
      'attempts', coalesce(r.attempts, 0),
      'completed', coalesce(r.completed, false),
      'first_try_correct', coalesce(r.first_try_correct, false),
      'points', coalesce(r.points, 0)
    ) order by s.order_no
  ), '[]'::jsonb),
  count(*),
  count(*) filter (where r.completed),
  coalesce(sum(r.points), 0),
  count(*) filter (where r.first_try_correct)
  into v_sentences, v_total, v_done, v_points, v_first
  from public.writing_sentences s
  left join public.writing_sentence_results r
    on r.sentence_id = s.id and r.profile_id = v_uid
  where s.writing_set_id = p_set_id;

  return jsonb_build_object(
    'sentences', v_sentences,
    'total', v_total,
    'completed', v_done,
    'points', v_points,
    'max_points', v_total * 5,
    'first_try_rate', case when v_total = 0 then null else round(v_first * 100.0 / v_total) end,
    'passed', v_total > 0 and v_done = v_total,
    'is_late', coalesce(
      (select a.is_late from public.writing_attempts a
       where a.profile_id = v_uid and a.writing_set_id = p_set_id
       order by a.started_at limit 1),
      public.writing_set_is_late(p_set_id)
    )
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 이번 주 할 일: 수강 중인 강좌별로 현재 주차의 시험(주차가 없는 세트 포함)과
-- 지난 주차의 미완료 시험(지각 응시)을 돌려준다. 앞으로 올 주차는 숨긴다.
-- 강좌 시작일이 없으면 현재 주차를 알 수 없어 모든 시험을 이번 주 할 일로
-- 보여주고 지각 표시는 하지 않는다. 시작 전(현재 주차 0 이하)이면 비운다.
-- 완료 기준: 단어 = 2차 시험까지 마침, 서술형 = 모든 문장 완성.
-- ---------------------------------------------------------------------
create or replace function public.get_weekly_tasks()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'course_id', c.id,
        'title', c.title,
        'subject', c.subject,
        'start_date', c.start_date,
        'total_weeks', c.total_weeks,
        'current_week', public.course_current_week(c.id),
        'tasks', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'kind', t.kind, 'id', t.id, 'title', t.title, 'week', t.week,
              'status', t.status,
              'is_late', public.week_is_late(c.id, t.week)
            )
            order by t.week nulls first, t.title
          )
          from (
            select 'vocab'::text as kind, vs.id, vs.title, vs.week,
              case
                when exists (select 1 from public.vocab_test_attempts a
                  where a.profile_id = v_uid and a.vocab_set_id = vs.id
                    and a.round_no = 3 and a.status = 'completed') then 'completed'
                when exists (select 1 from public.vocab_test_attempts a
                  where a.profile_id = v_uid and a.vocab_set_id = vs.id) then 'in_progress'
                else 'not_started'
              end as status
            from public.vocab_sets vs
            join public.vocab_assignments va on va.vocab_set_id = vs.id and va.course_id = c.id
            where public.is_vocab_set_assigned(vs.id)
            union all
            select 'writing'::text, ws.id, ws.title, ws.week,
              case
                when exists (select 1 from public.writing_set_completions k
                  where k.profile_id = v_uid and k.writing_set_id = ws.id) then 'completed'
                when exists (select 1 from public.writing_attempts a
                  where a.profile_id = v_uid and a.writing_set_id = ws.id) then 'in_progress'
                else 'not_started'
              end
            from public.writing_sets ws
            where ws.course_id = c.id and not ws.is_hidden
          ) t
          where public.course_current_week(c.id) is null
             or (public.course_current_week(c.id) >= 1
                 and (t.week is null
                      or t.week = public.course_current_week(c.id)
                      or (t.week < public.course_current_week(c.id) and t.status <> 'completed')))
        ), '[]'::jsonb)
      )
      order by c.title
    )
    from public.courses c
    where exists (
      select 1 from public.enrollments e
      where e.course_id = c.id and e.profile_id = v_uid
    )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.course_current_week(uuid) from public;
revoke all on function public.week_is_late(uuid, smallint) from public;
revoke all on function public.vocab_set_is_late(uuid) from public;
revoke all on function public.writing_set_is_late(uuid) from public;
revoke all on function public.get_weekly_tasks() from public;
grant execute on function public.get_weekly_tasks() to authenticated;
