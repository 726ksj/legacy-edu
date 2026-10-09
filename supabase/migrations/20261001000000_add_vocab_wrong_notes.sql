-- 오답노트(단어). 단어 테스트에서 틀린 단어가 쌓이고, 오답노트 풀이에서
-- "서로 다른 날 연속 2번" 맞히면 졸업한다.
--
--  - 틀리면: 노트에 추가(이미 있으면 틀린 횟수 +1). 졸업했던 단어를 다시
--    틀리면 노트로 돌아오고(복귀 횟수 +1) 졸업 칸이 0부터 다시 시작된다.
--  - 맞히면(오답노트 풀이에서만 인정): 오늘(KST)이 마지막으로 인정된 날과
--    다르면 졸업 칸 +1, 같은 날 반복은 1번으로 센다. 2칸이 차면 졸업.
--  - 풀이 중 틀리면 졸업 칸은 0부터 다시 시작한다.
--  - 오답노트 풀이는 점수에 반영하지 않는다. 한 번에 최대 30문항.
-- 문제 출제/판정은 단어 테스트와 마찬가지로 서버(SECURITY DEFINER 함수)가
-- 하고, 정답 위치는 답한 문항에만 돌려준다.

create table public.vocab_wrong_notes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.vocab_words(id) on delete cascade,
  vocab_set_id uuid not null references public.vocab_sets(id) on delete cascade,
  wrong_count integer not null default 1,
  streak smallint not null default 0 check (streak between 0 and 2),
  last_correct_date date,
  status text not null default 'active' check (status in ('active', 'graduated')),
  return_count integer not null default 0,
  first_wrong_at timestamptz not null default now(),
  last_wrong_at timestamptz not null default now(),
  graduated_at timestamptz,
  primary key (profile_id, word_id)
);

create index vocab_wrong_notes_profile_status_idx
  on public.vocab_wrong_notes (profile_id, status);

alter table public.vocab_wrong_notes enable row level security;

create policy "vocab_wrong_notes_select_own" on public.vocab_wrong_notes
  for select using (profile_id = auth.uid());

create table public.vocab_review_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  week smallint,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  total_count integer not null check (total_count > 0),
  correct_count integer,
  remaining_before integer not null,
  remaining_after integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.vocab_review_sessions enable row level security;

create policy "vocab_review_sessions_select_own" on public.vocab_review_sessions
  for select using (profile_id = auth.uid());

create table public.vocab_review_questions (
  session_id uuid not null references public.vocab_review_sessions(id) on delete cascade,
  position integer not null,
  word_id uuid not null references public.vocab_words(id) on delete cascade,
  choices jsonb not null,
  correct_index smallint not null,
  selected_index smallint,
  is_correct boolean,
  answered_at timestamptz,
  graduated boolean not null default false,
  streak_after smallint,
  primary key (session_id, position)
);

alter table public.vocab_review_questions enable row level security;

-- 이미 쌓인 테스트 기록의 오답을 오답노트로 옮긴다(틀린 횟수 = 틀린 문항 수).
insert into public.vocab_wrong_notes
  (profile_id, word_id, vocab_set_id, wrong_count, first_wrong_at, last_wrong_at)
select a.profile_id, q.word_id, a.vocab_set_id, count(*),
       min(coalesce(q.answered_at, a.started_at)),
       max(coalesce(q.answered_at, a.started_at))
from public.vocab_test_questions q
join public.vocab_test_attempts a on a.id = q.attempt_id
where q.is_correct = false
group by a.profile_id, q.word_id, a.vocab_set_id
on conflict (profile_id, word_id) do nothing;

-- 단어 테스트 답안 제출: 틀린 단어를 오답노트에 쌓는 로직을 추가한다.
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
  if p_selected_index <> v_q.correct_index then
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

