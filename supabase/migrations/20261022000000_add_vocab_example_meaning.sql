-- 단어장 엑셀의 D열 "예시 문장 뜻"(예시 문장의 해석)을 담는 컬럼. 업로드에서는
-- 필수지만, 이미 올라간 단어에는 값이 없으므로 컬럼은 비워 둘 수 있게 둔다.
alter table public.vocab_words add column example_meaning text;
