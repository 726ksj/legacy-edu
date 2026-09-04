-- 채팅 메시지에 파일 첨부를 붙일 수 있게 한다. 업로드는 서버 액션(서비스
-- 롤)에서 처리하므로(방 참여자 검증 + 스토리지 업로드 + 메시지 insert를
-- 한 번에 처리하는 게 더 간단해서) 별도 스토리지 RLS 정책은 두지 않고,
-- notice-attachments와 동일하게 공개 버킷 + 추측 불가능한 파일 경로로
-- 둔다.

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do nothing;

alter table public.chat_messages
  add column file_url text,
  add column file_name text,
  add column file_type text;
