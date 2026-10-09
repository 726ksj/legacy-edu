-- 4·5회 재시험을 추가한다.
--   1회: 단어장에서 랜덤 30개          2회: 1회 오답만
--   3회: 다시 랜덤 30개                4회: 3회 오답만
--   5회: 4회에서도 틀린 단어(두 번 연속 틀린 것)만
-- 오답이 없으면 그 뒤 회차는 생략한다. 종합 점수(1회 40% + 3회 60%)는 3회가
-- 끝날 때 기록한 그대로이고, 4·5회는 재시험 기록과 오답노트 반영만 한다.
-- (4·5회에서 틀린 단어도 기존 로직으로 오답노트에 쌓인다.)
-- 객관식 보기는 재시험에서도 원래 30개 단어(2회 = 1회, 4·5회 = 3회)의 뜻에서
-- 만든다.

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
  -- 1회
  if not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set
      and round_no = 1 and status = 'completed'
  ) then
    return 1;
  end if;

  -- 2회: 1회 오답이 있을 때만
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

  -- 3회
  if not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and round_no = 3
  ) then
    return 3;
  end if;

  -- 4회: 3회를 끝냈고 3회 오답이 있을 때만
  select count(*) into v_wrong
  from public.vocab_test_questions q
  join public.vocab_test_attempts a on a.id = q.attempt_id
  where a.profile_id = p_uid and a.vocab_set_id = p_set
    and a.round_no = 3 and a.status = 'completed' and q.is_correct = false;

  if v_wrong > 0 and not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = p_uid and vocab_set_id = p_set and round_no = 4
  ) then
    return 4;
  end if;

  -- 5회: 4회를 끝냈고 4회에서도 틀린(= 3·4회 연속 오답) 단어가 있을 때만
  select count(*) into v_wrong
  from public.vocab_test_questions q
  join public.vocab_test_attempts a on a.id = q.attempt_id
  where a.profile_id = p_uid and a.vocab_set_id = p_set
    and a.round_no = 4 and a.status = 'completed' and q.is_correct = false;

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
  --   2회 = 1회 오답, 4회 = 3회 오답, 5회 = 4회 오답(두 번 연속 틀린 단어)
  v_source_round := case v_round when 2 then 1 when 4 then 3 when 5 then 4 else null end;

  if v_source_round is not null then
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
  v_pool_round := case v_round when 2 then 1 when 4 then 3 when 5 then 3 else null end;

  if v_pool_round is not null then
    select array_agg(q.word_id) into v_pool
    from public.vocab_test_questions q
    join public.vocab_test_attempts a on a.id = q.attempt_id
    where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
      and a.round_no = v_pool_round;
  else
    v_pool := v_word_ids;
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
