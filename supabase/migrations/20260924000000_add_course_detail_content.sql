-- 강좌 상세 페이지(/courses/[id])에 보여줄 긴 설명(커리큘럼 소개, 수강
-- 혜택 등)을 위한 리치텍스트 필드. 목록/카드에 쓰이는 overview(한 줄
-- 소개 수준)와는 별개로, 상세 페이지 본문 전용이라 길고 서식(굵게/목록
-- 등)이 들어갈 수 있다 - 공지사항 content와 동일한 패턴.
alter table public.courses add column if not exists detail_content text;
