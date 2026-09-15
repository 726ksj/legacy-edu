-- 업로드 폼이 "차시 제목"/"차시 소개" 두 칸으로 순서를 대신 관리하던
-- 예전 방식 때문에, description 칸에 실제로는 제목에 해당하는 텍스트가
-- 들어가 있는 기존 차시들이 있다. 이제 순서/제목 필드가 각자 제 역할을
-- 하므로, 남아있던 낡은 description 값을 전부 지운다.
update public.lessons set description = null where description is not null;
