-- 정기 프로젝트 마스터 테이블
-- "월 대행" 등 매월 반복되는 프로젝트의 마스터(원본) 정보를 저장한다.
-- 매월 [정기 프로젝트 갱신] 버튼을 누르면 이 마스터를 기반으로 그 달치 project_specs row가 생성된다.
--
-- 단위: 프로젝트(딜) 기준. 같은 거래처라도 별도 프로젝트면 별도 마스터.
-- 종료일(end_month)은 현재 단계에서는 운영하지 않음 (영구 제외 액션으로 비활성화 처리).

CREATE TABLE IF NOT EXISTS public.recurring_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 출처(생성 근거) — 보통 S5 계약완료 시점의 client / account / deal
  client_id  UUID REFERENCES public.clients(id)  ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  source_deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,

  -- 마스터 정보 (영구 변경 시 함께 동기화)
  category TEXT CHECK (category IN ('마케팅', '홈페이지', '개발', '그 외')) DEFAULT '그 외',
  project_name TEXT,
  monthly_amount NUMERIC(15, 0),     -- 월 금액 (VAT 별도)
  payment_day INT CHECK (payment_day BETWEEN 1 AND 31), -- 매월 입금 예정일 (며칠)
  cost_type TEXT CHECK (cost_type IN ('계약금', '중도금', '완납금', '일괄 완납금', '월 대행비')) DEFAULT '월 대행비',
  assigned_to TEXT,                  -- 영업 담당자 기본값
  finance_assigned_to TEXT,          -- 재무 담당자 기본값
  notes TEXT,                        -- 마스터 비고

  -- 운영 상태
  is_active BOOLEAN NOT NULL DEFAULT TRUE,  -- false = 영구 제외(다음 갱신부터 안 나옴)
  start_month TEXT NOT NULL,                -- yyyy-MM (정기 시작월)
  -- end_month는 의도적으로 추가하지 않음 (계약서 모듈 도입 시 함께 설계)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_projects_account_id ON public.recurring_projects(account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_projects_client_id  ON public.recurring_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_projects_active     ON public.recurring_projects(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_projects_source_deal ON public.recurring_projects(source_deal_id);

ALTER TABLE public.recurring_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to recurring_projects" ON public.recurring_projects FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_recurring_projects_updated_at BEFORE UPDATE ON public.recurring_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE  public.recurring_projects IS '정기(월 단위 반복) 프로젝트 마스터. 매월 갱신 시 이 마스터 기반으로 project_specs row 생성.';
COMMENT ON COLUMN public.recurring_projects.payment_day IS '매월 입금 예정일 (1~31). 그 달에 그 일자가 없으면 말일로 보정.';
COMMENT ON COLUMN public.recurring_projects.is_active   IS '영구 제외 시 false. 갱신 모달에서 제외된 마스터는 다음 갱신부터 후보에서 빠짐.';

-- ─────────────────────────────────────────────────────────────
-- project_specs ↔ recurring_projects 연결 컬럼 추가
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.project_specs
  ADD COLUMN IF NOT EXISTS recurring_project_id UUID REFERENCES public.recurring_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS spec_month TEXT;  -- 어느 달치인지 (yyyy-MM). 정기 행에서만 채움.

CREATE INDEX IF NOT EXISTS idx_project_specs_recurring_project_id ON public.project_specs(recurring_project_id);
CREATE INDEX IF NOT EXISTS idx_project_specs_spec_month ON public.project_specs(spec_month);

-- 같은 정기 마스터에서 같은 달은 1행만 (중복 갱신 방지의 마지막 보루)
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_specs_recurring_month
  ON public.project_specs(recurring_project_id, spec_month)
  WHERE recurring_project_id IS NOT NULL AND spec_month IS NOT NULL;

COMMENT ON COLUMN public.project_specs.recurring_project_id IS '정기 프로젝트 마스터 FK. NULL이면 단건.';
COMMENT ON COLUMN public.project_specs.spec_month IS '어느 달치 행인지 (yyyy-MM). 정기에서만 채움.';
