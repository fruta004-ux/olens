-- 역할 신설: '영상'(video)
-- user_role enum 에 video 값 추가. 앱에서 라벨은 '영상' 으로 표시.
-- (마케터는 enum 값 marketer 그대로 두고, 앱 라벨만 '그로우' 로 표기 — 별도 마이그레이션 불필요)
-- 주의: ALTER TYPE ... ADD VALUE 는 단독 실행. (트랜잭션/같은 문에서 즉시 사용 불가)

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'video';
