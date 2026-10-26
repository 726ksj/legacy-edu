-- 3차 재시험 출제 기준 변경: 1차 시험과 2차 시험(round 1, 3)에서 모두 틀린 단어만 다시 푼다.
-- (이전: 재시험 포함 1~4번째 응시에서 두 번 이상 틀린 단어)
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

  -- 3차 재시험: 1차 시험과 2차 시험에서 모두 틀린 단어가 있을 때만
  select count(*) into v_wrong from (
    select q.word_id
    from public.vocab_test_questions q
    join public.vocab_test_attempts a on a.id = q.attempt_id
    where a.profile_id = p_uid and a.vocab_set_id = p_set
      and a.round_no in (1, 3) and a.status = 'completed'
      and q.is_correct = false
    group by q.word_id
    having count(distinct a.round_no) = 2
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
  --   5(3차 재시험) = 1차 시험과 2차 시험에서 모두 틀린 단어
  v_source_round := case v_round when 2 then 1 when 4 then 3 else null end;

  if v_round = 5 then
    select array_agg(word_id) into v_word_ids
    from (
      select q.word_id
      from public.vocab_test_questions q
      join public.vocab_test_attempts a on a.id = q.attempt_id
      where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
        and a.round_no in (1, 3) and a.status = 'completed'
        and q.is_correct = false
      group by q.word_id
      having count(distinct a.round_no) = 2
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
