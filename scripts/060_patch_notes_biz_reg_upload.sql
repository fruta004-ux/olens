-- 패치노트 추가: 사업자등록증 업로드 개선 + 아임웹 빠른등록 버그 수정
-- 현재 DB 의 최신 버전을 자동으로 읽어 다음 마이너 버전으로 등록한다.
-- (semver 문자열을 int 배열로 캐스팅해 1.20 > 1.9 가 올바르게 비교되도록 처리)
-- Supabase SQL 에디터에서 1회 실행하면 됩니다.

DO $$
DECLARE
  v_next text;
  v_id uuid;
BEGIN
  -- 1) 최신 버전 → 다음 마이너 버전 계산
  SELECT format('%s.%s.0', (mx)[1], (mx)[2] + 1)
  INTO v_next
  FROM (
    SELECT string_to_array(version, '.')::int[] AS mx
    FROM public.patch_notes
    ORDER BY string_to_array(version, '.')::int[] DESC
    LIMIT 1
  ) s;

  IF v_next IS NULL THEN
    v_next := '1.0.0';
  END IF;

  -- 이미 같은 날짜/제목으로 들어가 있으면 중복 삽입 방지
  IF EXISTS (
    SELECT 1 FROM public.patch_notes
    WHERE title = '사업자등록증 업로드 개선 + 아임웹 빠른등록 버그 수정'
      AND date = CURRENT_DATE
  ) THEN
    RAISE NOTICE '이미 등록된 패치노트가 있어 건너뜁니다.';
    RETURN;
  END IF;

  -- 2) 패치노트 메인 레코드
  INSERT INTO public.patch_notes (version, date, title)
  VALUES (v_next, CURRENT_DATE, '사업자등록증 업로드 개선 + 아임웹 빠른등록 버그 수정')
  RETURNING id INTO v_id;

  -- 3) 변경사항
  INSERT INTO public.patch_note_changes (patch_note_id, type, description, sort_order) VALUES
    (v_id, 'feature', '📷 사업자등록증 여러 장(반쪽) 업로드 - 한 장을 위/아래·좌/우로 나눠 찍었거나 여러 페이지여도 모두 올리면 OCR이 종합해서 하나의 정보로 인식합니다. 업로드 후 [이미지 추가]로 최대 4장까지 이어붙일 수 있어요.', 1),
    (v_id, 'feature', '📋 클립보드 붙여넣기 업로드 - 화면을 캡쳐한 뒤 거래처 상세 화면에서 Ctrl+V 하면 사업자등록증으로 바로 업로드·OCR 됩니다.', 2),
    (v_id, 'feature', '🗑️ 사업자등록증 이미지 삭제 - 업로드한 이미지의 우측 상단 X 버튼으로 한 장씩 삭제할 수 있습니다(스토리지 파일도 함께 제거).', 3),
    (v_id, 'improvement', '📄 사업자등록증 PDF 지원 - PDF 파일도 업로드·미리보기·OCR 인식이 가능하도록 수정했습니다.', 4),
    (v_id, 'improvement', '🔧 OCR 인식 안정성 개선 - 응답이 길어 잘리거나 형식이 어긋나 "파싱 실패" 하던 문제를 줄였습니다(출력 한도 상향 + 결과 복구 처리).', 5),
    (v_id, 'fix', '🐛 아임웹 가져오기 - 인사말 없이 문의 내용으로 시작하면 본문 문장 전체가 회사명으로 잡히던 버그 수정. 이제 이름만 정확히 들어갑니다.', 6),
    (v_id, 'fix', '🐛 아임웹 가져오기 - 채널톡 양식을 아임웹 탭에 붙여넣으면 담당자가 무시되고 항상 오일환으로 등록되던 버그 수정. 담당자/응대 라인을 인식합니다.', 7);

  RAISE NOTICE '패치노트 % 등록 완료', v_next;
END $$;
