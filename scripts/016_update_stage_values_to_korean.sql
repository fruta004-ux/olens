-- Stage 값을 영어에서 한글로 변경

-- S0_new_lead → S0_신규 유입
UPDATE deals 
SET stage = 'S0_신규 유입' 
WHERE stage = 'S0_new_lead';

-- S1_qualified → S1_접촉 시도
UPDATE deals 
SET stage = 'S1_접촉 시도' 
WHERE stage = 'S1_qualified';

-- S2_consultation → S2_상담 완료
UPDATE deals 
SET stage = 'S2_상담 완료' 
WHERE stage = 'S2_consultation';

-- S3_proposal → S3_제안 발송
UPDATE deals 
SET stage = 'S3_제안 발송' 
WHERE stage = 'S3_proposal';

-- S4_decision → S4_협상
UPDATE deals 
SET stage = 'S4_협상' 
WHERE stage = 'S4_decision';

-- S5_contract → S5_계약 완료
UPDATE deals 
SET stage = 'S5_계약 완료' 
WHERE stage = 'S5_contract';

-- S6_complete → S6_종료
UPDATE deals 
SET stage = 'S6_종료' 
WHERE stage = 'S6_complete';

-- 변경 결과 확인
SELECT stage, COUNT(*) as count 
FROM deals 
GROUP BY stage 
ORDER BY stage;
