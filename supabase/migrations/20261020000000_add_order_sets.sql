-- 순서 배열(O) 학습 세트와 풀이. 강좌의 한 주차에 속하고, 문제(주어진 글 1개 +
-- 정답 순서의 세 덩어리) 여러 개로 이루어진다.
--
--  - order_questions: intro(주어진 글) + part1/2/3(정답 순서대로의 세 덩어리).
--    정답 순서가 그대로 들어 있어서 학생은 직접 읽을 수 없고(RLS), 아래 서버
--    함수로만 문제를 받는다.
--  - 출제: 서버가 세 덩어리를 무작위로 (A)(B)(C)에 배치한다. 정답이 (A)-(B)-(C)가
--    되는 배치는 쓰지 않는다(찍기 방지). 보기는 정답 1개 + 오답 3개를 순서 조합
--    5가지(= 6가지에서 (A)-(B)-(C) 제외) 중에서 골라 무작위로 섞은 4개다.
--  - 한 번 풀면 끝(다시 풀기 없음). 점수 = 맞힌 문제 수 / 전체 × 100.
--  - 같은 문제를 다시 열면 같은 배치와 보기가 나오도록 시도에 저장한다.
--  - 지각/기한 초과는 이 세트를 처음 시작한 시점으로 정해 이후 문제에 이어진다.
-- 단어장·서술형과 마찬가지로 학생에게 개별 배정은 없고 강좌 수강생 전체에게
-- 열린다(숨김 스위치로 임시로 닫을 수 있다).

create table public.order_sets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  week smallint check (week between 1 and 52),
  title text not null,
  is_hidden boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index order_sets_course_idx on public.order_sets (course_id);

create table public.order_questions (
  id uuid primary key default gen_random_uuid(),
  order_set_id uuid not null references public.order_sets(id) on delete cascade,
  order_no integer not null,
  intro text not null,
  part1 text not null,
  part2 text not null,
  part3 text not null,
  unique (order_set_id, order_no)
);

create table public.order_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.order_questions(id) on delete cascade,
  order_set_id uuid not null references public.order_sets(id) on delete cascade,
  -- shown_order[k] = (A)(B)(C) 중 k번째 자리에 놓인 덩어리가 정답 순서로 몇 번째인지.
  shown_order smallint[] not null,
  -- 학생에게 보이는 순서의 보기 4개(문자열).
  options jsonb not null,
  correct_index smallint not null,
  selected_index smallint,
  is_correct boolean,
  is_late boolean not null default false,
  is_overdue boolean not null default false,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (profile_id, question_id)
);

create index order_attempts_profile_set_idx
  on public.order_attempts (profile_id, order_set_id);

create table public.order_set_completions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  order_set_id uuid not null references public.order_sets(id) on delete cascade,
  correct_count integer not null,
  total_count integer not null,
  score numeric not null,
  is_late boolean not null default false,
  is_overdue boolean not null default false,
  completed_at timestamptz not null default now(),
  primary key (profile_id, order_set_id)
);

alter table public.order_sets enable row level security;
alter table public.order_questions enable row level security;
alter table public.order_attempts enable row level security;
alter table public.order_set_completions enable row level security;

-- 학생(수강생)은 숨기지 않은 세트만 본다. 만든 강사 본인은 숨긴 것도 본다.
-- 등록/수정/삭제는 관리자 서버 액션(서비스롤)에서만 하므로 쓰기 정책은 없다.
create policy "order_sets_select_visible" on public.order_sets
  for select using (
    created_by = auth.uid()
    or (not is_hidden and public.is_course_member(course_id))
  );

-- 문제 본문에는 정답 순서가 들어 있으므로 학생에게는 직접 조회를 열지 않는다
-- (만든 강사만). 학생은 start_order_attempt로만 섞인 문제를 받는다.
create policy "order_questions_select_creator" on public.order_questions
  for select using (
    exists (
      select 1 from public.order_sets os
      where os.id = order_questions.order_set_id and os.created_by = auth.uid()
    )
  );

-- order_attempts는 보기와 정답 위치가 들어 있어 학생 조회 정책을 만들지 않는다.
create policy "order_set_completions_select_own" on public.order_set_completions
  for select using (profile_id = auth.uid());

-- 마이페이지 > 성적 리포트에 "순서 배열 테스트" 카테고리가 뜨도록 고정 slug로 시딩.
insert into public.score_report_categories
  (slug, label, description, sort_order, max_score, extra_field_labels)
