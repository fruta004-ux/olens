-- 활동 테이블에 점수 분류 추가 슬롯 3개 (slot2, slot3, slot4) 추가
-- 한 활동에 견적제작/견적발송/포도가 동시에 발생할 수 있어 슬롯을 분리
-- 주 분류(slot1, score_category): 단순접촉, 통화, 상담, 약속, 방문, 내방, 모임 중 1개
-- 추가 분류(score_extra_1/2/3): 견적제작, 견적발송, 포도 중 각각 1개 (중복 허용)

ALTER TABLE activities
ADD COLUMN IF NOT EXISTS score_extra_1 VARCHAR(50),
ADD COLUMN IF NOT EXISTS score_extra_2 VARCHAR(50),
ADD COLUMN IF NOT EXISTS score_extra_3 VARCHAR(50);

COMMENT ON COLUMN activities.score_extra_1 IS '활동 지수 추가 분류 1 (견적제작/견적발송/포도)';
COMMENT ON COLUMN activities.score_extra_2 IS '활동 지수 추가 분류 2 (견적제작/견적발송/포도)';
COMMENT ON COLUMN activities.score_extra_3 IS '활동 지수 추가 분류 3 (견적제작/견적발송/포도)';
