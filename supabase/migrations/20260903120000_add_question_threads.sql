-- 질문에 답변한 뒤에도 학생이 이어서 질문할 수 있도록, questions를
-- 자기참조 구조로 확장한다. 최초 질문은 parent_id가 null이고, 그 이후의
-- 답변/후속 질문은 전부 최초 질문(parent_id)을 가리키는 자식 행으로
-- 쌓인다 - 한 스레드 안에 메시지가 시간순으로 늘어나는 구조.
--
-- 기존 answer/answered_at/answer_read_at 컬럼은 앞으로 새로 쓰지 않는다
-- (질문 1개당 답변 1개만 담던 예전 방식의 흔적). question_read_at은
-- 그대로 재사용하되, 이제 "스태프가 이 메시지를 읽었는지"를 최초
-- 질문뿐 아니라 학생이 쓴 모든 메시지에 대해 표시하고, answer_read_at은
-- "학생이 이 메시지를 읽었는지"를 스태프가 쓴 모든 메시지에 대해
-- 표시하는 용도로 확장해서 쓴다.

alter table public.questions
  add column parent_id uuid references public.questions(id) on delete cascade;

create index questions_parent_id_idx on public.questions(parent_id);

-- 학생은 자기가 쓴 최초 질문뿐 아니라, 그 질문에 달린 모든 메시지(스태프
-- 답변 포함)까지 읽을 수 있어야 한다.
drop policy if exists "questions_select_own" on public.questions;
create policy "questions_select_own_thread" on public.questions
  for select using (
    auth.uid() = profile_id
    or parent_id in (
      select id from public.questions where profile_id = auth.uid()
    )
  );

-- 학생이 후속 질문을 남길 때, 자기 소유가 아닌 남의 스레드에 끼어들 수
-- 없도록 parent_id도 같이 검증한다.
drop policy if exists "questions_insert_own" on public.questions;
create policy "questions_insert_own_thread" on public.questions
  for insert with check (
    auth.uid() = profile_id
    and (
      parent_id is null
      or parent_id in (
        select id from public.questions
        where profile_id = auth.uid() and parent_id is null
      )
    )
  );
