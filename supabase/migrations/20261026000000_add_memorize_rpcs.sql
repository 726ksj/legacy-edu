-- 학생 앱의 "암기" 화면용 서버 함수. 순서 배열(O)·문장 배열(S) 문제 본문에는 정답
-- 순서가 그대로 들어 있어서 학생에게 직접 조회를 열지 않았다(RLS). 암기 화면에서만
-- 정답 순서의 본문을 받을 수 있도록, 수강생에게 숨기지 않은 세트에 한해 내려 준다.
-- (어순 배열(W)은 writing_sentences를 학생이 직접 읽을 수 있어서 함수가 필요 없다.)

create or replace function public.get_order_memorize(p_set_id uuid)
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
    'title', s.title,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'order_no', q.order_no,
          'intro', q.intro,
          'parts', jsonb_build_array(q.part1, q.part2, q.part3)
        )
        order by q.order_no
      )
      from public.order_questions q
      where q.order_set_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.order_sets s
  where s.id = p_set_id
    and (s.created_by = v_uid
         or (not s.is_hidden and public.is_course_member(s.course_id)));

  if v_result is null then
    raise exception 'order set not found';
  end if;
  return v_result;
end;
$$;

create or replace function public.get_sentence_memorize(p_set_id uuid)
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
    'title', s.title,
    'questions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'order_no', q.order_no,
          'intro', q.intro,
          'sentences', q.sentences
        )
        order by q.order_no
      )
      from public.sentence_questions q
      where q.sentence_set_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.sentence_sets s
  where s.id = p_set_id
    and (s.created_by = v_uid
         or (not s.is_hidden and public.is_course_member(s.course_id)));

  if v_result is null then
    raise exception 'sentence set not found';
  end if;
  return v_result;
end;
$$;

revoke all on function public.get_order_memorize(uuid) from public;
revoke all on function public.get_sentence_memorize(uuid) from public;
grant execute on function public.get_order_memorize(uuid) to authenticated;
grant execute on function public.get_sentence_memorize(uuid) to authenticated;
