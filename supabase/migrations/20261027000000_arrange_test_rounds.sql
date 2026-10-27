-- 순서 배열 · 문장 배열 · 어순 배열 시험을 단어(VOCA)와 같은 회차 구조로 바꾼다.
--
--   1 = 1차 시험        세트의 전체 문제
--   2 = 1차 재시험      1차 시험에서 틀린 문제만(없으면 건너뜀)
--   3 = 2차 시험        세트의 전체 문제(배치·보기를 다시 섞는다)
--   4 = 2차 재시험      2차 시험에서 틀린 문제만(없으면 건너뜀)
--   5 = 3차 재시험      1차 시험과 2차 시험에서 모두 틀린 문제만(없으면 건너뜀)
-- 하나도 안 틀리면 2회(1차·2차 시험), 계속 틀리면 최대 5회.
-- 한 회차에서 문제마다 한 번만 풀고(정답/오답), 회차 점수 = 맞힌 수 / 문제 수 × 100.
-- 종합 점수 = 1차 시험 × 40% + 2차 시험 × 60%(단어와 같다)이고, 2차 시험을 마칠 때
-- 성적 리포트에 한 번 남긴다. 세트의 "완료"는 2차 시험을 마친 것이다.
--
-- 기존 기록: round_no 기본값이 1이라 지금까지 푼 문제는 모두 1차 시험 기록으로 이어진다
-- (이어서 1차 재시험/2차 시험을 보게 된다). 어순 배열은 같은 문장을 여러 번 풀 수 있었으므로
-- 1차 시험의 정오는 "첫 시도(attempt_no = 1)"의 결과로 본다. 예전 완료 표(*_set_completions)와
-- 문장별 점수 표(writing_sentence_results)는 더 이상 쓰지 않고 남겨 둔다.
--
-- 지각/기한 초과는 부모 시험(1·2차 재시험은 1차 시험, 2차 시험과 그 재시험은 2차 시험)의
-- 첫 응시 시점으로 정하고, 부모 응시가 없으면 지금 기준으로 계산한다.


-- ===== 순서 배열 (order) : 회차 구조 =====

alter table public.order_attempts add column if not exists round_no smallint not null default 1;
alter table public.order_attempts drop constraint if exists order_attempts_round_no_check;
alter table public.order_attempts add constraint order_attempts_round_no_check check (round_no between 1 and 5);

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.order_attempts'::regclass and contype = 'u'
  loop
    execute format('alter table public.order_attempts drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.order_attempts
  add constraint order_attempts_round_uniq unique (profile_id, question_id, round_no);

-- 한 회차에 나오는 문제들. 재시험은 앞선 시험에서 틀린 문제만 나온다.
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
      p_round in (1, 3)
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

-- 회차 상태: none(시작 안 함) / in_progress / completed.
create or replace function public.order_round_state(p_uid uuid, p_set uuid, p_round smallint)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_started integer;
  v_answered integer;
begin
  select count(*) into v_total from public.order_round_members(p_uid, p_set, p_round);

  select count(*), count(*) filter (where a.answered_at is not null)
  into v_started, v_answered
  from public.order_attempts a
  where a.profile_id = p_uid and a.order_set_id = p_set and a.round_no = p_round
    and a.question_id in (select public.order_round_members(p_uid, p_set, p_round));

  if v_started = 0 then
    return 'none';
  end if;
  if v_total > 0 and v_answered >= v_total then
    return 'completed';
  end if;
  return 'in_progress';
end;
$$;

-- 다음에 시작할 회차. 풀던 회차가 있으면 새 회차는 없고(그 회차를 이어서 푼다),
-- 더 볼 회차가 없으면 null.
create or replace function public.order_next_round(p_uid uuid, p_set uuid)
returns smallint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r smallint;
begin
  for r in 1..5 loop
    if public.order_round_state(p_uid, p_set, r::smallint) = 'in_progress' then
      return null;
    end if;
  end loop;

  if public.order_round_state(p_uid, p_set, 1::smallint) = 'none' then
    return 1;
  end if;
  if public.order_round_state(p_uid, p_set, 2::smallint) = 'none'
     and exists (select 1 from public.order_round_members(p_uid, p_set, 2::smallint)) then
    return 2;
  end if;
  if public.order_round_state(p_uid, p_set, 3::smallint) = 'none' then
    return 3;
  end if;
  if public.order_round_state(p_uid, p_set, 4::smallint) = 'none'
     and exists (select 1 from public.order_round_members(p_uid, p_set, 4::smallint)) then
    return 4;
  end if;
  if public.order_round_state(p_uid, p_set, 5::smallint) = 'none'
     and exists (select 1 from public.order_round_members(p_uid, p_set, 5::smallint)) then
    return 5;
  end if;
  return null;
end;
$$;

-- 지금 풀 회차: 풀던 회차, 없으면 다음 회차.
create or replace function public.order_current_round(p_uid uuid, p_set uuid)
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r::smallint from generate_series(1, 5) r
     where public.order_round_state(p_uid, p_set, r::smallint) = 'in_progress'
     limit 1),
    public.order_next_round(p_uid, p_set)
  )
