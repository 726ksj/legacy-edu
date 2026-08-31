alter table public.profiles
  add column role text not null default 'student'
  check (role in ('student', 'teacher'));

create table public.teacher_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  teacher_name text not null,
  course_id uuid not null references public.courses(id),
  is_used boolean not null default false,
  issued_by text,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
alter table public.teacher_codes enable row level security;
-- student_codes와 동일하게 select/insert 정책을 두지 않는다 - 서비스롤(관리자
-- 액션, 가입 액션)로만 접근하고, 일반 세션은 RLS로 완전히 차단된다.

-- student_codes -> profiles.student_code_id와 동일한 1:1 역참조. 코드
-- 삭제(=계정 삭제) 시 어떤 계정이 그 코드로 가입했는지 정확히 찾기 위함.
alter table public.profiles
  add column teacher_code_id uuid references public.teacher_codes(id);

create table public.course_teachers (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (course_id, profile_id)
);
alter table public.course_teachers enable row level security;
-- 정책 없음 - requireCourseManager()가 서비스롤로만 조회/기록한다.

create table public.course_notices (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.course_notices enable row level security;

create policy "course_notices_select_authenticated" on public.course_notices
  for select using (auth.role() = 'authenticated');
