-- 문장 배열(S) 학습 세트와 풀이. 강좌의 한 주차에 속하고, 문제(주어진 첫 문장 1개 +
-- 정답 순서대로의 문장 3~10개) 여러 개로 이루어진다.
--
--  - sentence_questions: intro(첫 문장) + sentences(정답 순서대로의 문장 배열).
--    정답 순서가 그대로 들어 있어서 학생은 직접 읽을 수 없고(RLS), 아래 서버
--    함수로만 문제를 받는다.
--  - 출제: 서버가 문장을 무작위로 섞어 (A)(B)(C)…로 배치한다. 정답 순서와 같은
--    배치는 쓰지 않는다. 같은 문제를 다시 열면 같은 배치가 나오도록 시도에 저장한다.
--  - 풀이: 학생이 문장을 눌러 자기 순서를 만든 뒤 한 번 제출한다(다시 풀기 없음).
--    전체 순서가 모두 맞아야 정답. 몇 자리가 맞았는지(correct_positions)는 안내용이고
--    점수에는 넣지 않는다. 점수 = 맞힌 문제 수 / 전체 × 100.
--  - 지각/기한 초과는 이 세트를 처음 시작한 시점으로 정해 이후 문제에 이어진다.
-- 단어장·어순 배열·순서 배열과 마찬가지로 학생에게 개별 배정은 없고 강좌 수강생
-- 전체에게 열린다(숨김 스위치로 임시로 닫을 수 있다).

create table public.sentence_sets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  week smallint check (week between 1 and 52),
  title text not null,
  is_hidden boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index sentence_sets_course_idx on public.sentence_sets (course_id);

create table public.sentence_questions (
  id uuid primary key default gen_random_uuid(),
  sentence_set_id uuid not null references public.sentence_sets(id) on delete cascade,
  order_no integer not null,
  intro text not null,
  -- 첫 문장 뒤에 이어지는 문장들(정답 순서대로의 문자열 배열, 3~10개).
  sentences jsonb not null check (
    jsonb_typeof(sentences) = 'array'
    and jsonb_array_length(sentences) between 2 and 26
  ),
  unique (sentence_set_id, order_no)
);

create table public.sentence_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.sentence_questions(id) on delete cascade,
  sentence_set_id uuid not null references public.sentence_sets(id) on delete cascade,
  -- shown_order[p] = 화면의 p번째((A)=1, (B)=2…) 자리에 놓인 문장이 정답 순서로 몇 번째인지.
  shown_order smallint[] not null,
  -- 학생이 고른 순서: 고른 순서대로 적은 화면 자리 번호들.
  selected_order smallint[],
  is_correct boolean,
  correct_positions smallint,
  is_late boolean not null default false,
  is_overdue boolean not null default false,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (profile_id, question_id)
);

create index sentence_attempts_profile_set_idx
  on public.sentence_attempts (profile_id, sentence_set_id);

create table public.sentence_set_completions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sentence_set_id uuid not null references public.sentence_sets(id) on delete cascade,
  correct_count integer not null,
  total_count integer not null,
  score numeric not null,
  is_late boolean not null default false,
  is_overdue boolean not null default false,
  completed_at timestamptz not null default now(),
  primary key (profile_id, sentence_set_id)
);

alter table public.sentence_sets enable row level security;
alter table public.sentence_questions enable row level security;
alter table public.sentence_attempts enable row level security;
alter table public.sentence_set_completions enable row level security;

-- 학생(수강생)은 숨기지 않은 세트만 본다. 만든 강사 본인은 숨긴 것도 본다.
-- 등록/수정/삭제는 관리자 서버 액션(서비스롤)에서만 하므로 쓰기 정책은 없다.
create policy "sentence_sets_select_visible" on public.sentence_sets
  for select using (
    created_by = auth.uid()
    or (not is_hidden and public.is_course_member(course_id))
  );

-- 문제 본문에는 정답 순서가 들어 있으므로 학생에게는 직접 조회를 열지 않는다
-- (만든 강사만). 학생은 start_sentence_attempt로만 섞인 문제를 받는다.
create policy "sentence_questions_select_creator" on public.sentence_questions
  for select using (
    exists (
      select 1 from public.sentence_sets ss
      where ss.id = sentence_questions.sentence_set_id and ss.created_by = auth.uid()
    )
  );

