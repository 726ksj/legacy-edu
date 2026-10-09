-- 서술형 배열 풀이(W02). 학생이 섞인 배열 단위를 눌러 문장을 만들고, 서버가
-- 채점과 점수 계산을 한다.
--
-- 점수 규칙(화면설계서):
--   문장 점수: 첫 시도 정답 5점 · 2번째 3점 · 3번째 이후 1점 · 끝까지 오답 0점
--   서술형 점수: 문장 점수 합계 / 만점(문장 수 × 5)
--   통과: 모든 문장을 최종 완성(한 번이라도 맞힘)
--   첫 시도 정답률: 첫 시도에 맞힌 문장 비율(안내용)
--   어순 정확도: 정답과 같은 순서를 유지한 가장 긴 묶음의 비율(분석용, 점수 미포함)
-- 한 문장을 완성한 뒤의 다시 풀기는 연습으로 기록되고 점수는 바뀌지 않는다.
--
-- 섞인 배열 단위는 서버가 만들어 시도에 저장한다(재접속해도 같은 순서). 조각
-- id는 "섞인 순서의 번호"라서 id만으로는 정답 순서를 알 수 없다. 설명 영상을
-- 본 뒤 맞힌 경우의 재시도 계산(T09)은 영상 연결 단계에서 추가한다.

create table public.writing_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sentence_id uuid not null references public.writing_sentences(id) on delete cascade,
  writing_set_id uuid not null references public.writing_sets(id) on delete cascade,
  attempt_no integer not null,
  pieces jsonb not null,
  submitted_ids jsonb,
  is_correct boolean,
  order_accuracy numeric,
  is_official boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (profile_id, sentence_id, attempt_no)
);

create index writing_attempts_profile_set_idx
  on public.writing_attempts (profile_id, writing_set_id);

create table public.writing_sentence_results (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sentence_id uuid not null references public.writing_sentences(id) on delete cascade,
  writing_set_id uuid not null references public.writing_sets(id) on delete cascade,
  attempts integer not null default 0,
  completed boolean not null default false,
  first_try_correct boolean not null default false,
  points smallint not null default 0,
  completed_at timestamptz,
  primary key (profile_id, sentence_id)
);

create table public.writing_set_completions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  writing_set_id uuid not null references public.writing_sets(id) on delete cascade,
  points integer not null,
  max_points integer not null,
  completed_at timestamptz not null default now(),
  primary key (profile_id, writing_set_id)
);

alter table public.writing_attempts enable row level security;
alter table public.writing_sentence_results enable row level security;
alter table public.writing_set_completions enable row level security;

create policy "writing_attempts_select_own" on public.writing_attempts
  for select using (profile_id = auth.uid());
create policy "writing_sentence_results_select_own" on public.writing_sentence_results
  for select using (profile_id = auth.uid());
create policy "writing_set_completions_select_own" on public.writing_set_completions
  for select using (profile_id = auth.uid());

-- 마이페이지 > 성적 리포트에 "서술형 테스트" 카테고리가 뜨도록 고정 slug로 시딩.
insert into public.score_report_categories
  (slug, label, description, sort_order, max_score, extra_field_labels)
values
  (
    'writing_test',
    '서술형 테스트',
    '서술형 배열 풀이 결과입니다. 문장 점수 합계를 만점 기준 백분율로 나타냅니다.',
    (select coalesce(max(sort_order), 0) + 1 from public.score_report_categories),
    100,
    '{}'
  )
on conflict (slug) do nothing;

-- 가장 긴 공통 부분수열 길이(어순 정확도 계산용).
create or replace function public.writing_lcs_length(a text[], b text[])
returns integer
language plpgsql
immutable
as $$
declare
  n integer := coalesce(array_length(a, 1), 0);
  m integer := coalesce(array_length(b, 1), 0);
  prev integer[];
  curr integer[];
  i integer;
  j integer;
begin
  if n = 0 or m = 0 then
    return 0;
  end if;
  prev := array_fill(0, array[m + 1]);
  for i in 1..n loop
    curr := array_fill(0, array[m + 1]);
    for j in 1..m loop
      if a[i] = b[j] then
        curr[j + 1] := prev[j] + 1;
      else
        curr[j + 1] := greatest(prev[j + 1], curr[j]);
      end if;
    end loop;
    prev := curr;
  end loop;
  return prev[m + 1];
end;
$$;

-- ---------------------------------------------------------------------
-- 한 문장의 배열 풀이 시작(또는 제출하지 않은 시도 이어하기).
-- 섞인 조각과 우리말만 돌려준다(영어 정답은 돌려주지 않는다).
-- ---------------------------------------------------------------------
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

    insert into public.writing_attempts
      (profile_id, sentence_id, writing_set_id, attempt_no, pieces)
    values
      (v_uid, p_sentence_id, v_set_id, v_next_no, v_pieces)
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

-- ---------------------------------------------------------------------
-- 답안 제출. p_piece_ids는 학생이 고른 조각 id를 누른 순서대로 담은 배열이다.
-- 같은 시도를 다시 제출하면 저장된 결과를 그대로 돌려준다(중복 기록 방지).
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 세트 진행 현황: 문장별 상태와 점수/만점/첫 시도 정답률/통과 여부.
-- ---------------------------------------------------------------------
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
    'passed', v_total > 0 and v_done = v_total
  );
end;
$$;

revoke all on function public.writing_lcs_length(text[], text[]) from public;
revoke all on function public.start_writing_attempt(uuid) from public;
revoke all on function public.submit_writing_attempt(uuid, integer[]) from public;
revoke all on function public.get_writing_set_progress(uuid) from public;

grant execute on function public.start_writing_attempt(uuid) to authenticated;
grant execute on function public.submit_writing_attempt(uuid, integer[]) to authenticated;
grant execute on function public.get_writing_set_progress(uuid) to authenticated;
