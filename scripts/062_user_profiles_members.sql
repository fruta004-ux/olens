-- 멤버(직원) 관리: user_profiles 확장
-- 기존 user_profiles(057: id=auth.users, email, name, role)를 직원 목록의 단일 소스로 쓴다.
-- 모든 담당자 드롭다운(영업/PO/재무)이 여기를 참조하도록 확장한다.
--   - active: 퇴사/비활성 직원 숨김 (드롭다운에서 제외)
--   - display_order: 드롭다운 정렬 순서
-- role(ENUM finance/admin/marketer/sales)은 권한/구분용으로 유지.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_profiles_active
  ON public.user_profiles(active);
