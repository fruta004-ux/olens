# 보안 점검 (3.md) 후속 조치 — 변경 요약 & 운영 가이드

> 2026-05-13 OOWGNOD 자체 점검 보고서 (`3.md`) 의 Critical / High 항목 전부에 대응한 코드 변경.
>
> **이 문서는 절대 public 레포로 그대로 push 하지 말 것** — `.gitignore` 에 추가됐어야 하지만 만약 누락됐다면 즉시 추가.

---

## 1. 코드 변경 요약 (이미 적용됨)

| ID | 항목 | 적용 위치 | 효과 |
|----|------|-----------|------|
| C1 | RLS 락다운 | `scripts/053_security_lockdown_rls.sql` | 모든 public 테이블 `authenticated` 만 접근, anon 키로는 PERMISSION DENIED |
| C1 | audit flag 청소 | `scripts/054_delete_audit_flag.sql` | 외부 점검자가 INSERT 한 row 삭제 |
| C2 | API 미인증 차단 | `middleware.ts` + `lib/auth-guard.ts` | `/api/webhook/*` 외 모든 라우트 401 |
| C2 | 라우트 자체 가드 | `app/api/*/route.ts` | defense-in-depth — 미들웨어가 우회돼도 라우트 내부에서 재확인 |
| C3 | admin 가드 | `app/admin/layout.tsx` + `lib/admin-guard.ts` | `ADMIN_EMAILS` 화이트리스트 기반 가드 |
| C4 | TS strict | `next.config.mjs` | **유지 (follow-up)** — 50+ 기존 타입 에러 때문에 일괄 끄면 빌드 깨짐 |
| H1 | API 키 로그 | `app/api/generate-quotation/route.ts` 등 | `console.log` 의 키 prefix 출력 제거 |
| H2 | XSS 방어 | `lib/sanitize.ts` (DOMPurify) | 모든 `innerHTML` / `dangerouslySetInnerHTML` 사용처 sanitize |
| H3 | OCR SSRF | `app/api/ocr-business-registration/route.ts` | https + 도메인 화이트리스트 + private IP 차단 + 사이즈 제한 |
| H4 | Webhook 보안 | `app/api/webhook/imweb-inquiry/route.ts` | secret **필수**, 누락 시 503 / 페이로드 64KB 제한 / service_role 사용 |
| M1-3 | Security Headers | `next.config.mjs` | HSTS / CSP / X-Frame / Referrer-Policy / Permissions-Policy |
| M2 | Rate Limit | `lib/rate-limit.ts` | LLM 라우트 사용자별 in-memory 제한 |
| M4 | PII 파일 제거 | `1.MD`, `2.md` 삭제 + `.gitignore` 강화 | working tree 에서 즉시 제거 |

---

## 2. 반드시 사용자가 직접 해야 하는 일 — 24시간 내

코드 변경만으로는 끝나지 않는다. 키 노출과 git history 는 **사람이 직접** 처리해야 한다.

### 2-1. Supabase anon 키 + service_role 키 회전 (가장 중요)

기존 anon 키는 이미 외부에 유출됐다고 가정 (`3.md` §1-1).

1. https://supabase.com/dashboard → 해당 프로젝트 → **Settings → API**
2. **anon (public) key** 옆 **Reset** 버튼 → 새 키 생성
3. **service_role (secret)** 도 노출 가능성이 있다면 동일하게 reset
4. 새 키들을 다음 위치에 업데이트:
   - 로컬: `.env.local`
   - Vercel: **Project Settings → Environment Variables** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
5. Vercel 에서 **Redeploy** (반드시 해야 새 키가 반영됨)

### 2-2. Gemini / v0 API 키 회전

콘솔 로그에 prefix 가 출력됐고 미인증 API 통해 abuse 됐을 가능성:

1. **Gemini**: https://aistudio.google.com/app/apikey → 기존 키 **Delete** → 새 키 생성
2. **v0**: https://v0.dev/settings/api → 기존 키 revoke → 새 키 생성
3. `.env.local` + Vercel 환경변수 업데이트 후 Redeploy

### 2-3. RLS 락다운 SQL 실행

