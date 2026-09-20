-- "매 수업 진행 시스템"만 부제(subtitle)가 비어 있어 상세 페이지 헤더
-- 높이가 다른 커리큘럼과 달라 보였다. 다른 카테고리와 동일하게 한 줄
-- 부제를 채워 헤더 레이아웃을 통일한다.

update public.curriculum_categories
set subtitle = '수업부터 학부모 전달까지, 하나의 시스템으로 운영합니다'
where slug = 'class-system';
