-- 단어 시험 회차별 지각/기한 초과 표시.
--
-- 지금까지는 1차 시험의 지각 값이 이후 모든 회차에 복사됐다. 이제 기한(주차
-- 종료일)이 걸린 "시험"인 1차 시험(round 1)과 2차 시험(round 3)을 각각
-- 응시를 시작한 시점으로 판정한다.
--   - 1차 시험 / 2차 시험: 시작한 날짜 기준 지각(주차 종료 후 5일 이내),
--     기한 초과(5일 초과)를 각자 기록한다.
--   - 재시험(2·4·5): 별도 기한이 없어 부모 시험의 값을 그대로 쓴다.
--     (1차 재시험 = 1차 시험, 2차 재시험·3차 재시험 = 2차 시험)
-- 점수는 지각/기한 초과와 상관없이 그대로 반영한다.
--
-- get_vocab_test_status는 회차마다 is_late/is_overdue를 내려주고, 최상위
-- is_late/is_overdue는 "지금 응시하면" 적용될 값(아직 응시하지 않은 시험의
-- 안내용)으로 바꾼다. 기존 시도 기록은 소급하지 않는다.

create or replace function public.stamp_vocab_attempt_timing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent smallint;
  v_src record;
begin
  v_parent := case new.round_no when 2 then 1 when 4 then 3 when 5 then 3
                                else new.round_no end;

  if v_parent <> new.round_no then
    select a.is_late, a.is_overdue into v_src
    from public.vocab_test_attempts a
    where a.profile_id = new.profile_id
      and a.vocab_set_id = new.vocab_set_id
      and a.round_no = v_parent;
    if found then
      new.is_late := v_src.is_late;
      new.is_overdue := v_src.is_overdue;
      return new;
    end if;
  end if;

  new.is_late := public.vocab_set_is_late(new.vocab_set_id);
  new.is_overdue := public.vocab_set_is_overdue(new.vocab_set_id);
  return new;
end;
$$;

drop trigger if exists stamp_overdue on public.vocab_test_attempts;
drop trigger if exists stamp_timing on public.vocab_test_attempts;
create trigger stamp_timing before insert on public.vocab_test_attempts
  for each row execute function public.stamp_vocab_attempt_timing();
drop function if exists public.stamp_vocab_attempt_overdue();

revoke all on function public.stamp_vocab_attempt_timing() from public;

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
    ), '[]'::jsonb),
    'next_round', public.vocab_next_round(v_uid, p_vocab_set_id),
    'is_late', public.vocab_set_is_late(p_vocab_set_id),
    'is_overdue', public.vocab_set_is_overdue(p_vocab_set_id),
    'first_score', v_first,
    'final_score', v_final,
    'total_score', case when v_final is not null
      then round(coalesce(v_first, 0) * 0.4 + v_final * 0.6) end
  );
end;
$$;