1. Supabase Dashboard → **SQL Editor**
2. `scripts/053_security_lockdown_rls.sql` 전체 복사 → 붙여 넣고 **RUN**
3. 모든 테이블에서 `✅ X locked down` 라는 RAISE NOTICE 가 출력되는지 확인
4. (선택) `scripts/054_delete_audit_flag.sql` 도 실행해서 audit flag row 제거

#### 검증 — 잠금이 잘 됐는지 확인

```bash
# 새 anon 키로 시도 → 결과가 비어 있어야 함 ([])
curl "https://YOUR-PROJECT.supabase.co/rest/v1/accounts?select=*" \
  -H "apikey: NEW_ANON_KEY" -H "Authorization: Bearer NEW_ANON_KEY"
```

빈 배열 `[]` 또는 401/403 이 나오면 OK.
데이터가 보이면 락다운 SQL 이 실패한 것.

### 2-4. Webhook secret 설정 (MacroDroid 쪽도 같이 변경)

1. 무작위 시크릿 생성:
   ```bash
   openssl rand -base64 48
   ```
2. Vercel 환경변수에 `WEBHOOK_SECRET=<생성된 값>` 추가
3. MacroDroid HTTP Request 액션의 헤더 추가:
   ```
   Authorization: Bearer <같은 값>
   ```
4. 헬스체크: `curl -i https://www.olenshub.com/api/webhook/imweb-inquiry` → 200 + `auth_required` 정보 없이 단순 alive 응답
5. 인증 없이 POST 시도 → 401, 인증 헤더 포함 시 200 인지 확인

### 2-5. 관리자 화이트리스트 설정

```
ADMIN_EMAILS=admin@oort.kr,owner@plutaweb.com
```

`.env.local` + Vercel 둘 다 추가. **비워두면 모든 인증 사용자가 admin 권한**을 가지므로 운영에서는 반드시 채울 것.

### 2-6. Public Github 레포의 git history 정리

`1.MD`, `2.md` 는 working tree 에서는 삭제됐지만 **Github 커밋 히스토리에는 그대로 남아 있다**. 누구나 과거 커밋을 보면 PII 추출 가능.

```bash
# 백업 먼저 (안전을 위해)
git clone --mirror https://github.com/fruta004-ux/olens olens-backup.git

# git filter-repo 설치 (없으면 brew install git-filter-repo)
git filter-repo --path 1.MD --invert-paths
git filter-repo --path 2.md --invert-paths
git filter-repo --path 3.md --invert-paths

# 강제 push (협업자가 있으면 미리 알림)
git push --force --all
git push --force --tags
```

추가로 노출됐을 비밀 (anon key / Gemini 키 / v0 키) 도 어차피 §2-1 / §2-2 에서 회전했으니 history 에 남아도 무력.

레포를 **private** 로 전환하는 것도 강력히 권장:
Github → Settings → General → Danger Zone → Change visibility.

---

## 3. 운영 안정화 — 1주일 내

- [ ] `pnpm audit` CI 자동화 (Github Actions / Vercel CI)
- [ ] Supabase **Logs** 에서 외부 IP 의 anon 호출 흔적 추적 (침해 가능성 평가)
- [ ] Vercel **Analytics → Top Errors** 모니터링 — 락다운 이후 401 급증이 정상인지 (비정상 외부 봇 / 정상 사용자 인증 만료 구분)
- [ ] 사업자등록증 OCR 결과 컬럼 (`business_registration_url`, `business_registration_ocr`) 의 PII 노출 범위 점검 → 필요 없는 데이터 삭제
- [ ] Supabase Storage 의 `company-seals` / 사업자등록증 버킷을 **private** 으로 전환 + signed URL 사용 검토

---

## 4. 보안 부채 — 1개월 내 (follow-up)

- [ ] **C4. ignoreBuildErrors 제거 + 타입 에러 정리** (현재 50+ 에러 누적). 권장 순서:
  1. `app/contracts/page.tsx`, `app/quotations/page.tsx` 의 nullable 타입 정리
  2. `app/clients/[id]/page.tsx`, `app/deals/[id]/page.tsx` 의 implicit any 제거 (Supabase row 타입 파일 자동생성 추천: `supabase gen types typescript --project-id ...`)
  3. 모두 통과되면 `next.config.mjs` 에서 `ignoreBuildErrors: true` 줄 삭제
