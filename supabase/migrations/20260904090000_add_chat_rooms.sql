-- 강좌 단위로 학생 1명당 강사·조교와 함께 쓰는 채팅방. 기존 questions
-- 테이블(차시 단위 질문)을 완전히 대체한다 - questions 자체는 과거
-- 데이터 보존을 위해 남겨두되, 앱에서는 더 이상 쓰지 않는다.

create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (course_id, student_profile_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_room_id_created_at_idx
  on public.chat_messages (room_id, created_at);

-- 참여자별 "이 방을 마지막으로 읽은 시각" - 메시지마다 읽음 컬럼을 두는
-- 대신 방-참여자 단위로 하나만 관리한다(참여자가 3명까지 늘어나서).
create table public.chat_room_reads (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (room_id, profile_id)
);

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_room_reads enable row level security;

-- course_teachers는 RLS 정책이 없는(서비스롤 전용) 테이블이라, 일반
-- 권한으로는 "이 사람이 이 강좌 담당 스태프인지"를 직접 조회할 수 없다.
-- SECURITY DEFINER + plpgsql로 우회한다 (plpgsql이어야 플래너가 함수
-- 본문을 inline해서 SECURITY DEFINER 경계를 무너뜨리는 걸 막을 수 있다 -
-- questions 스레드 때 겪었던 것과 동일한 함정).
create or replace function public.is_chat_room_participant(target_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  room record;
begin
  select course_id, student_profile_id into room
  from public.chat_rooms
  where id = target_room_id;

  if room is null then
    return false;
  end if;

  if room.student_profile_id = auth.uid() then
    return true;
  end if;

  return exists (
    select 1 from public.course_teachers
    where course_id = room.course_id and profile_id = auth.uid()
  );
end;
$$;

-- 방 자체는 서버 액션(서비스롤)으로만 생성한다 - 수강 여부/담당 강좌
-- 확인이 SQL보다 코드에서 표현하기 훨씬 쉬워서다. 그래서 INSERT 정책은
-- 없고 조회 정책만 둔다.
create policy "chat_rooms_select_participant" on public.chat_rooms
  for select using (public.is_chat_room_participant(id));

create policy "chat_messages_select_participant" on public.chat_messages
  for select using (public.is_chat_room_participant(room_id));

-- 메시지 전송은 실시간 UX를 위해 브라우저에서 직접 insert한다.
create policy "chat_messages_insert_participant" on public.chat_messages
  for insert with check (
    profile_id = auth.uid() and public.is_chat_room_participant(room_id)
  );

create policy "chat_room_reads_select_own" on public.chat_room_reads
  for select using (auth.uid() = profile_id);

create policy "chat_room_reads_upsert_own" on public.chat_room_reads
  for insert with check (auth.uid() = profile_id);

create policy "chat_room_reads_update_own" on public.chat_room_reads
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- 실시간 구독 대상으로 등록.
alter publication supabase_realtime add table public.chat_messages;
