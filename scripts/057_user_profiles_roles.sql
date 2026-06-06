-- ============================================================================
-- 057_user_profiles_roles.sql
-- ----------------------------------------------------------------------------
-- 계정별 역할(role) 관리용 user_profiles 테이블.
--
-- Supabase auth.users 는 대시보드에서 커스텀 컬럼을 추가할 수 없으므로
-- public.user_profiles 를 별도로 두고 auth.users.id 와 1:1 로 연결한다.
--
-- 역할(role) 4종:
--   - finance   : 재무 담당자  (프로젝트 명세서 신규 알림 팝업 대상)
--   - admin     : 관리자
--   - marketer  : 마케터
--   - sales     : 영업자
--
-- 특징:
--   1) auth.users 에 사용자가 생기면 트리거로 user_profiles 행 자동 생성 (기본 role = sales)
--   2) 기존에 이미 가입된 계정도 이 스크립트 실행 시 한 번에 백필
--   3) 멱등 — 반복 실행해도 안전
--   4) RLS: 인증 사용자는 전체 조회 가능 / 본인 행만 수정 (역할 변경은 관리자/SQL에서)
--
-- 실행 방법: Supabase Dashboard → SQL Editor 에 붙여넣고 실행.
-- ============================================================================

-- 1. 역할 enum 타입 (없을 때만 생성)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('finance', 'admin', 'marketer', 'sales');
  END IF;
END $$;

-- 2. user_profiles 테이블
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email       text,
  name        text,
  role        user_role NOT NULL DEFAULT 'sales',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.user_profiles      IS '계정별 프로필/역할 (auth.users 와 1:1)';
COMMENT ON COLUMN public.user_profiles.role IS 'finance | admin | marketer | sales';

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_user_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_user_profiles_updated_at();

-- 4. 신규 가입 시 프로필 자동 생성 트리거 (기본 role = sales)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. 기존 계정 백필 (이미 가입된 사용자도 프로필 생성, 기본 role = sales)
INSERT INTO public.user_profiles (id, email, name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1))
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 6. RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

-- 본인 행만 수정 가능 (role 변경은 아래 7번처럼 SQL 로 직접)
DROP POLICY IF EXISTS "user_profiles_update_self" ON public.user_profiles;
CREATE POLICY "user_profiles_update_self" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- 7. 역할 지정 (여기서 직접 계정에 role 부여)
-- ----------------------------------------------------------------------------
-- 아래 이메일을 본인 환경에 맞게 바꿔서 실행하세요.
-- (이메일은 auth.users 기준)

-- 재무 담당자
UPDATE public.user_profiles SET role = 'finance'  WHERE email = 'bani0617@nate.com';

-- 예시) 관리자 / 마케터 / 영업자 지정
-- UPDATE public.user_profiles SET role = 'admin'    WHERE email = 'grow@gmail.com';
-- UPDATE public.user_profiles SET role = 'marketer' WHERE email = '1rudgh1@naver.com';
-- UPDATE public.user_profiles SET role = 'sales'    WHERE email = 'a7382@naver.com';

-- 확인용:
--   SELECT email, name, role FROM public.user_profiles ORDER BY role, email;
-- ============================================================================