$$;

-- 이 회차를 시작할 때 적용할 지각/기한 초과. 부모 시험의 첫 응시 값을 따른다.
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

-- 한 회차의 점수 요약 {correct, total, answered, completed, score}.
create or replace function public.order_round_summary(p_uid uuid, p_set uuid, p_round smallint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_answered integer;
  v_correct integer;
begin
  select count(*) into v_total from public.order_round_members(p_uid, p_set, p_round);

  select count(*) filter (where a.answered_at is not null), count(*) filter (where a.is_correct)
  into v_answered, v_correct
  from public.order_attempts a
  where a.profile_id = p_uid and a.order_set_id = p_set and a.round_no = p_round
    and a.question_id in (select public.order_round_members(p_uid, p_set, p_round));

  return jsonb_build_object(
    'total', v_total,
    'answered', v_answered,
    'correct', v_correct,
    'completed', v_total > 0 and v_answered >= v_total,
    'score', case when v_total > 0 and v_answered >= v_total
      then round(v_correct * 100.0 / v_total) end
  );
end;
$$;

-- 단어(VOCA)의 get_vocab_test_status와 같은 모양의 회차 현황.
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
    'is_late', public.order_set_is_late(p_set_id),
    'is_overdue', public.order_set_is_overdue(p_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

-- 한 회차의 문제별 진행(풀이 화면용). p_round를 생략하면 지금 풀 회차.
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
     and v_round is distinct from public.order_next_round(v_uid, p_set_id) then
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

-- 세트 요약(학습 결과·홈 요약용): 2차 시험을 마쳤으면 완료, 점수는 종합 점수.
create or replace function public.order_set_summary(p_uid uuid, p_set uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_r1 jsonb := public.order_round_summary(p_uid, p_set, 1::smallint);
  v_r3 jsonb := public.order_round_summary(p_uid, p_set, 3::smallint);
  v_first numeric := (v_r1 ->> 'score')::numeric;
  v_final numeric := (v_r3 ->> 'score')::numeric;
  v_done boolean := (v_r3 ->> 'completed')::boolean;
begin
  return jsonb_build_object(
    'completed', v_done,
    'first_score', v_first,
    'final_score', v_final,
    'score', case when v_done then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end,
    'correct', case when v_done then (v_r3 ->> 'correct')::int end,
    'total', (v_r3 ->> 'total')::int,
    'answered', (
      select count(*) from public.order_attempts a
      where a.profile_id = p_uid and a.order_set_id = p_set and a.answered_at is not null),
    'completed_at', case when v_done then (
      select max(a.answered_at) from public.order_attempts a
      where a.profile_id = p_uid and a.order_set_id = p_set and a.round_no = 3) end,
    'is_late', coalesce((
      select bool_or(a.is_late) from public.order_attempts a
      where a.profile_id = p_uid and a.order_set_id = p_set and a.round_no in (1, 3)), false),
    'is_overdue', coalesce((
      select bool_or(a.is_overdue) from public.order_attempts a
      where a.profile_id = p_uid and a.order_set_id = p_set and a.round_no in (1, 3)), false)
  );
end;
$$;

-- 내가 볼 수 있는 모든 순서 배열 세트와 결과.
create or replace function public.get_order_overview()
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
        'id', s.id,
        'title', s.title,
        'week', s.week,
        'course_id', s.course_id,
        'total', (select count(*) from public.order_questions q where q.order_set_id = s.id),
        'answered', (sm ->> 'answered')::int,
        'completed', (sm ->> 'completed')::boolean,
        'score', sm -> 'score',
        'correct', sm -> 'correct',
        'first_score', sm -> 'first_score',
        'final_score', sm -> 'final_score',
        'completed_at', sm -> 'completed_at',
        'is_late', (sm ->> 'is_late')::boolean,
        'is_overdue', (sm ->> 'is_overdue')::boolean
      )
      order by s.week nulls last, s.created_at
    )
    from public.order_sets s
    cross join lateral (select public.order_set_summary(v_uid, s.id) as sm) x
    where not s.is_hidden and public.is_course_member(s.course_id)
  ), '[]'::jsonb);
end;
$$;

