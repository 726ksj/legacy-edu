-- 공지사항: 관리자만 쓰고, 누구나(비로그인 포함) 읽을 수 있어야 한다.
-- reviews/site_content와 같은 패턴 (RLS로 anon SELECT 허용, insert/update
-- /delete는 정책이 없어 서비스 롤로만 가능).
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  category text not null default '공지' check (category in ('공지', '이벤트')),
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.notices enable row level security;

create policy "notices_select_all"
  on public.notices
  for select
  using (true);

-- FAQ: 마찬가지로 공개 읽기 전용 콘텐츠.
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.faqs enable row level security;

create policy "faqs_select_all"
  on public.faqs
  for select
  using (true);

-- 1:1 이용문의: consultation_requests와 같은 패턴 — 개인정보가 담긴
-- 제출 데이터라 RLS는 켜두고 정책은 없음 (service role 전용, 공개
-- 폼도 서버 액션에서 admin 클라이언트로 insert).
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;
