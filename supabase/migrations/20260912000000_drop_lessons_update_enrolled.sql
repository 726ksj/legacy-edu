-- lessons 테이블에는 "수강 중인 학생이 자기 강좌 lesson을 UPDATE할 수
-- 있는" 정책이 있었다. 앱의 모든 lessons 쓰기는 항상 관리자 클라이언트
-- (RLS 우회)로만 이뤄져서 화면상으로는 학생이 절대 못 건드리지만, 이
-- 정책이 살아있는 한 학생이 Supabase REST API를 직접 호출해 자기 강좌의
-- 아무 영상이나 제목/설명/공개범위/mux_playback_id까지 바꿔치기할 수
-- 있었다. 학생은 lessons를 조회만 하면 되므로(lessons_select_enrolled는
-- 유지) 이 정책을 제거한다.
drop policy if exists "lessons_update_enrolled" on public.lessons;