-- 2차 시험을 마칠 때 성적 리포트에 종합 점수를 한 번 남긴다. 회차를 막 끝낸 답안 제출에서 부른다.
create or replace function public.order_after_answer(p_uid uuid, p_set uuid, p_round smallint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sum jsonb := public.order_round_summary(p_uid, p_set, p_round);
  v_all jsonb;
  v_title text;
begin
  if not (v_sum ->> 'completed')::boolean then
    return false;
  end if;

  if p_round = 3 then
    v_all := public.order_set_summary(p_uid, p_set);
    select title into v_title from public.order_sets where id = p_set;
    insert into public.score_reports
      (profile_id, report_type, title, score, exam_date, extra_data)
    values
      (p_uid, 'order_test', coalesce(v_title, '순서 배열 테스트'), (v_all ->> 'score'), current_date,
       jsonb_build_object(
         'first_score', v_all -> 'first_score',
         'final_score', v_all -> 'final_score',
         'correct_count', v_all -> 'correct',
         'total_count', v_all -> 'total'));
  end if;
  return true;
end;
$$;

-- ===== 문장 배열 (sentence) : 회차 구조 =====

alter table public.sentence_attempts add column if not exists round_no smallint not null default 1;
alter table public.sentence_attempts drop constraint if exists sentence_attempts_round_no_check;
alter table public.sentence_attempts add constraint sentence_attempts_round_no_check check (round_no between 1 and 5);

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.sentence_attempts'::regclass and contype = 'u'
  loop
    execute format('alter table public.sentence_attempts drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.sentence_attempts
  add constraint sentence_attempts_round_uniq unique (profile_id, question_id, round_no);

-- 한 회차에 나오는 문제들. 재시험은 앞선 시험에서 틀린 문제만 나온다.
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
      p_round in (1, 3)
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

-- 회차 상태: none(시작 안 함) / in_progress / completed.
create or replace function public.sentence_round_state(p_uid uuid, p_set uuid, p_round smallint)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_started integer;
  v_answered integer;
begin
  select count(*) into v_total from public.sentence_round_members(p_uid, p_set, p_round);

  select count(*), count(*) filter (where a.answered_at is not null)
  into v_started, v_answered
  from public.sentence_attempts a
  where a.profile_id = p_uid and a.sentence_set_id = p_set and a.round_no = p_round
    and a.question_id in (select public.sentence_round_members(p_uid, p_set, p_round));

  if v_started = 0 then
    return 'none';
  end if;
  if v_total > 0 and v_answered >= v_total then
    return 'completed';
  end if;
  return 'in_progress';
end;
$$;

-- 다음에 시작할 회차. 풀던 회차가 있으면 새 회차는 없고(그 회차를 이어서 푼다),
-- 더 볼 회차가 없으면 null.
create or replace function public.sentence_next_round(p_uid uuid, p_set uuid)
returns smallint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r smallint;
begin
  for r in 1..5 loop
    if public.sentence_round_state(p_uid, p_set, r::smallint) = 'in_progress' then
      return null;
    end if;
  end loop;

  if public.sentence_round_state(p_uid, p_set, 1::smallint) = 'none' then
    return 1;
  end if;
  if public.sentence_round_state(p_uid, p_set, 2::smallint) = 'none'
     and exists (select 1 from public.sentence_round_members(p_uid, p_set, 2::smallint)) then
    return 2;
  end if;
  if public.sentence_round_state(p_uid, p_set, 3::smallint) = 'none' then
    return 3;
  end if;
  if public.sentence_round_state(p_uid, p_set, 4::smallint) = 'none'
     and exists (select 1 from public.sentence_round_members(p_uid, p_set, 4::smallint)) then
    return 4;
  end if;
  if public.sentence_round_state(p_uid, p_set, 5::smallint) = 'none'
     and exists (select 1 from public.sentence_round_members(p_uid, p_set, 5::smallint)) then
    return 5;
  end if;
  return null;
end;
$$;

-- 지금 풀 회차: 풀던 회차, 없으면 다음 회차.
create or replace function public.sentence_current_round(p_uid uuid, p_set uuid)
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r::smallint from generate_series(1, 5) r
     where public.sentence_round_state(p_uid, p_set, r::smallint) = 'in_progress'
     limit 1),
    public.sentence_next_round(p_uid, p_set)
  )
$$;

-- 이 회차를 시작할 때 적용할 지각/기한 초과. 부모 시험의 첫 응시 값을 따른다.
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

