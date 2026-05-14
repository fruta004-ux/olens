-- ============================================================================
-- 054_delete_audit_flag.sql
-- ----------------------------------------------------------------------------
-- 2026-05-13 보안 점검 보고서 (3.md §2) 에서 외부 점검자가
-- inquiry_inbox 에 INSERT 한 audit flag row 를 제거.
--
-- 취약점이 닫혔는지 검증 후 실행.
-- ============================================================================

DELETE FROM public.inquiry_inbox
WHERE id = '71c48987-4a79-4a24-ba94-1917b412a621';

-- 보너스: 외부 audit 류 추가 row 가 더 있으면 함께 청소 (선택 사항)
-- DELETE FROM public.inquiry_inbox
-- WHERE meta->>'audit' = 'true' OR raw_text ILIKE '%external bot wrote%';
