-- hls.js가 재생 도중 내부적으로 복구를 시도하다 조용히 완전히 멈춰버리는
-- (알려진 hls.js 버그로 추정되는) 문제를 구조적으로 피하기 위해, 최고화질
-- mp4(static rendition)를 같이 만들어두고 준비되면 HLS 대신 그걸로
-- 재생한다. mp4는 asset이 ready된 뒤에도 한동안 더 걸려 준비되므로, 별도로
-- 준비 완료 여부를 캐시해둔다.
alter table public.lessons add column if not exists mp4_ready boolean not null default false;