-- 한 회차의 점수 요약 {correct, total, answered, completed, score}.
create or replace function public.sentence_round_summary(p_uid uuid, p_set uuid, p_round smallint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_answered integer;
  v_correct integer;
begin
  select count(*) into v_total from public.sentence_round_members(p_uid, p_set, p_round);

  select count(*) filter (where a.answered_at is not null), count(*) filter (where a.is_correct)
  into v_answered, v_correct
  from public.sentence_attempts a
  where a.profile_id = p_uid and a.sentence_set_id = p_set and a.round_no = p_round
    and a.question_id in (select public.sentence_round_members(p_uid, p_set, p_round));

  return jsonb_build_object(
    'total', v_total,
    'answered', v_answered,
    'correct', v_correct,
    'completed', v_total > 0 and v_answered >= v_total,
    'score', case when v_total > 0 and v_answered >= v_total
      then round(v_correct * 100.0 / v_total) end
  );
end;
$$;

-- 단어(VOCA)의 get_vocab_test_status와 같은 모양의 회차 현황.
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
    'is_late', public.sentence_set_is_late(p_set_id),
    'is_overdue', public.sentence_set_is_overdue(p_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

-- 한 회차의 문제별 진행(풀이 화면용). p_round를 생략하면 지금 풀 회차.
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
     and v_round is distinct from public.sentence_next_round(v_uid, p_set_id) then
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

-- 세트 요약(학습 결과·홈 요약용): 2차 시험을 마쳤으면 완료, 점수는 종합 점수.
create or replace function public.sentence_set_summary(p_uid uuid, p_set uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_r1 jsonb := public.sentence_round_summary(p_uid, p_set, 1::smallint);
  v_r3 jsonb := public.sentence_round_summary(p_uid, p_set, 3::smallint);
  v_first numeric := (v_r1 ->> 'score')::numeric;
  v_final numeric := (v_r3 ->> 'score')::numeric;
  v_done boolean := (v_r3 ->> 'completed')::boolean;
begin
  return jsonb_build_object(
    'completed', v_done,
    'first_score', v_first,
    'final_score', v_final,
    'score', case when v_done then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end,
    'correct', case when v_done then (v_r3 ->> 'correct')::int end,
    'total', (v_r3 ->> 'total')::int,
    'answered', (
      select count(*) from public.sentence_attempts a
      where a.profile_id = p_uid and a.sentence_set_id = p_set and a.answered_at is not null),
    'completed_at', case when v_done then (
      select max(a.answered_at) from public.sentence_attempts a
      where a.profile_id = p_uid and a.sentence_set_id = p_set and a.round_no = 3) end,
    'is_late', coalesce((
      select bool_or(a.is_late) from public.sentence_attempts a
      where a.profile_id = p_uid and a.sentence_set_id = p_set and a.round_no in (1, 3)), false),
    'is_overdue', coalesce((
      select bool_or(a.is_overdue) from public.sentence_attempts a
      where a.profile_id = p_uid and a.sentence_set_id = p_set and a.round_no in (1, 3)), false)
  );
end;
$$;

-- 내가 볼 수 있는 모든 문장 배열 세트와 결과.
create or replace function public.get_sentence_overview()
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
        'id', s.id,
        'title', s.title,
        'week', s.week,
        'course_id', s.course_id,
        'total', (select count(*) from public.sentence_questions q where q.sentence_set_id = s.id),
        'answered', (sm ->> 'answered')::int,
        'completed', (sm ->> 'completed')::boolean,
        'score', sm -> 'score',
        'correct', sm -> 'correct',
        'first_score', sm -> 'first_score',
        'final_score', sm -> 'final_score',
        'completed_at', sm -> 'completed_at',
        'is_late', (sm ->> 'is_late')::boolean,
        'is_overdue', (sm ->> 'is_overdue')::boolean
      )
      order by s.week nulls last, s.created_at
    )
    from public.sentence_sets s
    cross join lateral (select public.sentence_set_summary(v_uid, s.id) as sm) x
    where not s.is_hidden and public.is_course_member(s.course_id)
  ), '[]'::jsonb);
end;
$$;

