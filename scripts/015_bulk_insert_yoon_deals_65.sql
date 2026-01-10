-- 윤경호 과장 담당 거래 65건 일괄 등록

-- 1. accounts 테이블에 거래처 추가 (중복 방지 없음, 모두 INSERT)
INSERT INTO accounts (company_name, phone, created_at, updated_at) VALUES
('이인규_medifella', '010-9506-5528', NOW(), NOW()),
('서포터즈', '010-4173-0857', NOW(), NOW()),
('그렇게하자', '010-4830-3189', NOW(), NOW()),
('구리 갈매 펜테리움', '031-869-2475', NOW(), NOW()),
('원더스탁', '010-9117-5699', NOW(), NOW()),
('지니inti', '010-2267-5605', NOW(), NOW()),
('주식회사 해광_김태영', '010-4862-1382', NOW(), NOW()),
('UND소파', '010-5285-4810', NOW(), NOW()),
('김선화', '010-7375-2175', NOW(), NOW()),
('김원일', '010-8933-2968', NOW(), NOW()),
('선심리상담센터_임영선', '010-3531-8156', NOW(), NOW()),
('허준덤', '010-2886-0157', NOW(), NOW()),
('리틀베이비', '010-6294-6409', NOW(), NOW()),
('강용훈', '010-48784790', NOW(), NOW()),
('등불성경', '010-9464-9499', NOW(), NOW()),
('로피아나', '010-4217-0453', NOW(), NOW()),
('엠유엠파트너스', '010-9911-8191', NOW(), NOW()),
('아우로라(김명활)', '010-8366-5767', NOW(), NOW()),
('비비씨에스', '010-', NOW(), NOW()),
('이종찬', '010-3461-8255', NOW(), NOW()),
('셀프마케팅', '010-2428-0003', NOW(), NOW()),
('브이이엔지 / 김준호', '010-2090-0890', NOW(), NOW()),
('다온', '010-6428-9371', NOW(), NOW()),
('피엘이엔지', '010-8338-6264', NOW(), NOW()),
('(주)아이티메탈 / 심문섭', '010-9369-2169', NOW(), NOW()),
('로담바이오 주식회사 ( 로담한의원 )', '010-9954-5672', NOW(), NOW()),
('주식회사더찬스컴퍼니(김성준)', '010-8386-3298', NOW(), NOW()),
('김혜란(사업자 발행예정)', '010-6590-0548', NOW(), NOW()),
('에이클 시스템', '010-8904-7705', NOW(), NOW()),
('천기', '010-7200-5571', NOW(), NOW()),
('위드퀀트(황도건)', '010-6341-1605', NOW(), NOW()),
('0904-NS-126-펜션업', '010-5209-2549', NOW(), NOW()),
('장비박사', '010-9902-4455', NOW(), NOW()),
('윤광준', '010-5452-2323', NOW(), NOW()),
('굿네이버스 글로벌 임팩트', '02-6733-2656', NOW(), NOW()),
('강동구장애인연합회', '010-3968-3146', NOW(), NOW()),
('이거다', '010-5159-0821', NOW(), NOW()),
('맹선균', '010-7637-8228', NOW(), NOW()),
('바노테크', '010-5394-7054', NOW(), NOW()),
('돈룩업', '010-8993-6405', NOW(), NOW()),
('가현종합건축사무소', '010-4386-2837', NOW(), NOW()),
('세무법인 율현', '010-7577-4227', NOW(), NOW()),
('홍진테크주식회사', '010-2077-9266', NOW(), NOW()),
('학산공원한신더휴', '010-2307-8800', NOW(), NOW()),
('김정현', '010-2922-7981', NOW(), NOW()),
('세라', '010-2433-7737', NOW(), NOW()),
('337 백곡막걸리', '010-4253-2077', NOW(), NOW()),
('넷슨', '010-6644-3083', NOW(), NOW()),
('유성훈', '010-3130-3494', NOW(), NOW()),
('거영주방', '010-8880-1467', NOW(), NOW()),
('디어피아노학원', '010-6649-4449', NOW(), NOW()),
('에스엔티', '010-4998-7183', NOW(), NOW()),
('경기도여성비전센터', '010-5451-0130', NOW(), NOW()),
('온누리 푸드', '010-6220-4585', NOW(), NOW()),
('F1마케팅', '010-6571-7419', NOW(), NOW()),
('킹영어', '010-2949-0341', NOW(), NOW()),
('메탈코텍', '010-6418-7242', NOW(), NOW()),
('제주 드림 타워', '010-9077-0426', NOW(), NOW()),
('출입국 행정 사무소', '010-2056-2588', NOW(), NOW()),
('스마일오토카워시', '010-7211-7934', NOW(), NOW()),
('Smart CAD', '010-3760-3839', NOW(), NOW()),
('브리드케어솔루션', '010-9124-9321', NOW(), NOW()),
('MBC CNI', '010-6633-8636', NOW(), NOW()),
('oursection', '010-5605-1232', NOW(), NOW());

