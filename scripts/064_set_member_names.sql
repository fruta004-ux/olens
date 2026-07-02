-- 멤버 이름 보정
-- user_profiles.name 이 비어 있어 담당자 드롭다운에 이메일 앞부분(1rudgh1 등)으로 표시되고,
-- 기존 영업담당 이름(박상혁/윤경호/오일환)과 중복돼 보이던 문제 수정.
-- 이메일 로컬파트(@ 앞)로 매칭하므로 도메인을 몰라도 안전. 재실행 안전(idempotent).

UPDATE public.user_profiles SET name = '윤경호', updated_at = now()
  WHERE split_part(email, '@', 1) = '1rudgh1';

UPDATE public.user_profiles SET name = '박상혁', updated_at = now()
  WHERE split_part(email, '@', 1) = 'a7382';

UPDATE public.user_profiles SET name = '오일환', updated_at = now()
  WHERE split_part(email, '@', 1) = 'dhdlfghks36';
