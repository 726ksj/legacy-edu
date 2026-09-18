-- 영단어 암기 앱(Expo)에서 쓸 단어장과 단어를 담는 테이블. 관리/등록은
-- 기존 웹 관리자 화면(서비스롤 서버 액션)에서만 하고, 조회는 만든 강사
-- 본인과 vocab_assignments로 배정받은 학생/강좌 구성원만 가능하게 한다.

create table public.vocab_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.vocab_words (
  id uuid primary key default gen_random_uuid(),
  vocab_set_id uuid not null references public.vocab_sets(id) on delete cascade,
  word text not null,
  meaning text not null,
  example text,
  sort_order integer not null default 0
);

alter table public.vocab_sets enable row level security;
alter table public.vocab_words enable row level security;

-- is_vocab_set_assigned()는 다음 마이그레이션(vocab_assignments)에서
-- 정의되므로, 그 파일에서 아래 정책들을 함께 생성한다.
