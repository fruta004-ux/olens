-- 박상혁 담당자의 대량 거래 등록 스크립트
-- 단계: S0(신규 유입), S1(유효 리드), S2(상담 완료), S3(제안 발송)

-- 1. 전라북도 중앙관리선거위원회 (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '전라북도 중앙관리선거위원회', NOW(), NOW())
ON CONFLICT DO NOTHING
RETURNING id;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '전라북도 중앙관리선거위원회', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '전라북도 중앙관리선거위원회';

-- 2. 옥화식당 (제안 발송)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '옥화식당', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '옥화식당', '제안 발송', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '옥화식당';

-- 3. 1215-NS-143-병원 (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '1215-NS-143-병원', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '1215-NS-143-병원', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '1215-NS-143-병원';

-- 4. 아카벨리숲어린이집 (상담 완료)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '아카벨리숲어린이집', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '아카벨리숲어린이집', '상담 완료', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '아카벨리숲어린이집';

-- 5. (주)모아드림_콩콩쥬스 (제안 발송)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '(주)모아드림_콩콩쥬스', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '(주)모아드림_콩콩쥬스', '제안 발송', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '(주)모아드림_콩콩쥬스';

-- 6. BCMA (상담 완료)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), 'BCMA', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'BCMA', '상담 완료', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = 'BCMA';

-- 7. 코트야드 메리어트 서울 타임스퀘어 (제안 발송)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '코트야드 메리어트 서울 타임스퀘어', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '코트야드 메리어트 서울 타임스퀘어', '제안 발송', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '코트야드 메리어트 서울 타임스퀘어';

-- 8. 유랩 (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '유랩', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '유랩', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '유랩';

-- 9. 한국인문진흥원 (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '한국인문진흥원', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '한국인문진흥원', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '한국인문진흥원';

-- 10. 나리공조 (제안 발송)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '나리공조', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '나리공조', '제안 발송', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '나리공조';

-- 11. 캡틴 모바일 (제안 발송)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '캡틴 모바일', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '캡틴 모바일', '제안 발송', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '캡틴 모바일';

-- 12. 뉴잇(박정현) (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '뉴잇(박정현)', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '뉴잇(박정현)', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '뉴잇(박정현)';

-- 13. 팀신 글로벌 (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '팀신 글로벌', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '팀신 글로벌', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '팀신 글로벌';

-- 14. 담이 (유효 리드)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '담이', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '담이', '유효 리드', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '담이';

-- 15. 수수(sooosoo) (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '수수(sooosoo)', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '수수(sooosoo)', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '수수(sooosoo)';

-- 16. 인터글로 (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '인터글로', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '인터글로', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '인터글로';

-- 17. 노현석/스웰(swell) (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '노현석/스웰(swell)', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '노현석/스웰(swell)', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '노현석/스웰(swell)';

-- 18. RRR KOREA (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), 'RRR KOREA', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, 'RRR KOREA', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = 'RRR KOREA';

-- 19. 스타일지존 (제안 발송)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '스타일지존', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '스타일지존', '제안 발송', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '스타일지존';

-- 20. 호가플레이 (신규 유입)
INSERT INTO accounts (id, company_name, created_at, updated_at)
VALUES (gen_random_uuid(), '호가플레이', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO deals (id, account_id, deal_name, stage, assigned_to, pipeline, created_at, updated_at)
SELECT gen_random_uuid(), a.id, '호가플레이', '신규 유입', '박상혁', '영업 파이프라인', NOW(), NOW()
FROM accounts a WHERE a.company_name = '호가플레이';
