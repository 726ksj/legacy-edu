-- 영상 파일을 교체할 때 관리자/강사가 "기존에 어떤 파일을 올렸었는지"
-- 알 수 있도록, 업로드 당시의 원본 파일명을 저장해둔다.
alter table public.lessons add column if not exists video_filename text;
