-- 비밀번호/아이디 찾기 같은 민감한 셀프서비스 액션의 시도 횟수를 기록해
-- 무차별 대입을 막는 데 쓴다. anon/authenticated 키로는 접근 불가하고,
-- 서버의 service role 클라이언트에서만 다룬다.
create table if not exists public.rate_limit_attempts (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_attempts_key_created_at_idx
  on public.rate_limit_attempts (key, created_at);

alter table public.rate_limit_attempts enable row level security;
