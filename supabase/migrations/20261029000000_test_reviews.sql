-- 복습 시험: 시험(최소 2회 ~ 최대 5회)을 모두 끝낸 뒤 다시 풀어 보는 연습.
--   - 회차 번호 6 이상이 복습이다(6 = 첫 복습, 7 = 두 번째 복습 …). 몇 번이든 새로 시작할 수 있다.
--   - 시험처럼 랜덤으로 출제한다(단어는 단어장에서 랜덤 30개, 어순·순서·문장 배열은 세트의 전체 문제를
--     새로 섞어서).
--   - 종합 점수, 성적 리포트, 단어 오답노트, 지각/기한 초과 표시에는 반영하지 않는다.
--   - 시험이 끝나지 않았거나 풀던 시험 회차가 있으면 복습을 시작할 수 없다.
--   - 시험 현황(get_*_test_status)에는 review 항목이 더해진다:
--       { available, round_no(단어는 풀던 attempt_id), in_progress, count, last_score }


-- ===== 단어(VOCA) : 복습 =====
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.vocab_test_attempts'::regclass
      and contype = 'c' and pg_get_constraintdef(oid) like '%round_no%'
  loop
    execute format('alter table public.vocab_test_attempts drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.vocab_test_attempts
  add constraint vocab_test_attempts_round_no_check check (round_no >= 1);

-- 복습 정보: 시험을 모두 끝냈을 때만 available. 풀던 복습이 있으면 그 attempt id.
create or replace function public.vocab_review_state(p_uid uuid, p_set uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_finished boolean;
  v_open uuid;
  v_last numeric;
begin
  v_finished := exists (
      select 1 from public.vocab_test_attempts
      where profile_id = p_uid and vocab_set_id = p_set
        and round_no = 3 and status = 'completed')
    and public.vocab_next_round(p_uid, p_set) is null
    and not exists (
      select 1 from public.vocab_test_attempts
      where profile_id = p_uid and vocab_set_id = p_set
        and round_no <= 5 and status = 'in_progress');

  select id into v_open from public.vocab_test_attempts
  where profile_id = p_uid and vocab_set_id = p_set
    and round_no >= 6 and status = 'in_progress'
  limit 1;

  select score into v_last from public.vocab_test_attempts
  where profile_id = p_uid and vocab_set_id = p_set
    and round_no >= 6 and status = 'completed'
  order by round_no desc
  limit 1;

  return jsonb_build_object(
    'available', v_finished,
    'attempt_id', v_open,
    'in_progress', v_open is not null,
    'count', (select count(*) from public.vocab_test_attempts
              where profile_id = p_uid and vocab_set_id = p_set
                and round_no >= 6 and status = 'completed'),
    'last_score', v_last
  );
end;
$$;

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
      and round_no <= 5
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

create or replace function public.start_vocab_review(p_vocab_set_id uuid)
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

  -- 풀던 복습이 있으면 새로 만들지 않고 이어서 푼다(같은 문항/보기).
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

  -- 시험(1~5회)을 모두 끝낸 뒤에만 복습을 시작할 수 있다.
  if not exists (
    select 1 from public.vocab_test_attempts
    where profile_id = v_uid and vocab_set_id = p_vocab_set_id
      and round_no = 3 and status = 'completed'
  ) or public.vocab_next_round(v_uid, p_vocab_set_id) is not null then
    raise exception 'tests not finished';
  end if;

  select greatest(5, coalesce(max(round_no), 5)) + 1 into v_round
  from public.vocab_test_attempts
  where profile_id = v_uid and vocab_set_id = p_vocab_set_id;

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
  -- 복습은 지각으로 표시하지 않는다.
  v_late := false;

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

  -- 틀린 단어는 오답노트에 쌓인다: 처음이면 새로 만들고, 이미 있으면 틀린 횟수만
  -- 올린다. 졸업했던 단어를 다시 틀리면 오답노트로 돌아오고(복귀) 졸업 칸은
  -- 0부터 다시 시작한다.
  -- 복습(6회 이상)에서 틀린 단어는 오답노트에 쌓지 않는다.
  if p_selected_index <> v_q.correct_index and v_attempt.round_no <= 5 then
    insert into public.vocab_wrong_notes
      (profile_id, word_id, vocab_set_id)
    values
      (v_uid, v_q.word_id, v_attempt.vocab_set_id)
    on conflict (profile_id, word_id) do update
    set wrong_count = public.vocab_wrong_notes.wrong_count + 1,
        last_wrong_at = now(),
        return_count = public.vocab_wrong_notes.return_count
          + case when public.vocab_wrong_notes.status = 'graduated' then 1 else 0 end,
        status = 'active',
        streak = 0,
        last_correct_date = null,
        graduated_at = null;
  end if;

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
          'score', a.score,
          'is_late', a.is_late,
          'is_overdue', a.is_overdue
        )
        order by a.round_no
      )
      from public.vocab_test_attempts a
      where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id
        and a.round_no <= 5
    ), '[]'::jsonb),
    'next_round', public.vocab_next_round(v_uid, p_vocab_set_id),
    'review', public.vocab_review_state(v_uid, p_vocab_set_id),
    'is_late', public.vocab_set_is_late(p_vocab_set_id),
    'is_overdue', public.vocab_set_is_overdue(p_vocab_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

revoke all on function public.vocab_review_state(uuid, uuid) from public;
revoke all on function public.start_vocab_review(uuid) from public;
grant execute on function public.start_vocab_review(uuid) to authenticated;

-- ===== 순서 배열 (order) : 복습 =====
alter table public.order_attempts drop constraint if exists order_attempts_round_no_check;
alter table public.order_attempts add constraint order_attempts_round_no_check check (round_no >= 1);

-- 지금 시작하거나 이어서 풀 복습 회차. 시험을 모두 끝내지 않았으면 null.
create or replace function public.order_review_round(p_uid uuid, p_set uuid)
returns smallint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_latest smallint;
  r smallint;
begin
  if public.order_round_state(p_uid, p_set, 3::smallint) <> 'completed'
     or public.order_next_round(p_uid, p_set) is not null then
    return null;
  end if;
  for r in 1..5 loop
    if public.order_round_state(p_uid, p_set, r::smallint) = 'in_progress' then
      return null;
    end if;
  end loop;

  select max(a.round_no) into v_latest
  from public.order_attempts a
  where a.profile_id = p_uid and a.order_set_id = p_set and a.round_no >= 6;

  if v_latest is not null
     and public.order_round_state(p_uid, p_set, v_latest) = 'in_progress' then
    return v_latest;
  end if;
  return coalesce(v_latest, 5::smallint) + 1;
end;
$$;

-- 시험 현황에 붙는 복습 정보.
create or replace function public.order_review_state(p_uid uuid, p_set uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_round smallint := public.order_review_round(p_uid, p_set);
  v_count integer := 0;
  v_last smallint;
  rn smallint;
begin
  for rn in
    select distinct a.round_no from public.order_attempts a
    where a.profile_id = p_uid and a.order_set_id = p_set and a.round_no >= 6
    order by 1
  loop
    if public.order_round_state(p_uid, p_set, rn) = 'completed' then
      v_count := v_count + 1;
      v_last := rn;
    end if;
  end loop;

  return jsonb_build_object(
    'available', v_round is not null,
    'round_no', v_round,
    'in_progress', v_round is not null
      and public.order_round_state(p_uid, p_set, v_round) = 'in_progress',
    'count', v_count,
    'last_score', case when v_last is not null
      then public.order_round_summary(p_uid, p_set, v_last) -> 'score' end
  );
end;
$$;

create or replace function public.order_round_members(p_uid uuid, p_set uuid, p_round smallint)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select q.id
  from public.order_questions q
  where q.order_set_id = p_set
    and (
      (p_round in (1, 3) or p_round >= 6)
      or (p_round = 2 and exists (
        select 1 from public.order_attempts a
        where a.profile_id = p_uid and a.question_id = q.id and a.round_no = 1
          and a.is_correct = false))
      or (p_round = 4 and exists (
        select 1 from public.order_attempts a
        where a.profile_id = p_uid and a.question_id = q.id and a.round_no = 3
          and a.is_correct = false))
      or (p_round = 5
        and exists (
          select 1 from public.order_attempts a
          where a.profile_id = p_uid and a.question_id = q.id and a.round_no = 1
            and a.is_correct = false)
        and exists (
          select 1 from public.order_attempts a
          where a.profile_id = p_uid and a.question_id = q.id and a.round_no = 3
            and a.is_correct = false))
    )
$$;

create or replace function public.order_round_flags(p_uid uuid, p_set uuid, p_round smallint)
returns table (is_late boolean, is_overdue boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parent smallint := case when p_round in (1, 2) then 1 else 3 end;
  v_late boolean;
  v_overdue boolean;
begin
  -- 복습은 지각/기한 초과로 표시하지 않는다.
  if p_round >= 6 then
    return query select false, false;
    return;
  end if;

  select a.is_late, a.is_overdue into v_late, v_overdue
  from public.order_attempts a
  where a.profile_id = p_uid and a.order_set_id = p_set and a.round_no = v_parent
  order by a.started_at
  limit 1;
  if not found then
    v_late := public.order_set_is_late(p_set);
    v_overdue := public.order_set_is_overdue(p_set);
  end if;
  return query select coalesce(v_late, false), coalesce(v_overdue, false);
end;
$$;

create or replace function public.start_order_attempt(p_question_id uuid, p_round smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q public.order_questions%rowtype;
  v_attempt_id uuid;
  v_perms text[] := array['{1,3,2}', '{2,1,3}', '{2,3,1}', '{3,1,2}', '{3,2,1}'];
  v_shown integer[];
  v_seq integer[];
  v_correct text;
  v_pool text[];
  v_distractors text[];
  v_options text[];
  v_flags record;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select q.* into v_q
  from public.order_questions q
  join public.order_sets os on os.id = q.order_set_id
  where q.id = p_question_id
    and not os.is_hidden
    and public.is_course_member(os.course_id);
  if not found then
    raise exception 'question not available';
  end if;

  if p_round is null or p_round < 1 then
    raise exception 'invalid round';
  end if;
  if not exists (
    select 1 from public.order_round_members(v_uid, v_q.order_set_id, p_round) m
    where m = p_question_id
  ) then
    raise exception 'question not in round';
  end if;
  if public.order_round_state(v_uid, v_q.order_set_id, p_round) = 'none'
     and p_round is distinct from public.order_next_round(v_uid, v_q.order_set_id)
     and p_round is distinct from public.order_review_round(v_uid, v_q.order_set_id) then
    raise exception 'round not available';
  end if;

  select id into v_attempt_id
  from public.order_attempts
  where profile_id = v_uid and question_id = p_question_id and round_no = p_round;

  if v_attempt_id is null then
    select p::integer[] into v_shown from unnest(v_perms) p order by random() limit 1;

    select array_agg(array_position(v_shown, k) order by k) into v_seq
    from generate_series(1, 3) k;
    v_correct := format('(%s) - (%s) - (%s)',
      chr(64 + v_seq[1]), chr(64 + v_seq[2]), chr(64 + v_seq[3]));

    select array_agg(format('(%s) - (%s) - (%s)',
      chr(64 + (p::integer[])[1]), chr(64 + (p::integer[])[2]), chr(64 + (p::integer[])[3])))
    into v_pool
    from unnest(v_perms) p;

    select array_agg(o) into v_distractors
    from (
      select o from unnest(v_pool) o where o <> v_correct order by random() limit 3
    ) s;

    select array_agg(o order by random()) into v_options
    from unnest(array_append(v_distractors, v_correct)) o;

    select * into v_flags from public.order_round_flags(v_uid, v_q.order_set_id, p_round);

    insert into public.order_attempts
      (profile_id, question_id, order_set_id, round_no, shown_order, options, correct_index,
       is_late, is_overdue)
    values
      (v_uid, p_question_id, v_q.order_set_id, p_round, v_shown::smallint[], to_jsonb(v_options),
       (array_position(v_options, v_correct) - 1)::smallint, v_flags.is_late, v_flags.is_overdue)
    returning id into v_attempt_id;
  end if;

  return public.order_attempt_payload(v_attempt_id);
end;
$$;

create or replace function public.get_order_set_progress(p_set_id uuid, p_round smallint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_set public.order_sets%rowtype;
  v_round smallint;
  v_questions jsonb;
  v_sum jsonb;
  v_flags record;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_set
  from public.order_sets s
  where s.id = p_set_id and not s.is_hidden and public.is_course_member(s.course_id);
  if not found then
    raise exception 'set not available';
  end if;

  v_round := coalesce(p_round, public.order_current_round(v_uid, p_set_id), 3::smallint);

  -- 아직 시작하지 않은 회차는 지금 풀 수 있는 회차(풀던 회차 또는 다음 회차)만 열 수 있다.
  if public.order_round_state(v_uid, p_set_id, v_round) = 'none'
     and v_round is distinct from public.order_next_round(v_uid, p_set_id)
     and v_round is distinct from public.order_review_round(v_uid, p_set_id) then
    raise exception 'round not available';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'question_id', q.id,
      'order_no', q.order_no,
      'attempt_id', a.id,
      'answered', a.answered_at is not null,
      'is_correct', a.is_correct
    ) order by q.order_no
  ), '[]'::jsonb)
  into v_questions
  from public.order_questions q
  left join public.order_attempts a
    on a.question_id = q.id and a.profile_id = v_uid and a.round_no = v_round
  where q.order_set_id = p_set_id
    and q.id in (select public.order_round_members(v_uid, p_set_id, v_round));

  v_sum := public.order_round_summary(v_uid, p_set_id, v_round);
  select * into v_flags from public.order_round_flags(v_uid, p_set_id, v_round);

  return jsonb_build_object(
    'title', v_set.title,
    'week', v_set.week,
    'round_no', v_round,
    'questions', v_questions,
    'total', (v_sum ->> 'total')::int,
    'answered', (v_sum ->> 'answered')::int,
    'correct', (v_sum ->> 'correct')::int,
    'completed', (v_sum ->> 'completed')::boolean,
    'score', v_sum -> 'score',
    'is_late', coalesce(v_flags.is_late, false),
    'is_overdue', coalesce(v_flags.is_overdue, false)
  );
end;
$$;

create or replace function public.get_order_test_status(p_set_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_rounds jsonb := '[]'::jsonb;
  v_state text;
  v_sum jsonb;
  v_flags record;
  r smallint;
  v_first numeric;
  v_final numeric;
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

  for r in 1..5 loop
    v_state := public.order_round_state(v_uid, p_set_id, r::smallint);
    continue when v_state = 'none';
    v_sum := public.order_round_summary(v_uid, p_set_id, r::smallint);
    select * into v_flags from public.order_round_flags(v_uid, p_set_id, r::smallint);
    v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
      'round_no', r,
      'status', v_state,
      'total_count', v_sum -> 'total',
      'correct_count', v_sum -> 'correct',
      'score', v_sum -> 'score',
      'is_late', coalesce(v_flags.is_late, false),
      'is_overdue', coalesce(v_flags.is_overdue, false)
    ));
  end loop;

  v_first := (public.order_round_summary(v_uid, p_set_id, 1::smallint) ->> 'score')::numeric;
  v_final := (public.order_round_summary(v_uid, p_set_id, 3::smallint) ->> 'score')::numeric;

  return jsonb_build_object(
    'rounds', v_rounds,
    'next_round', public.order_next_round(v_uid, p_set_id),
    'review', public.order_review_state(v_uid, p_set_id),
    'is_late', public.order_set_is_late(p_set_id),
    'is_overdue', public.order_set_is_overdue(p_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

revoke all on function public.order_review_round(uuid, uuid) from public;
revoke all on function public.order_review_state(uuid, uuid) from public;

-- ===== 문장 배열 (sentence) : 복습 =====
alter table public.sentence_attempts drop constraint if exists sentence_attempts_round_no_check;
alter table public.sentence_attempts add constraint sentence_attempts_round_no_check check (round_no >= 1);

-- 지금 시작하거나 이어서 풀 복습 회차. 시험을 모두 끝내지 않았으면 null.
create or replace function public.sentence_review_round(p_uid uuid, p_set uuid)
returns smallint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_latest smallint;
  r smallint;
begin
  if public.sentence_round_state(p_uid, p_set, 3::smallint) <> 'completed'
     or public.sentence_next_round(p_uid, p_set) is not null then
    return null;
  end if;
  for r in 1..5 loop
    if public.sentence_round_state(p_uid, p_set, r::smallint) = 'in_progress' then
      return null;
    end if;
  end loop;

  select max(a.round_no) into v_latest
  from public.sentence_attempts a
  where a.profile_id = p_uid and a.sentence_set_id = p_set and a.round_no >= 6;

  if v_latest is not null
     and public.sentence_round_state(p_uid, p_set, v_latest) = 'in_progress' then
    return v_latest;
  end if;
  return coalesce(v_latest, 5::smallint) + 1;
end;
$$;

-- 시험 현황에 붙는 복습 정보.
create or replace function public.sentence_review_state(p_uid uuid, p_set uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_round smallint := public.sentence_review_round(p_uid, p_set);
  v_count integer := 0;
  v_last smallint;
  rn smallint;
begin
  for rn in
    select distinct a.round_no from public.sentence_attempts a
    where a.profile_id = p_uid and a.sentence_set_id = p_set and a.round_no >= 6
    order by 1
  loop
    if public.sentence_round_state(p_uid, p_set, rn) = 'completed' then
      v_count := v_count + 1;
      v_last := rn;
    end if;
  end loop;

  return jsonb_build_object(
    'available', v_round is not null,
    'round_no', v_round,
    'in_progress', v_round is not null
      and public.sentence_round_state(p_uid, p_set, v_round) = 'in_progress',
    'count', v_count,
    'last_score', case when v_last is not null
      then public.sentence_round_summary(p_uid, p_set, v_last) -> 'score' end
  );
end;
$$;

create or replace function public.sentence_round_members(p_uid uuid, p_set uuid, p_round smallint)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select q.id
  from public.sentence_questions q
  where q.sentence_set_id = p_set
    and (
      (p_round in (1, 3) or p_round >= 6)
      or (p_round = 2 and exists (
        select 1 from public.sentence_attempts a
        where a.profile_id = p_uid and a.question_id = q.id and a.round_no = 1
          and a.is_correct = false))
      or (p_round = 4 and exists (
        select 1 from public.sentence_attempts a
        where a.profile_id = p_uid and a.question_id = q.id and a.round_no = 3
          and a.is_correct = false))
      or (p_round = 5
        and exists (
          select 1 from public.sentence_attempts a
          where a.profile_id = p_uid and a.question_id = q.id and a.round_no = 1
            and a.is_correct = false)
        and exists (
          select 1 from public.sentence_attempts a
          where a.profile_id = p_uid and a.question_id = q.id and a.round_no = 3
            and a.is_correct = false))
    )
$$;

create or replace function public.sentence_round_flags(p_uid uuid, p_set uuid, p_round smallint)
returns table (is_late boolean, is_overdue boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parent smallint := case when p_round in (1, 2) then 1 else 3 end;
  v_late boolean;
  v_overdue boolean;
begin
  -- 복습은 지각/기한 초과로 표시하지 않는다.
  if p_round >= 6 then
    return query select false, false;
    return;
  end if;

  select a.is_late, a.is_overdue into v_late, v_overdue
  from public.sentence_attempts a
  where a.profile_id = p_uid and a.sentence_set_id = p_set and a.round_no = v_parent
  order by a.started_at
  limit 1;
  if not found then
    v_late := public.sentence_set_is_late(p_set);
    v_overdue := public.sentence_set_is_overdue(p_set);
  end if;
  return query select coalesce(v_late, false), coalesce(v_overdue, false);
end;
$$;

create or replace function public.start_sentence_attempt(p_question_id uuid, p_round smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q public.sentence_questions%rowtype;
  v_attempt_id uuid;
  v_n integer;
  v_identity integer[];
  v_order integer[];
  v_try integer;
  v_flags record;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select q.* into v_q
  from public.sentence_questions q
  join public.sentence_sets ss on ss.id = q.sentence_set_id
  where q.id = p_question_id
    and not ss.is_hidden
    and public.is_course_member(ss.course_id);
  if not found then
    raise exception 'question not available';
  end if;

  if p_round is null or p_round < 1 then
    raise exception 'invalid round';
  end if;
  if not exists (
    select 1 from public.sentence_round_members(v_uid, v_q.sentence_set_id, p_round) m
    where m = p_question_id
  ) then
    raise exception 'question not in round';
  end if;
  if public.sentence_round_state(v_uid, v_q.sentence_set_id, p_round) = 'none'
     and p_round is distinct from public.sentence_next_round(v_uid, v_q.sentence_set_id)
     and p_round is distinct from public.sentence_review_round(v_uid, v_q.sentence_set_id) then
    raise exception 'round not available';
  end if;

  select id into v_attempt_id
  from public.sentence_attempts
  where profile_id = v_uid and question_id = p_question_id and round_no = p_round;

  if v_attempt_id is null then
    v_n := jsonb_array_length(v_q.sentences);
    if v_n < 2 then
      raise exception 'question has too few sentences';
    end if;
    v_identity := array(select i from generate_series(1, v_n) i);

    for v_try in 1..20 loop
      select array_agg(i order by random()) into v_order from generate_series(1, v_n) i;
      exit when v_order is distinct from v_identity;
    end loop;
    if v_order is not distinct from v_identity then
      select array_agg(i order by i desc) into v_order from generate_series(1, v_n) i;
    end if;

    select * into v_flags from public.sentence_round_flags(v_uid, v_q.sentence_set_id, p_round);

    insert into public.sentence_attempts
      (profile_id, question_id, sentence_set_id, round_no, shown_order, is_late, is_overdue)
    values
      (v_uid, p_question_id, v_q.sentence_set_id, p_round, v_order::smallint[],
       v_flags.is_late, v_flags.is_overdue)
    returning id into v_attempt_id;
  end if;

  return public.sentence_attempt_payload(v_attempt_id);
end;
$$;

create or replace function public.get_sentence_set_progress(p_set_id uuid, p_round smallint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_set public.sentence_sets%rowtype;
  v_round smallint;
  v_questions jsonb;
  v_sum jsonb;
  v_flags record;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_set
  from public.sentence_sets s
  where s.id = p_set_id and not s.is_hidden and public.is_course_member(s.course_id);
  if not found then
    raise exception 'set not available';
  end if;

  v_round := coalesce(p_round, public.sentence_current_round(v_uid, p_set_id), 3::smallint);

  -- 아직 시작하지 않은 회차는 지금 풀 수 있는 회차(풀던 회차 또는 다음 회차)만 열 수 있다.
  if public.sentence_round_state(v_uid, p_set_id, v_round) = 'none'
     and v_round is distinct from public.sentence_next_round(v_uid, p_set_id)
     and v_round is distinct from public.sentence_review_round(v_uid, p_set_id) then
    raise exception 'round not available';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'question_id', q.id,
      'order_no', q.order_no,
      'attempt_id', a.id,
      'answered', a.answered_at is not null,
      'is_correct', a.is_correct
    ) order by q.order_no
  ), '[]'::jsonb)
  into v_questions
  from public.sentence_questions q
  left join public.sentence_attempts a
    on a.question_id = q.id and a.profile_id = v_uid and a.round_no = v_round
  where q.sentence_set_id = p_set_id
    and q.id in (select public.sentence_round_members(v_uid, p_set_id, v_round));

  v_sum := public.sentence_round_summary(v_uid, p_set_id, v_round);
  select * into v_flags from public.sentence_round_flags(v_uid, p_set_id, v_round);

  return jsonb_build_object(
    'title', v_set.title,
    'week', v_set.week,
    'round_no', v_round,
    'questions', v_questions,
    'total', (v_sum ->> 'total')::int,
    'answered', (v_sum ->> 'answered')::int,
    'correct', (v_sum ->> 'correct')::int,
    'completed', (v_sum ->> 'completed')::boolean,
    'score', v_sum -> 'score',
    'is_late', coalesce(v_flags.is_late, false),
    'is_overdue', coalesce(v_flags.is_overdue, false)
  );
end;
$$;

create or replace function public.get_sentence_test_status(p_set_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_rounds jsonb := '[]'::jsonb;
  v_state text;
  v_sum jsonb;
  v_flags record;
  r smallint;
  v_first numeric;
  v_final numeric;
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

  for r in 1..5 loop
    v_state := public.sentence_round_state(v_uid, p_set_id, r::smallint);
    continue when v_state = 'none';
    v_sum := public.sentence_round_summary(v_uid, p_set_id, r::smallint);
    select * into v_flags from public.sentence_round_flags(v_uid, p_set_id, r::smallint);
    v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
      'round_no', r,
      'status', v_state,
      'total_count', v_sum -> 'total',
      'correct_count', v_sum -> 'correct',
      'score', v_sum -> 'score',
      'is_late', coalesce(v_flags.is_late, false),
      'is_overdue', coalesce(v_flags.is_overdue, false)
    ));
  end loop;

  v_first := (public.sentence_round_summary(v_uid, p_set_id, 1::smallint) ->> 'score')::numeric;
  v_final := (public.sentence_round_summary(v_uid, p_set_id, 3::smallint) ->> 'score')::numeric;

  return jsonb_build_object(
    'rounds', v_rounds,
    'next_round', public.sentence_next_round(v_uid, p_set_id),
    'review', public.sentence_review_state(v_uid, p_set_id),
    'is_late', public.sentence_set_is_late(p_set_id),
    'is_overdue', public.sentence_set_is_overdue(p_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

revoke all on function public.sentence_review_round(uuid, uuid) from public;
revoke all on function public.sentence_review_state(uuid, uuid) from public;

-- ===== 어순 배열 (writing) : 복습 =====
alter table public.writing_attempts drop constraint if exists writing_attempts_round_no_check;
alter table public.writing_attempts add constraint writing_attempts_round_no_check check (round_no >= 1);

-- 지금 시작하거나 이어서 풀 복습 회차. 시험을 모두 끝내지 않았으면 null.
create or replace function public.writing_review_round(p_uid uuid, p_set uuid)
returns smallint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_latest smallint;
  r smallint;
begin
  if public.writing_round_state(p_uid, p_set, 3::smallint) <> 'completed'
     or public.writing_next_round(p_uid, p_set) is not null then
    return null;
  end if;
  for r in 1..5 loop
    if public.writing_round_state(p_uid, p_set, r::smallint) = 'in_progress' then
      return null;
    end if;
  end loop;

  select max(a.round_no) into v_latest
  from public.writing_attempts a
  where a.profile_id = p_uid and a.writing_set_id = p_set and a.round_no >= 6 and a.attempt_no = 1;

  if v_latest is not null
     and public.writing_round_state(p_uid, p_set, v_latest) = 'in_progress' then
    return v_latest;
  end if;
  return coalesce(v_latest, 5::smallint) + 1;
end;
$$;

-- 시험 현황에 붙는 복습 정보.
create or replace function public.writing_review_state(p_uid uuid, p_set uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_round smallint := public.writing_review_round(p_uid, p_set);
  v_count integer := 0;
  v_last smallint;
  rn smallint;
begin
  for rn in
    select distinct a.round_no from public.writing_attempts a
    where a.profile_id = p_uid and a.writing_set_id = p_set and a.round_no >= 6 and a.attempt_no = 1
    order by 1
  loop
    if public.writing_round_state(p_uid, p_set, rn) = 'completed' then
      v_count := v_count + 1;
      v_last := rn;
    end if;
  end loop;

  return jsonb_build_object(
    'available', v_round is not null,
    'round_no', v_round,
    'in_progress', v_round is not null
      and public.writing_round_state(p_uid, p_set, v_round) = 'in_progress',
    'count', v_count,
    'last_score', case when v_last is not null
      then public.writing_round_summary(p_uid, p_set, v_last) -> 'score' end
  );
end;
$$;

create or replace function public.writing_round_members(p_uid uuid, p_set uuid, p_round smallint)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select q.id
  from public.writing_sentences q
  where q.writing_set_id = p_set
    and (
      (p_round in (1, 3) or p_round >= 6)
      or (p_round = 2 and exists (
        select 1 from public.writing_attempts a
        where a.profile_id = p_uid and a.sentence_id = q.id and a.round_no = 1
          and a.is_correct = false and a.attempt_no = 1))
      or (p_round = 4 and exists (
        select 1 from public.writing_attempts a
        where a.profile_id = p_uid and a.sentence_id = q.id and a.round_no = 3
          and a.is_correct = false and a.attempt_no = 1))
      or (p_round = 5
        and exists (
          select 1 from public.writing_attempts a
          where a.profile_id = p_uid and a.sentence_id = q.id and a.round_no = 1
            and a.is_correct = false and a.attempt_no = 1)
        and exists (
          select 1 from public.writing_attempts a
          where a.profile_id = p_uid and a.sentence_id = q.id and a.round_no = 3
            and a.is_correct = false and a.attempt_no = 1))
    )
$$;

create or replace function public.writing_round_flags(p_uid uuid, p_set uuid, p_round smallint)
returns table (is_late boolean, is_overdue boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parent smallint := case when p_round in (1, 2) then 1 else 3 end;
  v_late boolean;
  v_overdue boolean;
begin
  -- 복습은 지각/기한 초과로 표시하지 않는다.
  if p_round >= 6 then
    return query select false, false;
    return;
  end if;

  select a.is_late, a.is_overdue into v_late, v_overdue
  from public.writing_attempts a
  where a.profile_id = p_uid and a.writing_set_id = p_set and a.round_no = v_parent
  order by a.started_at
  limit 1;
  if not found then
    v_late := public.writing_set_is_late(p_set);
    v_overdue := public.writing_set_is_overdue(p_set);
  end if;
  return query select coalesce(v_late, false), coalesce(v_overdue, false);
end;
$$;

create or replace function public.start_writing_attempt(p_sentence_id uuid, p_round smallint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sentence public.writing_sentences%rowtype;
  v_attempt public.writing_attempts%rowtype;
  v_chunks text[];
  v_n integer;
  v_order integer[];
  v_texts text[];
  v_pieces jsonb;
  v_try integer;
  v_flags record;
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

  if p_round is null or p_round < 1 then
    raise exception 'invalid round';
  end if;
  if not exists (
    select 1 from public.writing_round_members(v_uid, v_sentence.writing_set_id, p_round) m
    where m = p_sentence_id
  ) then
    raise exception 'sentence not in round';
  end if;
  if public.writing_round_state(v_uid, v_sentence.writing_set_id, p_round) = 'none'
     and p_round is distinct from public.writing_next_round(v_uid, v_sentence.writing_set_id)
     and p_round is distinct from public.writing_review_round(v_uid, v_sentence.writing_set_id) then
    raise exception 'round not available';
  end if;

  select * into v_attempt
  from public.writing_attempts
  where profile_id = v_uid and sentence_id = p_sentence_id
    and round_no = p_round and attempt_no = 1;

  if not found then
    select array(select jsonb_array_elements_text(v_sentence.chunks)) into v_chunks;
    v_n := coalesce(array_length(v_chunks, 1), 0);
    if v_n < 2 then
      raise exception 'sentence has too few chunks';
    end if;

    for v_try in 1..10 loop
      select array_agg(i order by random()) into v_order
      from generate_series(1, v_n) i;
      select array_agg(v_chunks[o]) into v_texts from unnest(v_order) o;
      exit when v_texts is distinct from v_chunks;
    end loop;

    select jsonb_agg(jsonb_build_object('id', t.pos, 'text', t.txt) order by t.pos)
    into v_pieces
    from unnest(v_texts) with ordinality as t(txt, pos);

    select * into v_flags from public.writing_round_flags(v_uid, v_sentence.writing_set_id, p_round);

    insert into public.writing_attempts
      (profile_id, sentence_id, writing_set_id, round_no, attempt_no, pieces, is_late, is_overdue)
    values
      (v_uid, p_sentence_id, v_sentence.writing_set_id, p_round, 1, v_pieces,
       v_flags.is_late, v_flags.is_overdue)
    returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'attempt_no', v_attempt.attempt_no,
    'sentence_id', v_sentence.id,
    'order_no', v_sentence.order_no,
    'korean', v_sentence.korean,
    'pieces', v_attempt.pieces,
    'answered', v_attempt.submitted_at is not null
  );
end;
$$;

create or replace function public.get_writing_set_progress(p_set_id uuid, p_round smallint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_set public.writing_sets%rowtype;
  v_round smallint;
  v_questions jsonb;
  v_sum jsonb;
  v_flags record;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_set
  from public.writing_sets s
  where s.id = p_set_id and not s.is_hidden and public.is_course_member(s.course_id);
  if not found then
    raise exception 'set not available';
  end if;

  v_round := coalesce(p_round, public.writing_current_round(v_uid, p_set_id), 3::smallint);

  -- 아직 시작하지 않은 회차는 지금 풀 수 있는 회차(풀던 회차 또는 다음 회차)만 열 수 있다.
  if public.writing_round_state(v_uid, p_set_id, v_round) = 'none'
     and v_round is distinct from public.writing_next_round(v_uid, p_set_id)
     and v_round is distinct from public.writing_review_round(v_uid, p_set_id) then
    raise exception 'round not available';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'question_id', q.id,
      'order_no', q.order_no,
      'attempt_id', a.id,
      'answered', a.submitted_at is not null,
      'is_correct', a.is_correct
    ) order by q.order_no
  ), '[]'::jsonb)
  into v_questions
  from public.writing_sentences q
  left join public.writing_attempts a
    on a.sentence_id = q.id and a.profile_id = v_uid and a.round_no = v_round and a.attempt_no = 1
  where q.writing_set_id = p_set_id
    and q.id in (select public.writing_round_members(v_uid, p_set_id, v_round));

  v_sum := public.writing_round_summary(v_uid, p_set_id, v_round);
  select * into v_flags from public.writing_round_flags(v_uid, p_set_id, v_round);

  return jsonb_build_object(
    'title', v_set.title,
    'week', v_set.week,
    'round_no', v_round,
    'questions', v_questions,
    'total', (v_sum ->> 'total')::int,
    'answered', (v_sum ->> 'answered')::int,
    'correct', (v_sum ->> 'correct')::int,
    'completed', (v_sum ->> 'completed')::boolean,
    'score', v_sum -> 'score',
    'is_late', coalesce(v_flags.is_late, false),
    'is_overdue', coalesce(v_flags.is_overdue, false)
  );
end;
$$;

create or replace function public.get_writing_test_status(p_set_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_rounds jsonb := '[]'::jsonb;
  v_state text;
  v_sum jsonb;
  v_flags record;
  r smallint;
  v_first numeric;
  v_final numeric;
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

  for r in 1..5 loop
    v_state := public.writing_round_state(v_uid, p_set_id, r::smallint);
    continue when v_state = 'none';
    v_sum := public.writing_round_summary(v_uid, p_set_id, r::smallint);
    select * into v_flags from public.writing_round_flags(v_uid, p_set_id, r::smallint);
    v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
      'round_no', r,
      'status', v_state,
      'total_count', v_sum -> 'total',
      'correct_count', v_sum -> 'correct',
      'score', v_sum -> 'score',
      'is_late', coalesce(v_flags.is_late, false),
      'is_overdue', coalesce(v_flags.is_overdue, false)
    ));
  end loop;

  v_first := (public.writing_round_summary(v_uid, p_set_id, 1::smallint) ->> 'score')::numeric;
  v_final := (public.writing_round_summary(v_uid, p_set_id, 3::smallint) ->> 'score')::numeric;

  return jsonb_build_object(
    'rounds', v_rounds,
    'next_round', public.writing_next_round(v_uid, p_set_id),
    'review', public.writing_review_state(v_uid, p_set_id),
    'is_late', public.writing_set_is_late(p_set_id),
    'is_overdue', public.writing_set_is_overdue(p_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

revoke all on function public.writing_review_round(uuid, uuid) from public;
revoke all on function public.writing_review_state(uuid, uuid) from public;
