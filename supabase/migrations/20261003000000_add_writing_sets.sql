-- 서술형(W) 학습 세트. 강좌의 한 주차에 속하고, 문장(영어 정답 + 우리말) 여러
-- 개로 이루어진다. 각 문장은 학생이 단어 단위로 배열해 맞히는 문제의 정답이다.
--
--  - chunks: 정답 문장을 나눈 "배열 단위"(순서대로). 학생에게는 섞어서 보여준다.
--  - key_phrases: 강사가 표시한 핵심 어구(문법 포인트). chunks 중 일부와 같다.
--  - audio_url / video_*: 영어 듣기와 설명 영상(구간). 이후 단계에서 채운다.
--
-- 이번 단계는 입력(강사)과 조회(학생)까지다. 시도/채점/점수 테이블은 배열 풀이
-- 단계에서 서버 함수와 함께 추가한다. 단어장과 달리 학생에게 개별 배정은 없고
-- 강좌 수강생 전체에게 열린다(숨김 스위치로 임시로 닫을 수 있다).

create table public.writing_sets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  week smallint check (week between 1 and 52),
  title text not null,
  is_hidden boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index writing_sets_course_idx on public.writing_sets (course_id);

create table public.writing_sentences (
  id uuid primary key default gen_random_uuid(),
  writing_set_id uuid not null references public.writing_sets(id) on delete cascade,
  order_no integer not null,
  english text not null,
  korean text not null,
  chunks jsonb not null,
  key_phrases jsonb not null default '[]'::jsonb,
  audio_url text,
  video_url text,
  video_start_sec integer,
  video_end_sec integer,
  unique (writing_set_id, order_no)
);

alter table public.writing_sets enable row level security;
alter table public.writing_sentences enable row level security;

-- 학생(수강생)은 숨기지 않은 서술형 세트만 본다. 만든 강사 본인은 숨긴 것도 본다.
-- 등록/수정/삭제는 관리자 서버 액션(서비스롤)에서만 하므로 쓰기 정책은 없다.
create policy "writing_sets_select_visible" on public.writing_sets
  for select using (
    created_by = auth.uid()
    or (not is_hidden and public.is_course_member(course_id))
  );

create policy "writing_sentences_select_visible" on public.writing_sentences
  for select using (
    exists (
      select 1 from public.writing_sets ws
      where ws.id = writing_sentences.writing_set_id
        and (ws.created_by = auth.uid()
             or (not ws.is_hidden and public.is_course_member(ws.course_id)))
    )
  );