-- 2차 시험을 마칠 때 성적 리포트에 종합 점수를 한 번 남긴다. 회차를 막 끝낸 답안 제출에서 부른다.
create or replace function public.sentence_after_answer(p_uid uuid, p_set uuid, p_round smallint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sum jsonb := public.sentence_round_summary(p_uid, p_set, p_round);
  v_all jsonb;
  v_title text;
begin
  if not (v_sum ->> 'completed')::boolean then
    return false;
  end if;

  if p_round = 3 then
    v_all := public.sentence_set_summary(p_uid, p_set);
    select title into v_title from public.sentence_sets where id = p_set;
    insert into public.score_reports
      (profile_id, report_type, title, score, exam_date, extra_data)
    values
      (p_uid, 'sentence_test', coalesce(v_title, '문장 배열 테스트'), (v_all ->> 'score'), current_date,
       jsonb_build_object(
         'first_score', v_all -> 'first_score',
         'final_score', v_all -> 'final_score',
         'correct_count', v_all -> 'correct',
         'total_count', v_all -> 'total'));
  end if;
  return true;
end;
$$;

-- ===== 어순 배열 (writing) : 회차 구조 =====

alter table public.writing_attempts add column if not exists round_no smallint not null default 1;
alter table public.writing_attempts drop constraint if exists writing_attempts_round_no_check;
alter table public.writing_attempts add constraint writing_attempts_round_no_check check (round_no between 1 and 5);

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.writing_attempts'::regclass and contype = 'u'
  loop
    execute format('alter table public.writing_attempts drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.writing_attempts
  add constraint writing_attempts_round_uniq unique (profile_id, sentence_id, round_no, attempt_no);

-- 한 회차에 나오는 문제들. 재시험은 앞선 시험에서 틀린 문제만 나온다.
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
      p_round in (1, 3)
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

-- 회차 상태: none(시작 안 함) / in_progress / completed.
create or replace function public.writing_round_state(p_uid uuid, p_set uuid, p_round smallint)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_started integer;
  v_answered integer;
begin
  select count(*) into v_total from public.writing_round_members(p_uid, p_set, p_round);

  select count(*), count(*) filter (where a.submitted_at is not null)
  into v_started, v_answered
  from public.writing_attempts a
  where a.profile_id = p_uid and a.writing_set_id = p_set and a.round_no = p_round and a.attempt_no = 1
    and a.sentence_id in (select public.writing_round_members(p_uid, p_set, p_round));

  if v_started = 0 then
    return 'none';
  end if;
  if v_total > 0 and v_answered >= v_total then
    return 'completed';
  end if;
  return 'in_progress';
end;
$$;

-- 다음에 시작할 회차. 풀던 회차가 있으면 새 회차는 없고(그 회차를 이어서 푼다),
-- 더 볼 회차가 없으면 null.
create or replace function public.writing_next_round(p_uid uuid, p_set uuid)
returns smallint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r smallint;
begin
  for r in 1..5 loop
    if public.writing_round_state(p_uid, p_set, r::smallint) = 'in_progress' then
      return null;
    end if;
  end loop;

  if public.writing_round_state(p_uid, p_set, 1::smallint) = 'none' then
    return 1;
  end if;
  if public.writing_round_state(p_uid, p_set, 2::smallint) = 'none'
     and exists (select 1 from public.writing_round_members(p_uid, p_set, 2::smallint)) then
    return 2;
  end if;
  if public.writing_round_state(p_uid, p_set, 3::smallint) = 'none' then
    return 3;
  end if;
  if public.writing_round_state(p_uid, p_set, 4::smallint) = 'none'
     and exists (select 1 from public.writing_round_members(p_uid, p_set, 4::smallint)) then
    return 4;
  end if;
  if public.writing_round_state(p_uid, p_set, 5::smallint) = 'none'
     and exists (select 1 from public.writing_round_members(p_uid, p_set, 5::smallint)) then
    return 5;
  end if;
  return null;
end;
$$;

-- 지금 풀 회차: 풀던 회차, 없으면 다음 회차.
create or replace function public.writing_current_round(p_uid uuid, p_set uuid)
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select r::smallint from generate_series(1, 5) r
     where public.writing_round_state(p_uid, p_set, r::smallint) = 'in_progress'
     limit 1),
    public.writing_next_round(p_uid, p_set)
  )
$$;

-- 이 회차를 시작할 때 적용할 지각/기한 초과. 부모 시험의 첫 응시 값을 따른다.
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

-- 한 회차의 점수 요약 {correct, total, answered, completed, score}.
create or replace function public.writing_round_summary(p_uid uuid, p_set uuid, p_round smallint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_answered integer;
  v_correct integer;
begin
  select count(*) into v_total from public.writing_round_members(p_uid, p_set, p_round);

  select count(*) filter (where a.submitted_at is not null), count(*) filter (where a.is_correct)
  into v_answered, v_correct
  from public.writing_attempts a
  where a.profile_id = p_uid and a.writing_set_id = p_set and a.round_no = p_round and a.attempt_no = 1
    and a.sentence_id in (select public.writing_round_members(p_uid, p_set, p_round));

  return jsonb_build_object(
    'total', v_total,
    'answered', v_answered,
    'correct', v_correct,
    'completed', v_total > 0 and v_answered >= v_total,
    'score', case when v_total > 0 and v_answered >= v_total
      then round(v_correct * 100.0 / v_total) end
  );
end;
$$;

-- 단어(VOCA)의 get_vocab_test_status와 같은 모양의 회차 현황.
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
    'is_late', public.writing_set_is_late(p_set_id),
    'is_overdue', public.writing_set_is_overdue(p_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;

-- 한 회차의 문제별 진행(풀이 화면용). p_round를 생략하면 지금 풀 회차.
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
     and v_round is distinct from public.writing_next_round(v_uid, p_set_id) then
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

-- 세트 요약(학습 결과·홈 요약용): 2차 시험을 마쳤으면 완료, 점수는 종합 점수.
create or replace function public.writing_set_summary(p_uid uuid, p_set uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_r1 jsonb := public.writing_round_summary(p_uid, p_set, 1::smallint);
  v_r3 jsonb := public.writing_round_summary(p_uid, p_set, 3::smallint);
  v_first numeric := (v_r1 ->> 'score')::numeric;
  v_final numeric := (v_r3 ->> 'score')::numeric;
  v_done boolean := (v_r3 ->> 'completed')::boolean;
begin
  return jsonb_build_object(
    'completed', v_done,
    'first_score', v_first,
    'final_score', v_final,
    'score', case when v_done then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end,
    'correct', case when v_done then (v_r3 ->> 'correct')::int end,
    'total', (v_r3 ->> 'total')::int,
    'answered', (
      select count(*) from public.writing_attempts a
      where a.profile_id = p_uid and a.writing_set_id = p_set and a.submitted_at is not null and a.attempt_no = 1),
    'completed_at', case when v_done then (
      select max(a.submitted_at) from public.writing_attempts a
      where a.profile_id = p_uid and a.writing_set_id = p_set and a.round_no = 3 and a.attempt_no = 1) end,
    'is_late', coalesce((
      select bool_or(a.is_late) from public.writing_attempts a
      where a.profile_id = p_uid and a.writing_set_id = p_set and a.round_no in (1, 3) and a.attempt_no = 1), false),
    'is_overdue', coalesce((
      select bool_or(a.is_overdue) from public.writing_attempts a
      where a.profile_id = p_uid and a.writing_set_id = p_set and a.round_no in (1, 3) and a.attempt_no = 1), false)
  );
end;
$$;

-- 내가 볼 수 있는 모든 어순 배열 세트와 결과.
create or replace function public.get_writing_overview()
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
        'id', s.id,
        'title', s.title,
        'week', s.week,
        'course_id', s.course_id,
        'total', (select count(*) from public.writing_sentences q where q.writing_set_id = s.id),
        'answered', (sm ->> 'answered')::int,
        'completed', (sm ->> 'completed')::boolean,
        'score', sm -> 'score',
        'correct', sm -> 'correct',
        'first_score', sm -> 'first_score',
        'final_score', sm -> 'final_score',
        'completed_at', sm -> 'completed_at',
        'is_late', (sm ->> 'is_late')::boolean,
        'is_overdue', (sm ->> 'is_overdue')::boolean
      )
      order by s.week nulls last, s.created_at
    )
    from public.writing_sets s
    cross join lateral (select public.writing_set_summary(v_uid, s.id) as sm) x
    where not s.is_hidden and public.is_course_member(s.course_id)
  ), '[]'::jsonb);
