-- 마이페이지 > 성적 리포트 목록에 "단어 테스트" 카테고리가 뜨도록 시딩한다.
-- 관리자 화면(app/admin/score-report-categories)에서 만들면 slugify()가
-- 임의 접미사를 붙여 매번 다른 slug가 나오는데, submit_vocab_test_result()
-- 함수가 report_type='vocab_test'로 고정해서 기록해야 하므로 여기서
-- 고정된 slug로 직접 시딩한다.

insert into public.score_report_categories
  (slug, label, description, sort_order, max_score, extra_field_labels)
values
  (
    'vocab_test',
    '단어 테스트',
    '단어 암기 앱에서 응시한 단어 테스트 결과입니다.',
    (select coalesce(max(sort_order), 0) + 1 from public.score_report_categories),
    100,
    '{}'
  )
on conflict (slug) do nothing;
