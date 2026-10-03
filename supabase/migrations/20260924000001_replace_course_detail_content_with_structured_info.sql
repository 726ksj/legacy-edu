-- 상세 페이지 본문을 자유 서식 하나(detail_content)가 아니라, 메가스터디류
-- 강좌정보 표처럼 "강좌 범위 / 내용 및 특징 / 수강 대상" 세 항목으로
-- 구조화해서 관리한다. detail_content는 바로 전 마이그레이션에서 추가된
-- 뒤로 아직 실제 데이터가 들어간 적이 없어(확인 완료) 안전하게 대체한다.
alter table public.courses drop column if exists detail_content;
alter table public.courses add column if not exists course_scope text;
alter table public.courses add column if not exists content_features text;
alter table public.courses add column if not exists target_audience text;
