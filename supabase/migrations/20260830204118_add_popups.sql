insert into storage.buckets (id, name, public)
values ('popup-images', 'popup-images', true)
on conflict (id) do nothing;

create table if not exists public.popups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  link_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.popups enable row level security;

create policy "popups_select_active" on public.popups
  for select using (is_active = true);
