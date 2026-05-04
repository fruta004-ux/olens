-- 활동 테이블에 점수 분류 컬럼 추가
-- 활동 지수(활동 점수) 산정용. 각 활동 기록을 다음 중 하나로 분류:
-- 단순접촉(1), 통화(3), 상담(5), 약속(7), 방문(10), 내방(15),
-- 견적제작(1), 견적발송(1), 포도(1), 모임(2)

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS score_category VARCHAR(50);

COMMENT ON COLUMN activities.score_category IS '활동 지수 분류 (단순접촉, 통화, 상담, 약속, 방문, 내방, 견적제작, 견적발송, 포도, 모임)';