-- ---------------------------------------------------------------------
-- 오답노트 목록(출제된 단어장의 단어만). 앱이 정렬/필터는 직접 한다.
-- ---------------------------------------------------------------------
create or replace function public.list_wrong_notes()
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
        'word_id', n.word_id,
        'word', w.word,
        'meaning', w.meaning,
        'example', w.example,
        'vocab_set_id', n.vocab_set_id,
        'set_title', s.title,
        'week', s.week,
        'wrong_count', n.wrong_count,
        'streak', n.streak,
        'status', n.status,
        'return_count', n.return_count,
        'last_wrong_at', n.last_wrong_at,
        'graduated_at', n.graduated_at
      )
      order by n.last_wrong_at desc
    )
    from public.vocab_wrong_notes n
    join public.vocab_words w on w.id = n.word_id
    join public.vocab_sets s on s.id = n.vocab_set_id
    where n.profile_id = v_uid
      and public.is_vocab_set_assigned(n.vocab_set_id)
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------
-- 오답 다시 풀기 시작(또는 진행 중인 풀이 이어하기). 남은 오답 중 많이 틀린
-- 순으로 최대 30개를 뽑고 문제 순서는 섞는다. p_week를 주면 그 주차만.
-- 보기(4개)는 같은 단어장의 다른 단어들의 뜻을 우선 쓰고, 모자라면 배정된
-- 다른 단어장의 단어에서 채운다.
-- ---------------------------------------------------------------------
create or replace function public.start_wrong_note_session(p_week smallint default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid;
  v_word_ids uuid[];
  v_remaining integer;
  v_word_id uuid;
  v_set_id uuid;
  v_position integer;
  v_correct text;
  v_choices text[];
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select id into v_session_id
  from public.vocab_review_sessions
  where profile_id = v_uid and status = 'in_progress'
  order by started_at desc
  limit 1;
  if found then
    return v_session_id;
  end if;

  select count(*) into v_remaining
  from public.vocab_wrong_notes n
  where n.profile_id = v_uid and n.status = 'active'
    and public.is_vocab_set_assigned(n.vocab_set_id);

  select array_agg(word_id order by random()) into v_word_ids
  from (
    select n.word_id
    from public.vocab_wrong_notes n
    join public.vocab_sets s on s.id = n.vocab_set_id
    where n.profile_id = v_uid and n.status = 'active'
      and public.is_vocab_set_assigned(n.vocab_set_id)
      and (p_week is null or s.week = p_week)
    order by n.wrong_count desc, n.last_wrong_at desc
    limit 30
  ) picked;

  if v_word_ids is null or array_length(v_word_ids, 1) is null then
    raise exception 'no wrong notes';
  end if;

  insert into public.vocab_review_sessions
    (profile_id, week, total_count, remaining_before)
  values
    (v_uid, p_week, array_length(v_word_ids, 1), v_remaining)
  returning id into v_session_id;

  v_position := 0;
  foreach v_word_id in array v_word_ids loop
    select btrim(w.meaning), w.vocab_set_id into v_correct, v_set_id
    from public.vocab_words w where w.id = v_word_id;

    select array_agg(c order by random()) into v_choices
    from (
      select v_correct as c
      union all
      (
        select m from (
          select distinct on (key) m, key, pri
          from (
            select btrim(w2.meaning) as m,
                   lower(btrim(w2.meaning)) as key,
                   case when w2.vocab_set_id = v_set_id then 0 else 1 end as pri
            from public.vocab_words w2
            where w2.id <> v_word_id
              and lower(btrim(w2.meaning)) <> lower(v_correct)
              and public.is_vocab_set_assigned(w2.vocab_set_id)
          ) x
          order by key, pri
        ) d
        order by pri, random()
        limit 3
      )
    ) all_choices;

    if array_length(v_choices, 1) < 2 then
      raise exception 'not enough words for choices';
    end if;

    v_position := v_position + 1;
    insert into public.vocab_review_questions
      (session_id, position, word_id, choices, correct_index)
    values
      (v_session_id, v_position, v_word_id, to_jsonb(v_choices),
       array_position(v_choices, v_correct) - 1);
  end loop;

  return v_session_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 풀이 조회. 정답 위치/예시 문장은 답한 문항에만, 졸업까지 남은 횟수는
-- 항상(답하기 전엔 현재 상태, 답한 뒤엔 그 답 이후 상태) 담아 준다.
-- ---------------------------------------------------------------------
create or replace function public.get_wrong_note_session(p_session_id uuid)
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
    'id', s.id,
    'status', s.status,
    'week', s.week,
    'total_count', s.total_count,
    'correct_count', s.correct_count,
    'remaining_before', s.remaining_before,
    'remaining_after', s.remaining_after,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', q.position,
          'word', w.word,
          'choices', q.choices,
          'selected_index', q.selected_index,
          'is_correct', q.is_correct,
          'correct_index', case when q.selected_index is not null then q.correct_index end,
          'example', case when q.selected_index is not null then w.example end,
          'graduated', q.graduated,
          'streak', coalesce(q.streak_after, n.streak, 0),
          'wrong_count', coalesce(n.wrong_count, 0)
        )
        order by q.position
      )
      from public.vocab_review_questions q
      join public.vocab_words w on w.id = q.word_id
      left join public.vocab_wrong_notes n
        on n.profile_id = s.profile_id and n.word_id = q.word_id
      where q.session_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.vocab_review_sessions s
  where s.id = p_session_id and s.profile_id = v_uid;

  if v_result is null then
    raise exception 'session not found';
  end if;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 오답노트 답안 제출. 한 번 확정한 답은 바꿀 수 없고 같은 문항을 다시 보내면
