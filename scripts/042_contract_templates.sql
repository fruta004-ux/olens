-- 계약서 자동 생성 시스템 스키마

-- 1. contract_templates: 카테고리별 계약서 조항 템플릿
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- '홈페이지', '마케팅', '디자인', '앱개발', 'ERP개발', '영상'
  title TEXT NOT NULL, -- 예: '홈페이지 구축 계약서'
  clauses JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ "order": 1, "title": "제 1 조 ( 목적 )", "body": "..." }, ...]
  bank_info JSONB DEFAULT '{}'::jsonb, -- { "bank": "하나은행", "account": "010-867201-68904", "holder": "오일환(플루타)" }
  company_info JSONB DEFAULT '{}'::jsonb, -- { "address": "...", "business_number": "...", "company_name": "...", "representative": "..." }
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE public.contract_templates IS '카테고리별 계약서 조항 템플릿';
COMMENT ON COLUMN public.contract_templates.category IS '계약서 카테고리: 홈페이지, 마케팅, 디자인, 앱개발, ERP개발, 영상';
COMMENT ON COLUMN public.contract_templates.clauses IS '조항 배열 JSON: [{ order, title, body }]';

CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON public.contract_templates(category);

-- 2. contracts: 실제 생성된 계약서 인스턴스
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL, -- 예: C-20260202-001
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  client_info JSONB DEFAULT '{}'::jsonb, -- 갑: { address, business_number, company_name, representative }
  contract_data JSONB DEFAULT '{}'::jsonb, -- { content_description, amount, deposit, balance, dev_start, dev_end }
  clauses JSONB NOT NULL DEFAULT '[]'::jsonb, -- 이 계약서에 적용된 조항 (편집 가능)
  bank_info JSONB DEFAULT '{}'::jsonb,
  company_info JSONB DEFAULT '{}'::jsonb, -- 을 측 정보
  seal_url TEXT, -- 을 도장 이미지 URL
  status TEXT DEFAULT '초안', -- '초안', '확정', '서명완료'
  contract_date TEXT, -- 계약일자 (예: 2026.02.13)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE public.contracts IS '실제 생성된 계약서 인스턴스';
