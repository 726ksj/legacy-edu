insert into storage.buckets (id, name, public)
values ('notice-attachments', 'notice-attachments', true)
on conflict (id) do nothing;

create table if not exists public.notice_attachments (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text,
  created_at timestamptz not null default now()
);

alter table public.notice_attachments enable row level security;

create policy "notice_attachments_select_all" on public.notice_attachments
  for select using (true);