-- 저장된 결과를 돌려준다.
--  - 정답: 오늘(KST)이 마지막으로 인정된 날과 다르면 졸업 칸 +1(같은 날 반복은
--    1번), 2칸이 차면 졸업.
--  - 오답: 틀린 횟수 +1, 졸업 칸은 0부터 다시.
-- ---------------------------------------------------------------------
create or replace function public.answer_wrong_note_question(
  p_session_id uuid,
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
  v_session public.vocab_review_sessions%rowtype;
  v_q public.vocab_review_questions%rowtype;
  v_note public.vocab_wrong_notes%rowtype;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_correct boolean;
  v_streak smallint;
  v_graduated boolean := false;
  v_finished boolean := false;
  v_correct_count integer;
  v_remaining integer;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_session
  from public.vocab_review_sessions
  where id = p_session_id and profile_id = v_uid
  for update;
  if not found then
    raise exception 'session not found';
  end if;

  select * into v_q
  from public.vocab_review_questions
  where session_id = p_session_id and position = p_position
  for update;
  if not found then
    raise exception 'question not found';
  end if;

  if v_q.selected_index is not null then
    return jsonb_build_object(
      'is_correct', v_q.is_correct,
      'correct_index', v_q.correct_index,
      'graduated', v_q.graduated,
      'streak', v_q.streak_after,
      'finished', v_session.status = 'completed'
    );
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'session already completed';
  end if;
  if p_selected_index is null
     or p_selected_index < 0
     or p_selected_index >= jsonb_array_length(v_q.choices) then
    raise exception 'invalid choice';
  end if;

  v_correct := (p_selected_index = v_q.correct_index);

  select * into v_note
  from public.vocab_wrong_notes
  where profile_id = v_uid and word_id = v_q.word_id
  for update;
  if not found then
    raise exception 'wrong note not found';
  end if;

  if v_correct then
    v_streak := v_note.streak;
    if v_note.last_correct_date is distinct from v_today then
      v_streak := least(v_note.streak + 1, 2);
    end if;
    v_graduated := v_streak >= 2;
    update public.vocab_wrong_notes
    set streak = v_streak,
        last_correct_date = v_today,
        status = case when v_graduated then 'graduated' else status end,
        graduated_at = case when v_graduated then now() else graduated_at end
    where profile_id = v_uid and word_id = v_q.word_id;
  else
    v_streak := 0;
    update public.vocab_wrong_notes
    set wrong_count = wrong_count + 1,
        last_wrong_at = now(),
        streak = 0,
        last_correct_date = null
    where profile_id = v_uid and word_id = v_q.word_id;
  end if;

  update public.vocab_review_questions
  set selected_index = p_selected_index,
      is_correct = v_correct,
      answered_at = now(),
      graduated = v_graduated,
      streak_after = v_streak
  where session_id = p_session_id and position = p_position;

  if not exists (
    select 1 from public.vocab_review_questions
    where session_id = p_session_id and selected_index is null
  ) then
    select count(*) into v_correct_count
    from public.vocab_review_questions
    where session_id = p_session_id and is_correct;

    select count(*) into v_remaining
    from public.vocab_wrong_notes n
    where n.profile_id = v_uid and n.status = 'active'
      and public.is_vocab_set_assigned(n.vocab_set_id);

    update public.vocab_review_sessions
    set status = 'completed',
        completed_at = now(),
        correct_count = v_correct_count,
        remaining_after = v_remaining
    where id = p_session_id;
    v_finished := true;
  end if;

  return jsonb_build_object(
    'is_correct', v_correct,
    'correct_index', v_q.correct_index,
    'graduated', v_graduated,
    'streak', v_streak,
    'finished', v_finished
  );
end;
$$;

revoke all on function public.list_wrong_notes() from public;
revoke all on function public.start_wrong_note_session(smallint) from public;
revoke all on function public.get_wrong_note_session(uuid) from public;
revoke all on function public.answer_wrong_note_question(uuid, integer, integer) from public;

grant execute on function public.list_wrong_notes() to authenticated;
grant execute on function public.start_wrong_note_session(smallint) to authenticated;
grant execute on function public.get_wrong_note_session(uuid) to authenticated;
grant execute on function public.answer_wrong_note_question(uuid, integer, integer) to authenticated;