CREATE INDEX IF NOT EXISTS idx_contracts_deal_id ON public.contracts(deal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_category ON public.contracts(category);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- 3. company_seals: 도장 이미지 관리
CREATE TABLE IF NOT EXISTS public.company_seals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL, -- '플루타', '오코랩스'
  seal_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE public.company_seals IS '회사 도장 이미지 관리';

-- 4. RLS 정책
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_seals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to contract_templates" ON public.contract_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to company_seals" ON public.company_seals FOR ALL USING (true) WITH CHECK (true);

-- 5. Supabase Storage 버킷 (수동 생성 필요)
-- Supabase 대시보드에서 'company-seals' 버킷을 생성하고 public 접근을 허용해야 합니다.

-- 6. 홈페이지 계약서 템플릿 초기 데이터 삽입
INSERT INTO public.contract_templates (category, title, display_order, clauses, bank_info, company_info) VALUES (
  '홈페이지',
  '홈페이지 구축 계약서',
  1,
  '[
    {
      "order": 1,
      "title": "제 1 조 ( 목적 )",
      "body": "본 \"갑\"과 \"을\"간에 \"홈페이지 구축\"에 관한 제반 사항을 규정하는데 목적이 있다."
    },
    {
      "order": 2,
      "title": "제 2 조 ( 용어의 정의 )",
      "body": "1. \"인터넷\"이란 전 세계에 걸쳐서 서로 연결된 통신망을 총칭한다.\n2. \"홈페이지\"란 인터넷 서비스 중 웹브라우저 상에 표현되는 HTML과 스크립트 형식으로 되어 있는 문서를 통칭한다.\n3. 본 계약에 명시된 홈페이지 구축은 웹/앱 홈페이지 제작 플랫폼 \"아임웹\"을 이용하여 제작한다."
    },
    {
      "order": 3,
      "title": "제 3 조 ( 홈페이지의 내용 )",
      "body": "1. \"갑\"의 요청에 의해 \"을\"이 구축할 홈페이지의 내용은 다음과 같다.\n① {{content_description}}"
    },
    {
      "order": 4,
      "title": "제 4 조 ( 홈페이지의 구축 )",
      "body": "1. \"갑\"은 홈페이지의 구축을 위해 \"을\"에게 제3조에 규정된 내용이 포함된 충분한 자료를 제공해야 한다.\n2. \"을\"은 제3조에 규정된 내용을 충분히 반영할 수 있는 홈페이지를 구축해야 한다.\n3. \"갑\"과 \"을\"은 완료된 홈페이지의 내용에 대해 상호 협의 하에 보완한다."
    },
    {
      "order": 5,
      "title": "제 5 조 ( 구축 비용 및 대금지급 조건 )",
      "body": "1. \"갑\"은 \"을\"에게 홈페이지 구축에 대한 대금 {{amount}}원(VAT별도)을 지급하기로 한다.\n대금 지급은 다음 계좌로 이루어진다 :\n⦁은행명 : {{bank_name}}\n⦁계좌번호 : {{bank_account}}\n⦁예금주명 : {{bank_holder}}\n2. 대금 지급은 다음 방식으로 진행된다 :\n⦁계약금 : 홈페이지 제작 대금의 {{deposit_percent}} {{deposit_amount}}원(VAT포함)\n⦁잔금 : 홈페이지 제작 대금의 {{balance_percent}} {{balance_amount}}원(VAT포함)\n※ 계약금은 계약 체결시 즉시 지급한다.\n※ 잔금 입금 시기는 최종 검수 완료 후 3일 이내로 한다."
    },
    {
      "order": 6,
      "title": "제 6 조 ( 추가비용 )",
      "body": "기능 명세서에 표기되지 않은 별도의 작업에 대해서는 추가 구축비용을 청구한다. 단 이로 인해 발생되는 별도의 구축비 외 부대비용은 \"갑\"이 보상 해 주어야 한다."
    },
    {
      "order": 7,
      "title": "제 7 조",
      "body": "홈페이지의 개발기간은 {{dev_start}} 부터 {{dev_end}} 까지로 하며 \"갑\"과 \"을\"의 쌍방 합의에 의하여 연장할 수 있다."
    },
    {
      "order": 8,
      "title": "제 8 조 ( 홈페이지 수정 보수 내역 )",
      "body": "\"을\"은 \"갑\"에게 홈페이지 구축 완료일 이후 시행되는 무상 수정,보수의 범위를 다음과 같이 정의 한다.\n1. \"을\"은 \"갑\"이 제공한 기획 자료 및 레퍼런스를 기준으로 홈페이지를 제작한다. 기본적인 수정 횟수는 초안 제작 후 총 2회이다.\n2. \"갑\"이 별도의 레퍼런스 없이 ''자유 디자인''으로 제작을 의뢰한 경우, \"을\"은 초안 1회 및 수정 1회를 포함하여 총 2회까지 디자인 수정이 가능하다. (이후 수정 요청 시 추가 비용이 발생할 수 있음)\n3. 레이아웃(구조) 변경은 불가하며, 해당 요청 시 별도 신규 구축 범위로 간주한다.\n4. 수정 횟수는 PC 및 MO을 모두 포함한 횟수로 산정한다."
    },
    {
      "order": 9,
      "title": "제 9 조 ( 추가 작업에 대한 내역 )",
      "body": "\"갑\"은 \"을\"에게 홈페이지 구축 작업 완료일 이후 발생되는 추가, 변경, 신설 구축에 대한 작업 비용을 별도 협의하여 추가,변경 계약서를 작성한 후 계약을 이행할 수 있으며 그 범위를 다음과 같이 정의한다.\n1. 새로운 디자인 요소의 추가 또는 기존 디자인의 수정 작업\n2. 개발 작업 발생 (기능 추가, 수정 및 소프트웨어 개발 포함)"
    },
    {
      "order": 10,
      "title": "제 10 조 ( 권 리 )",
      "body": "1. \"갑\"은 제공한 정보에 대한 소유권을 가진다.\n2. \"을\"은 홈페이지의 구축에 필요한 자료를 \"갑\"에게 요청할 수 있으며, \"갑\"은 공익성을 해치지 않은 범위 내의 모든 자료를 제공해야 한다.\n3. 구축된 저작물의 디자인 명기는 \"을\"의 표기법으로 한다. 단, 쌍방 합의에 따라 동등하게 표기 할 수 있다."
    },
    {
      "order": 11,
      "title": "제 11 조 ( 의 무 )",
      "body": "1. \"갑\"은 홈페이지 내용의 신뢰성을 책임져야 한다.\n2. \"갑\"은 홈페이지 내용의 오류로 인한 문제 발생시 그에 따른 책임을 진다.\n3. \"을\"은 홈페이지 구축을 위해 제공 받은 자료를 홈 페이지 구축 이외의 다른 목적에 사용할 수 없다."
    },
    {
      "order": 12,
      "title": "제 12 조 ( 계약상의 지위 양도 금지 )",
      "body": "\"갑\"과 \"을\"은 자신의 본 계약상의 지위를 제 3자에게 양도 할 수 없다."
    },
    {
      "order": 13,
      "title": "제 13 조",
      "body": "\"을\"과 \"갑\"은 서로의 이미지를 손상시키거나 명예훼손을 하여서는 안 된다."
    },
    {
      "order": 14,
      "title": "제 14 조",
      "body": "\"갑\"과 \"을\"은 사전승인을 통해서만 저작물을 임대, 양도, 처분할 수 있다."
    },
    {
      "order": 15,
      "title": "제 15 조",
      "body": "\"을\"은 본 계약을 충실히 이행하기 위해 최선을 다하여 모든 지식과 기술을 활용한다."
    },
    {
      "order": 16,
      "title": "제 16 조",
      "body": "본 계약은 \"갑\"과 \"을\"이 상호 날인을 한 날로부터 효력을 발생한다."
    },
    {
      "order": 17,
      "title": "제 17 조 ( 불가항력 )",
      "body": "본 계약에 규정된 의무의 불이행이 천재지변, 전쟁, 폭동 등 불가항력의 사유에 의해 발생한 경우 당사자는 그것에 대해 책임을 지지 않는다."
    },
    {
      "order": 18,
      "title": "제 18 조 ( 계약서 보관 )",
      "body": "본 계약서의 계약 당사자인 \"갑\"과 \"을\"은 본 계약서를 2부 작성, 대표 또는 그 권한을 대행할 수 있는 사람이 상호 서명 날인한 후 각 1부씩 보관한다."
    },
    {
      "order": 19,
      "title": "제 19 조 ( 추가 또는 특약 사항 )",
      "body": "본 계약에서 충분히 표현되지 못한 사항이나 특별히 규정해야 할 사항이 있을 때에는 별도의 규정을 상호 협의하여 첨부할 수 있다."
    },
    {
      "order": 20,
      "title": "제 20 조 ( 기타 )",
      "body": "본 계약 외의 발생된 사항은 사회에서 인정하는 범위 안에서 상호협의 조정토록 하며, 불가시에는 관계법령에 따라 처리하고 이 계약이 관계법령과 배치되는 부분은 관계법령이 우선한다.\n\"갑\"과 \"을\"은 계약체결의 증명을 위해 본 계약서를 2부 작성 상호날인 하여 각각 1부씩 보관한다."
    }
  ]'::jsonb,
  '{"bank": "하나은행", "account": "010-867201-68904", "holder": "오일환(플루타)"}'::jsonb,
  '{"address": "경기도 남양주시 다산순환로20, 제이에이동 9층 09-007호 (다산동,다산현대프리미어캠퍼스)", "business_number": "646-24-01010", "company_name": "플루타", "representative": "오일환"}'::jsonb
) ON CONFLICT DO NOTHING;
