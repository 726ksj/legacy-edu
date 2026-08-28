-- 업로드 직후엔 Mux가 아직 asset을 안 만들어서(비동기 처리) mux_asset_id가
-- null인 경우가 있다. 그동안에도 나중에 asset을 추적할 수 있도록
-- upload_id를 별도로 저장해둔다.
alter table public.lessons add column if not exists mux_upload_id text;
