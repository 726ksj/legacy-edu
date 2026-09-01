-- 아이디/비밀번호 찾기 기능에 쓸 실제 이메일 주소를 회원가입 때부터
-- 받아둔다. 로그인용 auth 이메일(username@legacyedu.local)과는 별개다.
-- 기존 회원은 값이 없을 수 있어 not null로 걸지 않는다.

alter table public.profiles add column email text;
