-- chat_room_reads의 insert/update 정책은 profile_id가 본인인지만 확인하고,
-- 그 room_id에 실제로 참여 중인지는 확인하지 않았다 - 같은 테이블의
-- select 정책과 형제 테이블인 chat_messages/chat_rooms는 전부
-- is_chat_room_participant()를 쓰는데 여기만 빠져 있었다. 내용이 새는
-- 건 아니지만(select는 이미 auth.uid() = profile_id로 범위가 좁음),
-- 참여하지도 않는 채팅방에 "읽음" 기록을 남길 수 있는 정합성 문제라
-- 나머지와 동일한 기준으로 맞춘다.
drop policy if exists "chat_room_reads_upsert_own" on public.chat_room_reads;
drop policy if exists "chat_room_reads_update_own" on public.chat_room_reads;

create policy "chat_room_reads_upsert_own" on public.chat_room_reads
  for insert with check (
    auth.uid() = profile_id and public.is_chat_room_participant(room_id)
  );

create policy "chat_room_reads_update_own" on public.chat_room_reads
  for update using (auth.uid() = profile_id)
  with check (
    auth.uid() = profile_id and public.is_chat_room_participant(room_id)
  );