-- 2. deals 테이블에 거래 추가
INSERT INTO deals (deal_name, account_id, assigned_to, stage, first_contact_date, needs_summary, inflow_source, inquiry_channel, company, created_at, updated_at)
SELECT 
  '이인규_medifella',
  (SELECT id FROM accounts WHERE company_name = '이인규_medifella' ORDER BY created_at DESC LIMIT 1),
  '윤경호 과장',
  'S0_신규 유입',
  '2025-10-30'::date,
  '2_홈페이지 리뉴얼',
  '2_아임웹 전문가찾기',
  '아임웹 전문가 문의',
  '플루타',
  NOW(),
  NOW()
UNION ALL SELECT '서포터즈', (SELECT id FROM accounts WHERE company_name = '서포터즈' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-27'::date, '2_홈페이지 제작', '2_아임웹 의뢰하기', '영업폰', '플루타', NOW(), NOW()
UNION ALL SELECT '그렇게하자', (SELECT id FROM accounts WHERE company_name = '그렇게하자' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-20'::date, '2_홈페이지 제작', '2_네이버 블로그', '플루타 H_ 홈페이지 DB문의', '플루타', NOW(), NOW()
UNION ALL SELECT '구리 갈매 펜테리움', (SELECT id FROM accounts WHERE company_name = '구리 갈매 펜테리움' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-19'::date, '2_홈페이지 제작', '1_전단지_갈매 금강 펜테리움', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '원더스탁', (SELECT id FROM accounts WHERE company_name = '원더스탁' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-17'::date, '10_프로그램 개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '지니inti', (SELECT id FROM accounts WHERE company_name = '지니inti' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-13'::date, '10_어플 개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '주식회사 해광_김태영', (SELECT id FROM accounts WHERE company_name = '주식회사 해광_김태영' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-19'::date, '2_홈페이지 리뉴얼', '2_아임웹 전문가찾기', '아임웹 전문가 문의', '플루타', NOW(), NOW()
UNION ALL SELECT 'UND소파', (SELECT id FROM accounts WHERE company_name = 'UND소파' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-19'::date, '2_홈페이지 제작', '8_기존 클라이언트', '개인연락처_박상혁', '플루타', NOW(), NOW()
UNION ALL SELECT '김선화', (SELECT id FROM accounts WHERE company_name = '김선화' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-11'::date, '2_홈페이지 제작', '2_네이버 검색', '디에스_홈페이지 DB문의', 'DS디자인', NOW(), NOW()
UNION ALL SELECT '김원일', (SELECT id FROM accounts WHERE company_name = '김원일' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-06'::date, '2_홈페이지 제작', '2_네이버 검색', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '선심리상담센터_임영선', (SELECT id FROM accounts WHERE company_name = '선심리상담센터_임영선' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-05'::date, '2_홈페이지 제작', '2_네이버 검색', '디에스_홈페이지 DB문의', 'DS디자인', NOW(), NOW()
UNION ALL SELECT '허준덤', (SELECT id FROM accounts WHERE company_name = '허준덤' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-03'::date, '2_홈페이지 제작', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '리틀베이비', (SELECT id FROM accounts WHERE company_name = '리틀베이비' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-10-15'::date, '10_프로그램 개발', '2_네이버 검색', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '강용훈', (SELECT id FROM accounts WHERE company_name = '강용훈' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-10-14'::date, '10_SASS 개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '등불성경', (SELECT id FROM accounts WHERE company_name = '등불성경' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-10-13'::date, '2_홈페이지 제작', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '로피아나', (SELECT id FROM accounts WHERE company_name = '로피아나' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-20'::date, '2_홈페이지 제작', '기타광고( 구글/배너광고 )', '플루타_홈페이지 DB문의', '플루타', NOW(), NOW()
UNION ALL SELECT '엠유엠파트너스', (SELECT id FROM accounts WHERE company_name = '엠유엠파트너스' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-18'::date, '10_ERP개발', '2_네이버 검색', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '아우로라(김명활)', (SELECT id FROM accounts WHERE company_name = '아우로라(김명활)' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-18'::date, '2_홈페이지 제작', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '비비씨에스', (SELECT id FROM accounts WHERE company_name = '비비씨에스' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-10-28'::date, '10_어플 개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '이종찬', (SELECT id FROM accounts WHERE company_name = '이종찬' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-10-13'::date, '2_홈페이지 제작', '2_아임웹 전문가찾기', '아임웹 전문가 문의', '플루타', NOW(), NOW()
UNION ALL SELECT '셀프마케팅', (SELECT id FROM accounts WHERE company_name = '셀프마케팅' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-19'::date, '2_홈페이지 제작', '2_아임웹 의뢰하기', '영업폰', '플루타', NOW(), NOW()
UNION ALL SELECT '브이이엔지 / 김준호', (SELECT id FROM accounts WHERE company_name = '브이이엔지 / 김준호' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-24'::date, '10_기타 맞춤 개발 문의', '구글 검색', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '다온', (SELECT id FROM accounts WHERE company_name = '다온' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-22'::date, '10_ERP개발, 10_어플 개발, 10_프로그램 개발', '2_네이버 검색', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '피엘이엔지', (SELECT id FROM accounts WHERE company_name = '피엘이엔지' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-24'::date, '10_어플 개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '(주)아이티메탈 / 심문섭', (SELECT id FROM accounts WHERE company_name = '(주)아이티메탈 / 심문섭' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-21'::date, '10_기타 맞춤 개발 문의, 4_SEO 최적화', '구글 검색', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '로담바이오 주식회사 ( 로담한의원 )', (SELECT id FROM accounts WHERE company_name = '로담바이오 주식회사 ( 로담한의원 )' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-19'::date, '2_홈페이지 제작', '구글 검색', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '주식회사더찬스컴퍼니(김성준)', (SELECT id FROM accounts WHERE company_name = '주식회사더찬스컴퍼니(김성준)' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-11-18'::date, '10_어플 개발', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '김혜란(사업자 발행예정)', (SELECT id FROM accounts WHERE company_name = '김혜란(사업자 발행예정)' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-10-01'::date, '2_홈페이지 제작', '2_네이버 플레이스', '플루타 고객센터(1번)', '플루타', NOW(), NOW()
UNION ALL SELECT '에이클 시스템', (SELECT id FROM accounts WHERE company_name = '에이클 시스템' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-09-18'::date, '10_ERP개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '천기', (SELECT id FROM accounts WHERE company_name = '천기' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-09-18'::date, '2_홈페이지 제작', '2_아임웹 전문가찾기', '플루타 H_ 홈페이지 DB문의', '플루타', NOW(), NOW()
UNION ALL SELECT '위드퀀트(황도건)', (SELECT id FROM accounts WHERE company_name = '위드퀀트(황도건)' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-09-12'::date, '10_기타 맞춤 개발 문의', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '0904-NS-126-펜션업', (SELECT id FROM accounts WHERE company_name = '0904-NS-126-펜션업' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-09-11'::date, '4_플랫폼 관리', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '장비박사', (SELECT id FROM accounts WHERE company_name = '장비박사' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-09-08'::date, '10_어플 개발, 10_자체솔루션/플랫폼개발', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '윤광준', (SELECT id FROM accounts WHERE company_name = '윤광준' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-09-03'::date, '2_홈페이지 제작', '2_아임웹 전문가찾기', '디에스_홈페이지 DB문의', 'DS디자인', NOW(), NOW()
UNION ALL SELECT '굿네이버스 글로벌 임팩트', (SELECT id FROM accounts WHERE company_name = '굿네이버스 글로벌 임팩트' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-09-02'::date, '10_어플 개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '강동구장애인연합회', (SELECT id FROM accounts WHERE company_name = '강동구장애인연합회' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-29'::date, '2_홈페이지 제작', '1_현프캠 전단지', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '이거다', (SELECT id FROM accounts WHERE company_name = '이거다' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-29'::date, '10_어플 개발', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '맹선균', (SELECT id FROM accounts WHERE company_name = '맹선균' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-25'::date, '10_어플 개발', '2_네이버 광고', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '바노테크', (SELECT id FROM accounts WHERE company_name = '바노테크' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-25'::date, '2_홈페이지 리뉴얼', '8_거래처소개', '개인연락처_박상혁', '플루타', NOW(), NOW()
UNION ALL SELECT '돈룩업', (SELECT id FROM accounts WHERE company_name = '돈룩업' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-25'::date, '4_종합 마케팅', '2_네이버 광고', '플루타_홈페이지 DB문의', '플루타', NOW(), NOW()
UNION ALL SELECT '가현종합건축사무소', (SELECT id FROM accounts WHERE company_name = '가현종합건축사무소' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-22'::date, '2_홈페이지 제작', '2_아임웹 의뢰하기', '영업폰', '플루타', NOW(), NOW()
UNION ALL SELECT '세무법인 율현', (SELECT id FROM accounts WHERE company_name = '세무법인 율현' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-21'::date, '10_ERP개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '홍진테크주식회사', (SELECT id FROM accounts WHERE company_name = '홍진테크주식회사' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-20'::date, '10_프로그램 개발', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '학산공원한신더휴', (SELECT id FROM accounts WHERE company_name = '학산공원한신더휴' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-18'::date, '2_홈페이지 제작', '2_아임웹 전문가찾기', '플루타 H_ 홈페이지 DB문의', '플루타', NOW(), NOW()
UNION ALL SELECT '김정현', (SELECT id FROM accounts WHERE company_name = '김정현' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-15'::date, '2_홈페이지 제작', '2_아임웹 전문가찾기', '디에스_홈페이지 DB문의', 'DS디자인', NOW(), NOW()
UNION ALL SELECT '세라', (SELECT id FROM accounts WHERE company_name = '세라' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-14'::date, '2_홈페이지 리뉴얼', '2_아임웹 의뢰하기', '오코랩스_구글 이메일', '오코랩스', NOW(), NOW()
UNION ALL SELECT '337 백곡막걸리', (SELECT id FROM accounts WHERE company_name = '337 백곡막걸리' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-14'::date, '2_홈페이지 제작', '2_네이버 검색', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '넷슨', (SELECT id FROM accounts WHERE company_name = '넷슨' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-13'::date, '2_홈페이지 제작', '1_전단지_하남 미사', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '유성훈', (SELECT id FROM accounts WHERE company_name = '유성훈' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-13'::date, '2_홈페이지 제작', '2_아임웹 전문가찾기', '아임웹 전문가 문의', '플루타', NOW(), NOW()
UNION ALL SELECT '거영주방', (SELECT id FROM accounts WHERE company_name = '거영주방' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-13'::date, '2_홈페이지 제작, 4_종합 마케팅', '2_네이버 광고', '플루타_홈페이지 DB문의', '플루타', NOW(), NOW()
UNION ALL SELECT '디어피아노학원', (SELECT id FROM accounts WHERE company_name = '디어피아노학원' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-09'::date, '10_어플 개발, 10_클라우드 인프라 구축 및 관리', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '에스엔티', (SELECT id FROM accounts WHERE company_name = '에스엔티' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-08-08'::date, '2_홈페이지 제작', '기타광고( 구글/배너광고 )', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '경기도여성비전센터', (SELECT id FROM accounts WHERE company_name = '경기도여성비전센터' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-29'::date, '2_홈페이지 제작', '2_네이버 블로그', '플루타_홈페이지 DB문의', '플루타', NOW(), NOW()
UNION ALL SELECT '온누리 푸드', (SELECT id FROM accounts WHERE company_name = '온누리 푸드' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-25'::date, '2_홈페이지 제작, 4_종합 마케팅', '1_전단지_테라타워', '플루타 고객센터(1번)', '플루타', NOW(), NOW()
UNION ALL SELECT 'F1마케팅', (SELECT id FROM accounts WHERE company_name = 'F1마케팅' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-24'::date, '10_ERP개발', '2_네이버 블로그', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '킹영어', (SELECT id FROM accounts WHERE company_name = '킹영어' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-24'::date, '2_홈페이지 제작, 4_종합 마케팅', '2_아임웹 전문가찾기', '오코랩스 고객센터(1번)', '오코랩스', NOW(), NOW()
UNION ALL SELECT '메탈코텍', (SELECT id FROM accounts WHERE company_name = '메탈코텍' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-23'::date, '2_홈페이지 제작', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '제주 드림 타워', (SELECT id FROM accounts WHERE company_name = '제주 드림 타워' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-22'::date, '10_어플 개발', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT '출입국 행정 사무소', (SELECT id FROM accounts WHERE company_name = '출입국 행정 사무소' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-15'::date, '2_홈페이지 제작', '2_아임웹 의뢰하기', '영업폰', 'DS디자인', NOW(), NOW()
UNION ALL SELECT '스마일오토카워시', (SELECT id FROM accounts WHERE company_name = '스마일오토카워시' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-07'::date, '2_홈페이지 제작', '2_아임웹 의뢰하기', '영업폰', '플루타', NOW(), NOW()
UNION ALL SELECT 'Smart CAD', (SELECT id FROM accounts WHERE company_name = 'Smart CAD' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-07'::date, '2_홈페이지 제작', '2_아임웹 의뢰하기', '영업폰', 'DS디자인', NOW(), NOW()
UNION ALL SELECT '브리드케어솔루션', (SELECT id FROM accounts WHERE company_name = '브리드케어솔루션' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-06'::date, '10_어플 개발, 4_SEO 최적화', '2_네이버 광고', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT 'MBC CNI', (SELECT id FROM accounts WHERE company_name = 'MBC CNI' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-02'::date, '10_프로그램 개발', '2_네이버 블로그', '오코랩스_홈페이지 DB문의', '오코랩스', NOW(), NOW()
UNION ALL SELECT 'oursection', (SELECT id FROM accounts WHERE company_name = 'oursection' ORDER BY created_at DESC LIMIT 1), '윤경호 과장', 'S0_신규 유입', '2025-07-02'::date, '2_홈페이지 제작', '2_아임웹 의뢰하기', '영업폰', '플루타', NOW(), NOW();
