-- 공지사항을 회원 전용으로 바꾸면서(페이지 단 로그인 체크) DB 조회 권한도
-- 같이 좁힌다. 그동안은 누구나 조회 가능해서, 로그인 화면 리다이렉트를
-- 우회해 Supabase REST API를 직접 호출하면 비회원도 내용을 볼 수 있었다.
drop policy if exists "notices_select_all" on public.notices;

create policy "notices_select_authenticated" on public.notices
  for select using (auth.role() = 'authenticated');

drop policy if exists "notice_attachments_select_all" on public.notice_attachments;

create policy "notice_attachments_select_authenticated" on public.notice_attachments
  for select using (auth.role() = 'authenticated');
