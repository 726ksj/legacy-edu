-- 지각 기준 변경:
--  1) 지각 = 해당 주차가 끝난 뒤 5일 이내(KST)에 응시한 경우. 점수는 그대로
--     반영하고(성적 리포트/학습 결과 기록) 지각임을 표시한다.
--  2) 기한 초과 = 주차 종료 후 5일이 지난 뒤에 응시한 경우. 응시는 막지 않고
--     is_overdue로 표시한다.
-- 기존 시도의 is_late 값은 그대로 두며 소급하지 않는다.

alter table public.vocab_test_attempts
  add column if not exists is_overdue boolean not null default false;
alter table public.writing_attempts
  add column if not exists is_overdue boolean not null default false;

-- 주차의 마지막 날(강좌 시작일 + 7 × 주차 - 1). 시작일이나 주차가 없으면 null.
create or replace function public.week_end_date(p_course uuid, p_week smallint)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select case when c.start_date is null or p_week is null then null
    else c.start_date + (p_week * 7 - 1) end
  from public.courses c where c.id = p_course
$$;

-- 주차 종료 후 5일 이내(종료일 다음 날부터 5일째까지).
create or replace function public.week_is_late(p_course uuid, p_week smallint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (now() at time zone 'Asia/Seoul')::date > public.week_end_date(p_course, p_week)
    and (now() at time zone 'Asia/Seoul')::date <= public.week_end_date(p_course, p_week) + 5,
    false)
$$;

-- 주차 종료 후 5일을 넘긴 경우.
create or replace function public.week_is_overdue(p_course uuid, p_week smallint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (now() at time zone 'Asia/Seoul')::date > public.week_end_date(p_course, p_week) + 5,
    false)
$$;

create or replace function public.vocab_set_is_overdue(p_set uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(bool_or(public.week_is_overdue(va.course_id, vs.week)), false)
  from public.vocab_assignments va
  join public.vocab_sets vs on vs.id = va.vocab_set_id
  where va.vocab_set_id = p_set and va.course_id is not null
    and public.is_course_member(va.course_id)
$$;

create or replace function public.writing_set_is_overdue(p_set uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.week_is_overdue(ws.course_id, ws.week), false)
  from public.writing_sets ws where ws.id = p_set
$$;

-- is_overdue는 첫 응시 시점으로 정해 같은 세트의 이후 응시에 그대로 이어진다.
create or replace function public.stamp_vocab_attempt_overdue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_overdue := coalesce(
    (select a.is_overdue from public.vocab_test_attempts a
     where a.profile_id = new.profile_id and a.vocab_set_id = new.vocab_set_id
       and a.round_no = 1),
    public.vocab_set_is_overdue(new.vocab_set_id)
  );
  return new;
end;
$$;

create or replace function public.stamp_writing_attempt_overdue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_overdue := coalesce(
    (select a.is_overdue from public.writing_attempts a
     where a.profile_id = new.profile_id and a.writing_set_id = new.writing_set_id
     order by a.started_at limit 1),
    public.writing_set_is_overdue(new.writing_set_id)
  );
  return new;
end;
$$;

drop trigger if exists stamp_overdue on public.vocab_test_attempts;
create trigger stamp_overdue before insert on public.vocab_test_attempts
  for each row execute function public.stamp_vocab_attempt_overdue();
drop trigger if exists stamp_overdue on public.writing_attempts;
create trigger stamp_overdue before insert on public.writing_attempts
  for each row execute function public.stamp_writing_attempt_overdue();

-- 아래 함수들은 20261005000000 버전에서 지각 응시 성적 제외를 없애고
-- is_overdue 응답을 더한 것이다.

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
    'is_overdue', coalesce(
      (select a.is_overdue from public.vocab_test_attempts a
       where a.profile_id = v_uid and a.vocab_set_id = p_vocab_set_id and a.round_no = 1),
      public.vocab_set_is_overdue(p_vocab_set_id)
    ),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
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
    ),
    'is_overdue', coalesce(
      (select a.is_overdue from public.writing_attempts a
       where a.profile_id = v_uid and a.writing_set_id = p_set_id
       order by a.started_at limit 1),
      public.writing_set_is_overdue(p_set_id)
    )
  );
end;
$$;

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

revoke all on function public.week_end_date(uuid, smallint) from public;
revoke all on function public.week_is_late(uuid, smallint) from public;
revoke all on function public.week_is_overdue(uuid, smallint) from public;
revoke all on function public.vocab_set_is_overdue(uuid) from public;
revoke all on function public.writing_set_is_overdue(uuid) from public;
revoke all on function public.stamp_vocab_attempt_overdue() from public;
revoke all on function public.stamp_writing_attempt_overdue() from public;
