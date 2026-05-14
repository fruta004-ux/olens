-- ============================================================================
-- 053_security_lockdown_rls.sql
-- ----------------------------------------------------------------------------
-- 2026-05-13 보안 점검 (3.md) 후속 조치 — Critical 1
-- 모든 public 테이블의 RLS 정책을 "USING (true)" 무조건 허용에서
-- "auth.role() = 'authenticated'" (인증 사용자만) 로 강제 변경.
--
-- 핵심 변화:
--   anon 키만으로 접근하면 모두 PERMISSION DENIED 가 된다.
--   웹훅 / cron 등 서버 자동화는 SUPABASE_SERVICE_ROLE_KEY 를 사용해야 하며,
--   service_role 은 RLS 를 자동으로 우회한다.
--
-- 안전성:
--   1) 기존 데이터는 절대 건드리지 않는다 (ALTER POLICY / DROP POLICY 만).
--   2) 모든 public 테이블에 동일하게 적용 — 누락된 테이블이 없도록 동적 SQL.
--   3) 정책이 하나도 없는 테이블이라도 RLS 활성화 + authenticated 정책 추가.
--   4) 멱등 (반복 실행해도 안전) — DROP POLICY IF EXISTS 후 CREATE.
--
-- 실행 방법:
--   Supabase Dashboard → SQL Editor 에 붙여 넣고 실행.
--   또는 supabase CLI: supabase db reset / supabase db push
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  pol RECORD;
BEGIN
  -- 1. 모든 public 테이블 순회: RLS 활성화 + 기존 정책 모두 제거
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
  LOOP
    -- RLS 활성화 (이미 켜져 있으면 무시)
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
    -- FORCE: 테이블 owner 도 RLS 적용받도록 강제
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', r.schemaname, r.tablename);

    -- 해당 테이블의 모든 기존 정책 제거
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = r.schemaname AND tablename = r.tablename
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, r.schemaname, r.tablename);
    END LOOP;

    -- 인증된 사용자만 SELECT 허용
    EXECUTE format(
      $f$CREATE POLICY "authenticated_select" ON %I.%I
         FOR SELECT TO authenticated USING (true)$f$,
      r.schemaname, r.tablename
    );

    -- 인증된 사용자만 INSERT 허용
    EXECUTE format(
      $f$CREATE POLICY "authenticated_insert" ON %I.%I
         FOR INSERT TO authenticated WITH CHECK (true)$f$,
      r.schemaname, r.tablename
    );

    -- 인증된 사용자만 UPDATE 허용
    EXECUTE format(
      $f$CREATE POLICY "authenticated_update" ON %I.%I
         FOR UPDATE TO authenticated USING (true) WITH CHECK (true)$f$,
      r.schemaname, r.tablename
    );

    -- 인증된 사용자만 DELETE 허용
    EXECUTE format(
      $f$CREATE POLICY "authenticated_delete" ON %I.%I
         FOR DELETE TO authenticated USING (true)$f$,
      r.schemaname, r.tablename
    );

    RAISE NOTICE '✅ % locked down (RLS authenticated only)', r.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- Storage RLS — 도장 / 사업자등록증 등 공개 버킷도 인증 사용자만 업로드/삭제 가능
-- (조회는 그대로 — 공개 버킷은 비공개로 바꾸기 전엔 anon 도 GET 가능)
-- ============================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- storage.objects 의 기존 "all access" 류 정책 제거 (있을 때만)
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname ILIKE '%all%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 인증된 사용자만 업로드/수정/삭제 가능
DROP POLICY IF EXISTS "authenticated_upload"  ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_obj"  ON storage.objects;
DROP POLICY IF EXISTS "authenticated_delete_obj"  ON storage.objects;

CREATE POLICY "authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_obj" ON storage.objects
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_delete_obj" ON storage.objects
  FOR DELETE TO authenticated USING (true);

-- 조회는 일단 anon 도 허용 (공개 버킷 호환). 이미지 URL 직접 접근 차단을 원하면
-- Supabase Dashboard 에서 버킷을 private 으로 전환 + signed URL 사용으로 전환.
DROP POLICY IF EXISTS "public_read_objects" ON storage.objects;
CREATE POLICY "public_read_objects" ON storage.objects
  FOR SELECT USING (true);

-- ============================================================================
-- 검증 쿼리 (실행 후 수동 확인)
-- ----------------------------------------------------------------------------
-- 1) 모든 public 테이블에 RLS 가 켜져 있는지:
--      SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--      (rowsecurity = true 여야 함)
-- 2) 정책이 모두 authenticated 로만 되어 있는지:
--      SELECT tablename, policyname, roles
--        FROM pg_policies WHERE schemaname = 'public'
--        ORDER BY tablename, policyname;
-- 3) anon 키로 SELECT 시도 → 결과가 비어있어야 함:
--      curl "$SUPA/rest/v1/accounts?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
-- ============================================================================