- [ ] **MFA**: Supabase Auth 의 TOTP / SMS MFA 도입 (운영자 계정 강제)
- [ ] **CSRF**: 외부 cross-site form 으로부터 보호하려면 토큰 기반 CSRF 도입 검토 (현재는 Same-Origin + auth 쿠키로 1차 방어)
- [ ] **CSP 강화**: `next.config.mjs` 의 CSP 에서 `'unsafe-inline'` / `'unsafe-eval'` 제거 (Next.js nonce 기반 inline-script 으로 전환)
- [ ] **분산 Rate Limit**: Upstash Redis / Vercel KV 로 교체 (현재 in-memory 는 인스턴스마다 별도)
- [ ] **created_by / owner 컬럼 도입**: 다중 사용자 환경에서 user 별 데이터 격리. 이 단계까지 가면 RLS 정책을 `auth.uid() = created_by` 로 좁힐 것

---

## 5. 새 환경변수 체크리스트

`.env.local` 에 다음이 모두 있어야 한다 (Vercel 도 동일):

| 변수 | 용도 | 비고 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon | **회전 필수** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role | **신규 필수** (webhook 용) |
| `GEMINI_API_KEY` | Gemini | **회전 필수** |
| `V0_API_KEY` | v0 | **회전 필수** |
| `WEBHOOK_SECRET` | Imweb webhook 인증 | **신규 필수**, 길고 무작위 |
| `ADMIN_EMAILS` | 관리자 화이트리스트 | 콤마 구분, 소문자 |
| `OCR_ALLOWED_HOSTS` | OCR fetch 허용 호스트 | (선택) Supabase 호스트는 자동 포함 |

`.env.local.example` 참고.

---

## 6. 변경된 파일 한눈에 보기

```
신규
├── lib/auth-guard.ts           # API 라우트 인증 헬퍼
├── lib/admin-guard.ts          # admin 화이트리스트 헬퍼
├── lib/sanitize.ts             # DOMPurify wrapper
├── lib/rate-limit.ts           # in-memory token bucket
├── lib/supabase/admin.ts       # service_role 클라이언트
├── app/admin/layout.tsx        # /admin 가드
├── scripts/053_security_lockdown_rls.sql  # RLS 일괄 락다운
├── scripts/054_delete_audit_flag.sql       # audit row 삭제
├── .env.local.example
└── SECURITY_FIX.md             # 이 문서

수정
├── middleware.ts               # /api 인증 강제 (webhook 만 예외)
├── next.config.mjs             # Security Headers 추가
├── .gitignore                  # PII / audit 파일 ignore
├── package.json                # isomorphic-dompurify 추가
├── app/api/generate-quotation/route.ts  # auth + rate limit + log 정리
├── app/api/generate-demo/route.ts        # 동일
├── app/api/ocr-business-registration/route.ts  # auth + SSRF 가드 + size 제한
├── app/api/snapshot/route.ts             # auth
├── app/api/webhook/imweb-inquiry/route.ts # secret 필수 + service_role
├── components/rich-text-editor.tsx       # sanitize
├── components/memo-dialog.tsx            # sanitize
├── app/memos/page.tsx                    # innerHTML 제거 (정규식 stripHtmlSafe)
├── app/deals/[id]/page.tsx               # sanitize
└── app/clients/[id]/page.tsx             # sanitize

삭제
├── 1.MD                        # 실제 고객 PII (커밋되어 있던 것)
└── 2.md                        # 카톡 캡처 PII
```

---

## 7. 의문이 있을 때

- 락다운 후 페이지가 안 열림 → §2-1 / §2-3 가 끝났는지 확인. 환경변수 반영 후 Vercel **Redeploy** 했는지.
- Webhook 이 모두 401 → MacroDroid 의 `Authorization: Bearer <SECRET>` 헤더가 정확히 일치하는지. 공백 / 따옴표 주의.
- `/admin` 접근 시 `/deals` 로 튕김 → `ADMIN_EMAILS` 에 본인 이메일이 들어 있는지 (대소문자 무관, 공백 없이).
- OCR 이 401 / 403 → `OCR_ALLOWED_HOSTS` 에 이미지 호스트 추가 (Supabase 호스트는 자동 포함).
