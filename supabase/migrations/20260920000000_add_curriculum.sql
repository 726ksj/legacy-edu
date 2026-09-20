-- 홈-커리큘럼 하위에 여러 개의 콘텐츠 블록(카테고리)을 관리자가 자유롭게
-- 추가/수정/삭제할 수 있게 한다. 각 카테고리는 제목/부제/소개문 +
-- 번호가 매겨진 단계(curriculum_steps) 목록 + (선택) 마무리 배지로
-- 구성된다 - "LEGACY 내신 8주 완성"처럼 단계별 설명이 여러 줄인 경우와
-- "12월~1월 ..."처럼 아이콘+제목만 있는 경우를 모두 같은 스키마로
-- 표현하기 위해 대부분의 필드를 nullable로 둔다.
--
-- 공개 마케팅 콘텐츠라 faqs/reviews와 동일하게 select는 전체 공개,
-- 쓰기는 관리자 서버 액션(서비스롤)에서만 한다.

create table public.curriculum_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  intro text,
  closing_title text,
  closing_description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.curriculum_steps (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.curriculum_categories(id) on delete cascade,
  icon text not null default 'target',
  title text not null,
  description text,
  sort_order integer not null default 0
);

alter table public.curriculum_categories enable row level security;
alter table public.curriculum_steps enable row level security;

create policy "curriculum_categories_select_all"
  on public.curriculum_categories
  for select
  using (true);

create policy "curriculum_steps_select_all"
  on public.curriculum_steps
  for select
  using (true);
