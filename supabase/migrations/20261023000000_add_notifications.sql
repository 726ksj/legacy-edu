-- 학생 앱(legacy-m) 알림함. 강사가 테스트(단어장/어순/순서/문장 배열)를 올리면
-- 그 강좌 수강생에게 "테스트가 업로드되었습니다" 알림이 쌓인다.
--
--  - notifications: 받는 학생(profile_id) 한 명당 한 줄. 학생은 본인 알림만 읽고
--    읽음 표시(read_at)만 바꿀 수 있다. 알림 생성은 아래 트리거(SECURITY DEFINER)만 한다.
--  - 단어장은 세트를 만든 뒤 vocab_assignments(강좌 배정)로 강좌에 열리므로 그 시점에,
--    어순/순서/문장 배열은 세트가 만들어지는 시점에 알림을 보낸다.
--  - 숨김 세트는 알리지 않는다. 세트를 올린 강사 본인은 받지 않는다.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- vocab | writing | order | sentence
  kind text not null check (kind in ('vocab', 'writing', 'order', 'sentence')),
  title text not null,
  body text,
  course_id uuid references public.courses(id) on delete cascade,
  set_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx
  on public.notifications (profile_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (profile_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create or replace function public.notify_course_test_uploaded(
  p_course_id uuid,
  p_kind text,
  p_set_id uuid,
  p_set_title text,
  p_week smallint,
  p_created_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text := case p_kind
    when 'vocab' then '단어(VOCA)'
    when 'writing' then '어순 배열'
    when 'order' then '순서 배열'
    else '문장 배열'
  end;
begin
  insert into public.notifications (profile_id, kind, title, body, course_id, set_id)
  select e.profile_id,
         p_kind,
         '테스트가 업로드되었습니다',
         v_label || ' · ' || coalesce(p_week::text || '주차 · ', '') || p_set_title,
         p_course_id,
         p_set_id
  from public.enrollments e
  where e.course_id = p_course_id
    and e.profile_id is distinct from p_created_by;
end;
$$;

create or replace function public.notify_on_vocab_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
begin
  if new.course_id is null then
    return new;
  end if;
  select title, week, is_hidden, created_by into s
  from public.vocab_sets where id = new.vocab_set_id;
  if found and not s.is_hidden then
    perform public.notify_course_test_uploaded(
      new.course_id, 'vocab', new.vocab_set_id, s.title, s.week, s.created_by);
  end if;
  return new;
end;
$$;

create trigger vocab_assignments_notify
  after insert on public.vocab_assignments
  for each row execute function public.notify_on_vocab_assignment();

create or replace function public.notify_on_set_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.is_hidden then
    perform public.notify_course_test_uploaded(
      new.course_id, tg_argv[0], new.id, new.title, new.week, new.created_by);
  end if;
  return new;
end;
$$;

create trigger writing_sets_notify
  after insert on public.writing_sets
  for each row execute function public.notify_on_set_insert('writing');

create trigger order_sets_notify
  after insert on public.order_sets
  for each row execute function public.notify_on_set_insert('order');

create trigger sentence_sets_notify
  after insert on public.sentence_sets
  for each row execute function public.notify_on_set_insert('sentence');
