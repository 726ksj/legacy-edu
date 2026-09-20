-- 홈-커리큘럼에 노출할 초기 콘텐츠(마케팅 카드뉴스 6장 분량)를 등록한다.
-- 이후 문구/단계는 /admin/curriculum에서 자유롭게 수정·삭제할 수 있다.

insert into public.curriculum_categories
  (slug, title, subtitle, intro, closing_title, closing_description, sort_order)
values
  (
    'personalized-system',
    '개인별 난이도·취약점 맞춤 시스템',
    '학생마다 다른 실력, 같은 문제를 풀 필요는 없습니다',
    '학생별 현재 수준과 취약점을 빠르게 진단하고, 필요한 문제만 필요한 난이도로 집중합니다.',
    null,
    E'잘하는 것은 더 빠르게, 부족한 것은 더 집요하게.\n필요한 문제만, 필요한 난이도로, 필요한 만큼 반복합니다.',
    1
  ),
  (
    'class-system',
    '매 수업 진행 시스템',
    null,
    E'단순히 시험 범위를 설명하는 수업이 아니라\n수업 → 확인 → 피드백 → 진단 → 학부모 전달까지\n하나의 시스템으로 운영합니다.',
    null,
    null,
    2
  ),
  (
    'exam-8week',
    'LEGACY 내신 8주 완성',
    '시험 전부터 완성하는 체계적인 내신 시스템',
    null,
    '수업의 목표',
    '시험 범위를 한 번 공부하는 것이 아니라, 학생이 실제 시험장에서 정답을 만들어낼 수 있을 때까지 반복합니다.',
    3
  ),
  (
    'syntax-vocab-dec-jan',
    '12월~1월 고등 구문 + 고등 어휘 집중',
    '고등 영어의 뼈대를 세우는 첫 단계',
    null,
    null,
    null,
    4
  ),
  (
    'reading-grammar-jan-feb',
    '1월~2월 고등 독해 + 어법 집중',
    '읽기력과 문법 감각을 완성하는 두 번째 단계',
    null,
    null,
    null,
    5
  ),
  (
    'exam-prep-feb-mar',
    '2월~3월 실전 고등 내신 대비',
    '고등학교 첫 시험을 위한 실전 마무리 단계',
    null,
    null,
    null,
    6
  );

insert into public.curriculum_steps (category_id, icon, title, description, sort_order)
select
  curriculum_categories.id,
  step_data.icon,
  step_data.title,
  step_data.description,
  step_data.sort_order
from public.curriculum_categories
cross join (
  values
    ('personalized-system', 'file-search', '수준 진단', '어휘·구문·어법·독해·문제 유형별 현재 실력을 빠르게 파악합니다.', 1),
    ('personalized-system', 'bar-chart', '난이도 맞춤', '학생 수준에 따라 기본·고난도·최상위권 문제를 다르게 구성합니다.', 2),
    ('personalized-system', 'target', '취약점 선별', E'틀린 문제의 원인을 분석해\n취약 지문과 취약 유형을 정확히 선별합니다.', 3),
    ('personalized-system', 'lightbulb', '집중 공략', E'잘하는 부분은 반복을 줄이고,\n부족한 부분에 학습 시간을 집중합니다.', 4),
    ('personalized-system', 'refresh-cw', '재진단', E'보완 후 다시 테스트하여\n실제로 약점이 해결됐는지 확인합니다.', 5),

    ('class-system', 'user', '강의 진행', E'학교별 시험 범위에 맞춘\n본문·어법·어휘·변형문제 수업', 1),
    ('class-system', 'pen-line', '어휘 테스트', E'시험 범위 핵심 어휘 및\n고난도 어휘 반복 점검', 2),
    ('class-system', 'check-square', '숙제 확인', E'과제 수행 여부 및\n학습 상태 확인', 3),
    ('class-system', 'message-circle', '숙제 피드백', E'오답 및 취약 부분을 확인하여\n개별 피드백', 4),
    ('class-system', 'trending-up', '학습 진단', E'학생별 이해도와\n취약 영역 지속 점검', 5),
    ('class-system', 'users', '진단 결과 학부모 전송', E'어휘 테스트, 숙제 수행도, 수업 이해도 및\n보완 필요 영역을 정리하여 전달', 6),

    ('exam-8week', 'calendar', '8주 ~ 5주 전', E'시험 범위 분석\n어휘·구문·어법 집중 학습\n복습 테스트(변형 문제)', 1),
    ('exam-8week', 'target', '4주 ~ 1주 전', E'학교별 변형 문제\n개인별 취약 지문 및 취약 문제 유형 집중 보완\n최상위권을 위한 초고난도 변형 문제', 2),
    ('exam-8week', 'clipboard-check', '시험 직전', '실전 모의고사 및 최종 오답 정리', 3),

    ('syntax-vocab-dec-jan', 'target', '고등 필수 어휘 집중 학습', null, 1),
    ('syntax-vocab-dec-jan', 'file-search', '문장 구조 분석 훈련', null, 2),
    ('syntax-vocab-dec-jan', 'trending-up', '긴 문장 해석 능력 강화', null, 3),
    ('syntax-vocab-dec-jan', 'lightbulb', '고등 독해를 위한 구문 기초 완성', null, 4),

    ('reading-grammar-jan-feb', 'file-text', '고등 수준 독해 훈련', null, 1),
    ('reading-grammar-jan-feb', 'link-2', '문장 간 논리관계 파악', null, 2),
    ('reading-grammar-jan-feb', 'settings', '핵심 어법 개념 정리', null, 3),
    ('reading-grammar-jan-feb', 'target', '내신 및 모의고사 유형 적용', null, 4),

    ('exam-prep-feb-mar', 'target', '학교별 내신 문제 유형 적응', null, 1),
    ('exam-prep-feb-mar', 'file-search', '어휘·어법·독해 실전 문제풀이', null, 2),
    ('exam-prep-feb-mar', 'pen-line', '서술형 및 변형문제 대비', null, 3),
    ('exam-prep-feb-mar', 'lightbulb', '고등학교 첫 시험을 위한 실전 훈련', null, 4)
) as step_data(category_slug, icon, title, description, sort_order)
where curriculum_categories.slug = step_data.category_slug;