values
  (
    'order_test',
    '순서 배열 테스트',
    '순서 배열 풀이 결과입니다. 맞힌 문제 수를 전체 문제 수 기준 백분율로 나타냅니다.',
    (select coalesce(max(sort_order), 0) + 1 from public.score_report_categories),
    100,
    '{}'
  )
on conflict (slug) do nothing;

-- 세트의 지각/기한 초과(주차 종료 기준). 강좌/주차가 없으면 false.
create or replace function public.order_set_is_late(p_set uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.week_is_late(os.course_id, os.week), false)
  from public.order_sets os where os.id = p_set
$$;

create or replace function public.order_set_is_overdue(p_set uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.week_is_overdue(os.course_id, os.week), false)
  from public.order_sets os where os.id = p_set
$$;

-- ---------------------------------------------------------------------
-- 학생에게 내려줄 문제 모양(정답 위치는 답한 뒤에만 포함한다). 내부용.
-- ---------------------------------------------------------------------
create or replace function public.order_attempt_payload(p_attempt_id uuid)
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
    'parts', (
      select jsonb_agg(
        jsonb_build_object(
          'label', chr(64 + k),
          'text', case a.shown_order[k] when 1 then q.part1 when 2 then q.part2 else q.part3 end
        )
        order by k
      )
      from generate_series(1, 3) k
    ),
    'options', a.options,
    'answered', a.answered_at is not null,
    'selected_index', a.selected_index,
    'is_correct', a.is_correct,
    'correct_index', case when a.answered_at is not null then a.correct_index end
  )
  from public.order_attempts a
  join public.order_questions q on q.id = a.question_id
  where a.id = p_attempt_id
$$;