-- sentence_attempts는 배치와 정답 정보가 들어 있어 학생 조회 정책을 만들지 않는다.
create policy "sentence_set_completions_select_own" on public.sentence_set_completions
  for select using (profile_id = auth.uid());

-- 마이페이지 > 성적 리포트에 "문장 배열 테스트" 카테고리가 뜨도록 고정 slug로 시딩.
insert into public.score_report_categories
  (slug, label, description, sort_order, max_score, extra_field_labels)
values
  (
    'sentence_test',
    '문장 배열 테스트',
    '문장 배열 풀이 결과입니다. 맞힌 문제 수를 전체 문제 수 기준 백분율로 나타냅니다.',
    (select coalesce(max(sort_order), 0) + 1 from public.score_report_categories),
    100,
    '{}'
  )
on conflict (slug) do nothing;

-- 세트의 지각/기한 초과(주차 종료 기준). 강좌/주차가 없으면 false.
create or replace function public.sentence_set_is_late(p_set uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.week_is_late(ss.course_id, ss.week), false)
  from public.sentence_sets ss where ss.id = p_set
$$;

create or replace function public.sentence_set_is_overdue(p_set uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.week_is_overdue(ss.course_id, ss.week), false)
  from public.sentence_sets ss where ss.id = p_set
$$;

-- ---------------------------------------------------------------------
-- 학생에게 내려줄 문제 모양. 정답 정보(correct_no, correct_order)는 답한 뒤에만
-- 포함한다. 내부용.
-- ---------------------------------------------------------------------
create or replace function public.sentence_attempt_payload(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'attempt_id', a.id,
    'question_id', q.id,
    'order_no', q.order_no,
    'intro', q.intro,
    'sentences', (
      select jsonb_agg(
        jsonb_build_object(
          'label', chr(64 + p),
          'text', q.sentences ->> (a.shown_order[p] - 1),
          'correct_no', case when a.answered_at is not null then a.shown_order[p] end
        )
        order by p
      )
      from generate_series(1, array_length(a.shown_order, 1)) p
    ),
    'answered', a.answered_at is not null,
    'selected_order', to_jsonb(a.selected_order),
    'is_correct', a.is_correct,
    'correct_positions', a.correct_positions,
    'correct_order', case when a.answered_at is not null then (
      select jsonb_agg(chr(64 + array_position(a.shown_order, j::smallint)) order by j)
      from generate_series(1, array_length(a.shown_order, 1)) j
    ) end
  )
  from public.sentence_attempts a
  join public.sentence_questions q on q.id = a.question_id
  where a.id = p_attempt_id
$$;

