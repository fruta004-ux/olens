-- CRM 데이터베이스 스키마 생성

-- 1. 거래처 (Accounts/Companies) 테이블
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT,
  employee_count TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  business_number TEXT,
  representative TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 연락처 (Contacts) 테이블
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  lead_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 거래 (Deals) 테이블
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'S0_신규 유입',
  amount_range TEXT,
  success_probability INTEGER DEFAULT 50,
  next_contact_date DATE,
  last_activity_date DATE,
  assigned_to TEXT,
  pipeline TEXT DEFAULT '영업 파이프라인 CRM',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 활동 (Activities) 테이블
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 메모 (Notes) 테이블
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_deals_account_id ON public.deals(account_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_next_contact_date ON public.deals(next_contact_date);
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON public.activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON public.activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_notes_account_id ON public.notes(account_id);
CREATE INDEX IF NOT EXISTS idx_notes_deal_id ON public.notes(deal_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 현재는 모든 사용자가 모든 데이터를 볼 수 있도록 설정 (추후 user_id 추가 시 수정 가능)
CREATE POLICY "Allow all access to accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to deals" ON public.deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 생성
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