-- ---------------------------------------------------------------------
-- 한 문제 풀이 시작(또는 이어하기). 처음이면 서버가 세 덩어리를 (A)(B)(C)에
-- 무작위로 배치하고 보기 4개를 만들어 저장한다. 정답이 (A)-(B)-(C)인 배치는
-- 쓰지 않는다. 같은 문제를 다시 열면 저장된 배치와 보기를 그대로 돌려준다.
-- ---------------------------------------------------------------------
create or replace function public.start_order_attempt(p_question_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q public.order_questions%rowtype;
  v_attempt_id uuid;
  -- (A)(B)(C) 배치 후보 = (A)-(B)-(C)를 뺀 5가지 순열
  v_perms text[] := array['{1,3,2}', '{2,1,3}', '{2,3,1}', '{3,1,2}', '{3,2,1}'];
  v_shown integer[];
  v_seq integer[];
  v_correct text;
  v_pool text[];
  v_distractors text[];
  v_options text[];
  v_late boolean;
  v_overdue boolean;
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

  select id into v_attempt_id
  from public.order_attempts
  where profile_id = v_uid and question_id = p_question_id;

  if v_attempt_id is null then
    select p::integer[] into v_shown from unnest(v_perms) p order by random() limit 1;

    -- 정답 순서의 k번째 덩어리가 놓인 자리(A/B/C) = v_shown에서 k의 위치
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

    -- 지각/기한 초과는 이 세트를 처음 시작한 시점으로 정해 이후 문제에 이어진다.
    select a.is_late, a.is_overdue into v_late, v_overdue
    from public.order_attempts a
    where a.profile_id = v_uid and a.order_set_id = v_q.order_set_id
    order by a.started_at
    limit 1;
    if not found then
      v_late := public.order_set_is_late(v_q.order_set_id);
      v_overdue := public.order_set_is_overdue(v_q.order_set_id);
    end if;

    insert into public.order_attempts
      (profile_id, question_id, order_set_id, shown_order, options, correct_index,
       is_late, is_overdue)
    values
      (v_uid, p_question_id, v_q.order_set_id, v_shown::smallint[], to_jsonb(v_options),
       (array_position(v_options, v_correct) - 1)::smallint, v_late, v_overdue)
    returning id into v_attempt_id;
  end if;

  return public.order_attempt_payload(v_attempt_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 보기 선택 제출. 한 번 답하면 바꿀 수 없다. 모든 문제에 답하면 세트 결과와
-- 성적 리포트를 남긴다.
-- ---------------------------------------------------------------------
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

    select count(*) into v_total
    from public.order_questions where order_set_id = v_a.order_set_id;
    select count(*), count(*) filter (where is_correct) into v_done, v_correct
    from public.order_attempts
    where profile_id = v_uid and order_set_id = v_a.order_set_id and answered_at is not null;

    if v_total > 0 and v_done >= v_total and not exists (
      select 1 from public.order_set_completions
      where profile_id = v_uid and order_set_id = v_a.order_set_id
    ) then
      v_completed := true;
      v_score := round(v_correct * 100.0 / v_total);
      select title into v_title from public.order_sets where id = v_a.order_set_id;
      select a.is_late, a.is_overdue into v_late, v_overdue
      from public.order_attempts a
      where a.profile_id = v_uid and a.order_set_id = v_a.order_set_id
      order by a.started_at limit 1;

      insert into public.order_set_completions
        (profile_id, order_set_id, correct_count, total_count, score, is_late, is_overdue)
      values (v_uid, v_a.order_set_id, v_correct, v_total, v_score,
              coalesce(v_late, false), coalesce(v_overdue, false));

      insert into public.score_reports
        (profile_id, report_type, title, score, exam_date, extra_data)
      values
        (v_uid, 'order_test', coalesce(v_title, '순서 배열 테스트'), v_score::text, current_date,
         jsonb_build_object('correct_count', v_correct, 'total_count', v_total));
    end if;
  end if;

  return public.order_attempt_payload(p_attempt_id)
    || jsonb_build_object(
         'correct_option', v_a.options ->> v_a.correct_index,
         'set_completed', v_completed
       );
end;
$$;

-- ---------------------------------------------------------------------
-- 한 세트의 내 진행 상황(문제별 풀이 여부, 점수, 지각 표시).
-- ---------------------------------------------------------------------
create or replace function public.get_order_set_progress(p_set_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_set public.order_sets%rowtype;
  v_questions jsonb;
  v_total integer;
  v_answered integer;
  v_correct integer;
  v_k public.order_set_completions%rowtype;
  v_late boolean;
  v_overdue boolean;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_set
  from public.order_sets os
  where os.id = p_set_id and not os.is_hidden and public.is_course_member(os.course_id);
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
  from public.order_questions q
  left join public.order_attempts a on a.question_id = q.id and a.profile_id = v_uid
  where q.order_set_id = p_set_id;

  select * into v_k from public.order_set_completions
  where profile_id = v_uid and order_set_id = p_set_id;

  select a.is_late, a.is_overdue into v_late, v_overdue
  from public.order_attempts a
  where a.profile_id = v_uid and a.order_set_id = p_set_id
  order by a.started_at limit 1;
  if not found then
    v_late := public.order_set_is_late(p_set_id);
    v_overdue := public.order_set_is_overdue(p_set_id);
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
-- 내가 볼 수 있는 모든 순서 배열 세트와 결과(학습 결과 화면용).
-- ---------------------------------------------------------------------
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
        'id', os.id,
        'title', os.title,
        'week', os.week,
        'course_id', os.course_id,
        'total', (select count(*) from public.order_questions q where q.order_set_id = os.id),
        'answered', (select count(*) from public.order_attempts a
                     where a.profile_id = v_uid and a.order_set_id = os.id
                       and a.answered_at is not null),
        'completed', k.profile_id is not null,
        'score', k.score,
        'correct', k.correct_count,
        'completed_at', k.completed_at,
        'is_late', coalesce(k.is_late, (
          select a.is_late from public.order_attempts a
          where a.profile_id = v_uid and a.order_set_id = os.id
          order by a.started_at limit 1), false),
        'is_overdue', coalesce(k.is_overdue, (
          select a.is_overdue from public.order_attempts a
          where a.profile_id = v_uid and a.order_set_id = os.id
          order by a.started_at limit 1), false)
      )
      order by os.week nulls last, os.created_at
    )
    from public.order_sets os
    left join public.order_set_completions k
      on k.order_set_id = os.id and k.profile_id = v_uid
    where not os.is_hidden and public.is_course_member(os.course_id)
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- 이번 주 할 일에 순서 배열 세트도 포함한다(20261013000000 버전에 더한 것).
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

revoke all on function public.order_set_is_late(uuid) from public;
revoke all on function public.order_set_is_overdue(uuid) from public;
revoke all on function public.order_attempt_payload(uuid) from public;
revoke all on function public.start_order_attempt(uuid) from public;
revoke all on function public.answer_order_question(uuid, integer) from public;
revoke all on function public.get_order_set_progress(uuid) from public;
revoke all on function public.get_order_overview() from public;

grant execute on function public.start_order_attempt(uuid) to authenticated;
grant execute on function public.answer_order_question(uuid, integer) to authenticated;
grant execute on function public.get_order_set_progress(uuid) to authenticated;
grant execute on function public.get_order_overview() to authenticated;