end;
$$;

-- 2차 시험을 마칠 때 성적 리포트에 종합 점수를 한 번 남긴다. 회차를 막 끝낸 답안 제출에서 부른다.
create or replace function public.writing_after_answer(p_uid uuid, p_set uuid, p_round smallint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sum jsonb := public.writing_round_summary(p_uid, p_set, p_round);
  v_all jsonb;
  v_title text;
begin
  if not (v_sum ->> 'completed')::boolean then
    return false;
  end if;

  if p_round = 3 then
    v_all := public.writing_set_summary(p_uid, p_set);
    select title into v_title from public.writing_sets where id = p_set;
    insert into public.score_reports
      (profile_id, report_type, title, score, exam_date, extra_data)
    values
      (p_uid, 'writing_test', coalesce(v_title, '어순 배열 테스트'), (v_all ->> 'score'), current_date,
       jsonb_build_object(
         'first_score', v_all -> 'first_score',
         'final_score', v_all -> 'final_score',
         'correct_count', v_all -> 'correct',
         'total_count', v_all -> 'total'));
  end if;
  return true;
end;
$$;

drop function if exists public.start_order_attempt(uuid);
drop function if exists public.get_order_set_progress(uuid);

-- 한 문제 풀이 시작(또는 이어하기). 회차마다 세 덩어리 배치와 보기를 새로 섞어 저장한다.
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

  if p_round is null or p_round < 1 or p_round > 5 then
    raise exception 'invalid round';
  end if;
  if not exists (
    select 1 from public.order_round_members(v_uid, v_q.order_set_id, p_round) m
    where m = p_question_id
  ) then
    raise exception 'question not in round';
  end if;
  if public.order_round_state(v_uid, v_q.order_set_id, p_round) = 'none'
     and p_round is distinct from public.order_next_round(v_uid, v_q.order_set_id) then
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

-- 보기 선택 제출. 한 번 답하면 바꿀 수 없다. 회차의 마지막 문제면 round_completed.
create or replace function public.answer_order_question(
  p_attempt_id uuid,
  p_selected_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_a public.order_attempts%rowtype;
  v_done boolean := false;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_a
  from public.order_attempts
  where id = p_attempt_id and profile_id = v_uid
  for update;
  if not found then
    raise exception 'attempt not found';
  end if;

  if v_a.answered_at is null then
    if p_selected_index is null or p_selected_index < 0
       or p_selected_index >= jsonb_array_length(v_a.options) then
      raise exception 'invalid choice';
    end if;

    update public.order_attempts
    set selected_index = p_selected_index,
        is_correct = (p_selected_index = v_a.correct_index),
        answered_at = now()
    where id = p_attempt_id
    returning * into v_a;

    v_done := public.order_after_answer(v_uid, v_a.order_set_id, v_a.round_no);
  end if;

  return public.order_attempt_payload(p_attempt_id)
    || jsonb_build_object(
         'correct_option', v_a.options ->> v_a.correct_index,
         'round_no', v_a.round_no,
         'round_completed', v_done,
         'set_completed', v_done
       );
end;
$$;

drop function if exists public.start_sentence_attempt(uuid);
drop function if exists public.get_sentence_set_progress(uuid);

-- 한 문제 풀이 시작(또는 이어하기). 회차마다 문장 배치를 새로 섞어 저장한다.
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

  if p_round is null or p_round < 1 or p_round > 5 then
    raise exception 'invalid round';
  end if;
  if not exists (
    select 1 from public.sentence_round_members(v_uid, v_q.sentence_set_id, p_round) m
    where m = p_question_id
  ) then
    raise exception 'question not in round';
  end if;
  if public.sentence_round_state(v_uid, v_q.sentence_set_id, p_round) = 'none'
     and p_round is distinct from public.sentence_next_round(v_uid, v_q.sentence_set_id) then
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

-- 순서 제출. p_order = 학생이 고른 순서대로 적은 화면 자리 번호(1..n 전부 한 번씩).
create or replace function public.answer_sentence_question(
  p_attempt_id uuid,
  p_order integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_a public.sentence_attempts%rowtype;
  v_n integer;
  v_match integer;
  v_done boolean := false;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_a
  from public.sentence_attempts
  where id = p_attempt_id and profile_id = v_uid
  for update;
  if not found then
    raise exception 'attempt not found';
  end if;

  if v_a.answered_at is null then
    v_n := array_length(v_a.shown_order, 1);
    if p_order is null or coalesce(array_length(p_order, 1), 0) <> v_n
       or (select count(distinct x) from unnest(p_order) x) <> v_n
       or exists (select 1 from unnest(p_order) x where x < 1 or x > v_n) then
      raise exception 'invalid order';
    end if;

    select count(*) into v_match
    from generate_series(1, v_n) j
    where v_a.shown_order[p_order[j]] = j;

    update public.sentence_attempts
    set selected_order = p_order::smallint[],
        correct_positions = v_match,
        is_correct = (v_match = v_n),
        answered_at = now()
    where id = p_attempt_id
    returning * into v_a;

    v_done := public.sentence_after_answer(v_uid, v_a.sentence_set_id, v_a.round_no);
  end if;

  return public.sentence_attempt_payload(p_attempt_id)
    || jsonb_build_object(
         'round_no', v_a.round_no,
         'round_completed', v_done,
         'set_completed', v_done
       );
end;
$$;

drop function if exists public.start_writing_attempt(uuid);
drop function if exists public.get_writing_set_progress(uuid);
-- 지각/기한 초과는 이제 시작 함수가 회차 규칙으로 정한다(예전 트리거는 세트의 첫 응시 값을 썼다).
drop trigger if exists stamp_overdue on public.writing_attempts;

-- 한 문장의 배열 풀이 시작(또는 이어하기). 회차마다 조각을 새로 섞어 저장한다.
-- 회차에서 문장마다 한 번만 풀 수 있다(다시 풀기 없음).
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

  if p_round is null or p_round < 1 or p_round > 5 then
    raise exception 'invalid round';
  end if;
  if not exists (
    select 1 from public.writing_round_members(v_uid, v_sentence.writing_set_id, p_round) m
    where m = p_sentence_id
  ) then
    raise exception 'sentence not in round';
  end if;
  if public.writing_round_state(v_uid, v_sentence.writing_set_id, p_round) = 'none'
     and p_round is distinct from public.writing_next_round(v_uid, v_sentence.writing_set_id) then
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

-- 답안 제출. p_piece_ids는 학생이 고른 조각 id를 누른 순서대로 담은 배열이다.
-- 같은 시도를 다시 제출하면 저장된 결과를 그대로 돌려준다(중복 기록 방지).
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
  v_done boolean := false;
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
      'round_no', v_attempt.round_no,
      'round_completed', false,
      'set_completed', false,
      'already_submitted', true
    );
  end if;

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

  update public.writing_attempts
  set submitted_ids = to_jsonb(p_piece_ids),
      is_correct = v_correct,
      order_accuracy = v_accuracy,
      is_official = true,
      submitted_at = now()
  where id = p_attempt_id;

  v_done := public.writing_after_answer(v_uid, v_attempt.writing_set_id, v_attempt.round_no);

  return jsonb_build_object(
    'is_correct', v_correct,
    'attempt_no', v_attempt.attempt_no,
    'english', v_sentence.english,
    'korean', v_sentence.korean,
    'chunks', v_sentence.chunks,
    'key_phrases', v_sentence.key_phrases,
    'submitted_chunks', to_jsonb(v_arrangement),
    'order_accuracy', v_accuracy,
    'round_no', v_attempt.round_no,
    'round_completed', v_done,
    'set_completed', v_done
  );
end;
$$;

-- 이번 주 할 일: 순서·문장·어순 배열의 '완료'는 2차 시험(3회)을 마친 것이다.
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
              'is_late', public.week_is_late(c.id, t.week),
              'is_overdue', public.week_is_overdue(c.id, t.week)
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
                when public.writing_round_state(v_uid, ws.id, 3::smallint) = 'completed' then 'completed'
                when exists (select 1 from public.writing_attempts a
                  where a.profile_id = v_uid and a.writing_set_id = ws.id) then 'in_progress'
                else 'not_started'
              end
            from public.writing_sets ws
            where ws.course_id = c.id and not ws.is_hidden
            union all
            select 'order'::text, os.id, os.title, os.week,
              case
                when public.order_round_state(v_uid, os.id, 3::smallint) = 'completed' then 'completed'
                when exists (select 1 from public.order_attempts a
                  where a.profile_id = v_uid and a.order_set_id = os.id) then 'in_progress'
                else 'not_started'
              end
            from public.order_sets os
            where os.course_id = c.id and not os.is_hidden
            union all
            select 'sentence'::text, ss.id, ss.title, ss.week,
              case
                when public.sentence_round_state(v_uid, ss.id, 3::smallint) = 'completed' then 'completed'
                when exists (select 1 from public.sentence_attempts a
                  where a.profile_id = v_uid and a.sentence_set_id = ss.id) then 'in_progress'
                else 'not_started'
              end
            from public.sentence_sets ss
            where ss.course_id = c.id and not ss.is_hidden
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

revoke all on function public.start_order_attempt(uuid, smallint) from public;
revoke all on function public.start_sentence_attempt(uuid, smallint) from public;
revoke all on function public.start_writing_attempt(uuid, smallint) from public;
revoke all on function public.answer_order_question(uuid, integer) from public;
revoke all on function public.answer_sentence_question(uuid, integer[]) from public;
revoke all on function public.submit_writing_attempt(uuid, integer[]) from public;

grant execute on function public.start_order_attempt(uuid, smallint) to authenticated;
grant execute on function public.start_sentence_attempt(uuid, smallint) to authenticated;
grant execute on function public.start_writing_attempt(uuid, smallint) to authenticated;
grant execute on function public.answer_order_question(uuid, integer) to authenticated;
grant execute on function public.answer_sentence_question(uuid, integer[]) to authenticated;
grant execute on function public.submit_writing_attempt(uuid, integer[]) to authenticated;

revoke all on function public.order_round_members(uuid, uuid, smallint) from public;
revoke all on function public.order_round_state(uuid, uuid, smallint) from public;
revoke all on function public.order_next_round(uuid, uuid) from public;
revoke all on function public.order_current_round(uuid, uuid) from public;
revoke all on function public.order_round_flags(uuid, uuid, smallint) from public;
revoke all on function public.order_round_summary(uuid, uuid, smallint) from public;
revoke all on function public.order_set_summary(uuid, uuid) from public;
revoke all on function public.order_after_answer(uuid, uuid, smallint) from public;
revoke all on function public.get_order_test_status(uuid) from public;
revoke all on function public.get_order_set_progress(uuid, smallint) from public;
revoke all on function public.get_order_overview() from public;

grant execute on function public.get_order_test_status(uuid) to authenticated;
grant execute on function public.get_order_set_progress(uuid, smallint) to authenticated;
grant execute on function public.get_order_overview() to authenticated;

revoke all on function public.sentence_round_members(uuid, uuid, smallint) from public;
revoke all on function public.sentence_round_state(uuid, uuid, smallint) from public;
revoke all on function public.sentence_next_round(uuid, uuid) from public;
revoke all on function public.sentence_current_round(uuid, uuid) from public;
revoke all on function public.sentence_round_flags(uuid, uuid, smallint) from public;
revoke all on function public.sentence_round_summary(uuid, uuid, smallint) from public;
revoke all on function public.sentence_set_summary(uuid, uuid) from public;
revoke all on function public.sentence_after_answer(uuid, uuid, smallint) from public;
revoke all on function public.get_sentence_test_status(uuid) from public;
revoke all on function public.get_sentence_set_progress(uuid, smallint) from public;
revoke all on function public.get_sentence_overview() from public;

grant execute on function public.get_sentence_test_status(uuid) to authenticated;
grant execute on function public.get_sentence_set_progress(uuid, smallint) to authenticated;
grant execute on function public.get_sentence_overview() to authenticated;

revoke all on function public.writing_round_members(uuid, uuid, smallint) from public;
revoke all on function public.writing_round_state(uuid, uuid, smallint) from public;
revoke all on function public.writing_next_round(uuid, uuid) from public;
revoke all on function public.writing_current_round(uuid, uuid) from public;
revoke all on function public.writing_round_flags(uuid, uuid, smallint) from public;
revoke all on function public.writing_round_summary(uuid, uuid, smallint) from public;
revoke all on function public.writing_set_summary(uuid, uuid) from public;
revoke all on function public.writing_after_answer(uuid, uuid, smallint) from public;
revoke all on function public.get_writing_test_status(uuid) from public;
revoke all on function public.get_writing_set_progress(uuid, smallint) from public;
revoke all on function public.get_writing_overview() from public;

grant execute on function public.get_writing_test_status(uuid) to authenticated;
grant execute on function public.get_writing_set_progress(uuid, smallint) to authenticated;
grant execute on function public.get_writing_overview() to authenticated;
