-- 상세 화면에서 단계 설명을 강제 줄바꿈 없이 한 줄로 표시하도록
-- 컴포넌트를 바꿨다(whitespace-pre-line 제거). "LEGACY 내신 8주 완성"의
-- 두 단계는 원래 서로 다른 글머리 항목 3개를 줄바꿈으로만 구분해뒀던
-- 것이라, 줄바꿈이 사라지면 구분 없이 붙어 보인다 - 가운뎃점(·)으로
-- 구분해 가독성을 유지한다.

update public.curriculum_steps
set description = '시험 범위 분석 · 어휘·구문·어법 집중 학습 · 복습 테스트(변형 문제)'
where title = '8주 ~ 5주 전'
  and category_id = (select id from public.curriculum_categories where slug = 'exam-8week');

update public.curriculum_steps
set description = '학교별 변형 문제 · 개인별 취약 지문 및 취약 문제 유형 집중 보완 · 최상위권을 위한 초고난도 변형 문제'
where title = '4주 ~ 1주 전'
  and category_id = (select id from public.curriculum_categories where slug = 'exam-8week');
