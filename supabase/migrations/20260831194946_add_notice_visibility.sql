alter table public.notices
  add column visibility text not null default 'members'
  check (visibility in ('public', 'members'));

drop policy if exists "notices_select_authenticated" on public.notices;

create policy "notices_select_by_visibility" on public.notices
  for select using (visibility = 'public' or auth.role() = 'authenticated');

drop policy if exists "notice_attachments_select_authenticated" on public.notice_attachments;

create policy "notice_attachments_select_by_notice_visibility" on public.notice_attachments
  for select using (
    exists (
      select 1 from public.notices n
      where n.id = notice_attachments.notice_id
        and (n.visibility = 'public' or auth.role() = 'authenticated')
    )
  );