-- ---------------------------------------------------------------------
-- 한 문제 풀이 시작(또는 이어하기). 처음이면 서버가 문장을 (A)(B)(C)…에 무작위로
-- 배치해 저장한다. 정답 순서와 같은 배치는 쓰지 않는다. 같은 문제를 다시 열면
-- 저장된 배치를 그대로 돌려준다.
-- ---------------------------------------------------------------------
create or replace function public.start_sentence_attempt(p_question_id uuid)
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
  v_late boolean;
  v_overdue boolean;
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

  select id into v_attempt_id
  from public.sentence_attempts
  where profile_id = v_uid and question_id = p_question_id;

  if v_attempt_id is null then
    v_n := jsonb_array_length(v_q.sentences);
    if v_n < 2 then
      raise exception 'question has too few sentences';
    end if;
    v_identity := array(select i from generate_series(1, v_n) i);

    -- 정답 순서와 다르게 섞는다(여러 번 시도해도 같으면 거꾸로 놓는다).
    for v_try in 1..20 loop
      select array_agg(i order by random()) into v_order from generate_series(1, v_n) i;
      exit when v_order is distinct from v_identity;
    end loop;
    if v_order is not distinct from v_identity then
      select array_agg(i order by i desc) into v_order from generate_series(1, v_n) i;
    end if;

    -- 지각/기한 초과는 이 세트를 처음 시작한 시점으로 정해 이후 문제에 이어진다.
    select a.is_late, a.is_overdue into v_late, v_overdue
    from public.sentence_attempts a
    where a.profile_id = v_uid and a.sentence_set_id = v_q.sentence_set_id
    order by a.started_at
    limit 1;
    if not found then
      v_late := public.sentence_set_is_late(v_q.sentence_set_id);
      v_overdue := public.sentence_set_is_overdue(v_q.sentence_set_id);
    end if;

    insert into public.sentence_attempts
      (profile_id, question_id, sentence_set_id, shown_order, is_late, is_overdue)
    values
      (v_uid, p_question_id, v_q.sentence_set_id, v_order::smallint[], v_late, v_overdue)
    returning id into v_attempt_id;
  end if;

  return public.sentence_attempt_payload(v_attempt_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 순서 제출. p_order = 학생이 고른 순서대로 적은 화면 자리 번호(1..n 전부 한 번씩).
-- 한 번 답하면 바꿀 수 없다. 모든 문제에 답하면 세트 결과와 성적 리포트를 남긴다.
-- ---------------------------------------------------------------------
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
  v_total integer;
  v_done integer;
  v_correct integer;
  v_score numeric;
  v_completed boolean := false;
  v_title text;
  v_late boolean;
  v_overdue boolean;
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
    -- 1..n을 전부 한 번씩 고른 순서여야 한다.
    if p_order is null or coalesce(array_length(p_order, 1), 0) <> v_n
       or (select count(distinct x) from unnest(p_order) x) <> v_n
       or exists (select 1 from unnest(p_order) x where x < 1 or x > v_n) then
      raise exception 'invalid order';
    end if;

    -- j번째로 고른 문장이 정답 순서로 j번째인 자리의 수
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

    select count(*) into v_total
    from public.sentence_questions where sentence_set_id = v_a.sentence_set_id;
    select count(*), count(*) filter (where is_correct) into v_done, v_correct
    from public.sentence_attempts
    where profile_id = v_uid and sentence_set_id = v_a.sentence_set_id and answered_at is not null;

    if v_total > 0 and v_done >= v_total and not exists (
      select 1 from public.sentence_set_completions
      where profile_id = v_uid and sentence_set_id = v_a.sentence_set_id
    ) then
      v_completed := true;
      v_score := round(v_correct * 100.0 / v_total);
      select title into v_title from public.sentence_sets where id = v_a.sentence_set_id;
      select a.is_late, a.is_overdue into v_late, v_overdue
      from public.sentence_attempts a
      where a.profile_id = v_uid and a.sentence_set_id = v_a.sentence_set_id
      order by a.started_at limit 1;

      insert into public.sentence_set_completions
        (profile_id, sentence_set_id, correct_count, total_count, score, is_late, is_overdue)
      values (v_uid, v_a.sentence_set_id, v_correct, v_total, v_score,
              coalesce(v_late, false), coalesce(v_overdue, false));

      insert into public.score_reports
        (profile_id, report_type, title, score, exam_date, extra_data)
      values
        (v_uid, 'sentence_test', coalesce(v_title, '문장 배열 테스트'), v_score::text, current_date,
         jsonb_build_object('correct_count', v_correct, 'total_count', v_total));
    end if;
  end if;

  return public.sentence_attempt_payload(p_attempt_id)
    || jsonb_build_object('set_completed', v_completed);
end;
$$;

-- ---------------------------------------------------------------------
-- 한 세트의 내 진행 상황(문제별 풀이 여부, 점수, 지각 표시).
-- ---------------------------------------------------------------------
create or replace function public.get_sentence_set_progress(p_set_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_set public.sentence_sets%rowtype;
  v_questions jsonb;
  v_total integer;
  v_answered integer;
  v_correct integer;
  v_k public.sentence_set_completions%rowtype;
  v_late boolean;
  v_overdue boolean;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_set
  from public.sentence_sets ss
  where ss.id = p_set_id and not ss.is_hidden and public.is_course_member(ss.course_id);
  if not found then
    raise exception 'set not available';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'question_id', q.id,
      'order_no', q.order_no,
      'attempt_id', a.id,
      'answered', a.answered_at is not null,
      'is_correct', a.is_correct
    ) order by q.order_no
  ), '[]'::jsonb),
  count(*),
  count(*) filter (where a.answered_at is not null),
  count(*) filter (where a.is_correct)
  into v_questions, v_total, v_answered, v_correct
  from public.sentence_questions q
  left join public.sentence_attempts a on a.question_id = q.id and a.profile_id = v_uid
  where q.sentence_set_id = p_set_id;

  select * into v_k from public.sentence_set_completions
  where profile_id = v_uid and sentence_set_id = p_set_id;

  select a.is_late, a.is_overdue into v_late, v_overdue
  from public.sentence_attempts a
  where a.profile_id = v_uid and a.sentence_set_id = p_set_id
  order by a.started_at limit 1;
  if not found then
    v_late := public.sentence_set_is_late(p_set_id);
    v_overdue := public.sentence_set_is_overdue(p_set_id);
  end if;

  return jsonb_build_object(
    'title', v_set.title,
    'week', v_set.week,
    'questions', v_questions,
    'total', v_total,
    'answered', v_answered,
    'correct', v_correct,
    'completed', v_k.profile_id is not null,
    'score', v_k.score,
    'is_late', v_late,
    'is_overdue', v_overdue
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 내가 볼 수 있는 모든 문장 배열 세트와 결과(학습 결과 화면용).
-- ---------------------------------------------------------------------
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
        'id', ss.id,
        'title', ss.title,
        'week', ss.week,
        'course_id', ss.course_id,
        'total', (select count(*) from public.sentence_questions q where q.sentence_set_id = ss.id),
        'answered', (select count(*) from public.sentence_attempts a
                     where a.profile_id = v_uid and a.sentence_set_id = ss.id
                       and a.answered_at is not null),
        'completed', k.profile_id is not null,
        'score', k.score,
        'correct', k.correct_count,
        'completed_at', k.completed_at,
        'is_late', coalesce(k.is_late, (
          select a.is_late from public.sentence_attempts a
          where a.profile_id = v_uid and a.sentence_set_id = ss.id
          order by a.started_at limit 1), false),
        'is_overdue', coalesce(k.is_overdue, (
          select a.is_overdue from public.sentence_attempts a
          where a.profile_id = v_uid and a.sentence_set_id = ss.id
          order by a.started_at limit 1), false)
      )
      order by ss.week nulls last, ss.created_at
    )
    from public.sentence_sets ss
    left join public.sentence_set_completions k
      on k.sentence_set_id = ss.id and k.profile_id = v_uid
    where not ss.is_hidden and public.is_course_member(ss.course_id)
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- 이번 주 할 일에 문장 배열 세트도 포함한다(20261020000000 버전에 더한 것).
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
            union all
            select 'order'::text, os.id, os.title, os.week,
              case
                when exists (select 1 from public.order_set_completions k
                  where k.profile_id = v_uid and k.order_set_id = os.id) then 'completed'
                when exists (select 1 from public.order_attempts a
                  where a.profile_id = v_uid and a.order_set_id = os.id) then 'in_progress'
                else 'not_started'
              end
            from public.order_sets os
            where os.course_id = c.id and not os.is_hidden
            union all
            select 'sentence'::text, ss.id, ss.title, ss.week,
              case
                when exists (select 1 from public.sentence_set_completions k
                  where k.profile_id = v_uid and k.sentence_set_id = ss.id) then 'completed'
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

revoke all on function public.sentence_set_is_late(uuid) from public;
revoke all on function public.sentence_set_is_overdue(uuid) from public;
revoke all on function public.sentence_attempt_payload(uuid) from public;
revoke all on function public.start_sentence_attempt(uuid) from public;
revoke all on function public.answer_sentence_question(uuid, integer[]) from public;
revoke all on function public.get_sentence_set_progress(uuid) from public;
revoke all on function public.get_sentence_overview() from public;

grant execute on function public.start_sentence_attempt(uuid) to authenticated;
grant execute on function public.answer_sentence_question(uuid, integer[]) to authenticated;
grant execute on function public.get_sentence_set_progress(uuid) to authenticated;
grant execute on function public.get_sentence_overview() to authenticated;
