-- 수강기간(주)과 커리큘럼 주차를 하나로 합친다: courses.total_weeks는 이제
-- 수강기간(duration_days / 7)에서 파생되는 값으로, 강좌 저장 시 서버가 함께
-- 맞춘다. 기존 강좌도 수강기간이 있으면 같은 값으로 맞춘다.
-- 이미 그보다 큰 주차에 영상/단어장을 올려둔 강좌는 그 주차까지 포함하도록
-- 큰 쪽을 택해 기존 자료가 범위 밖으로 밀려나지 않게 한다.

update public.courses c
set total_weeks = greatest(
  round(c.duration_days / 7.0)::int,
  coalesce((select max(l.week) from public.lessons l where l.course_id = c.id), 0),
  coalesce((
    select max(vs.week)
    from public.vocab_assignments va
    join public.vocab_sets vs on vs.id = va.vocab_set_id
    where va.course_id = c.id
  ), 0)
)
where c.duration_days between 7 and 364;
