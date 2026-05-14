/** @type {import('next').NextConfig} */

// 보안 헤더 — 모든 응답에 적용된다.
// CSP 는 일단 호환성을 위해 너그럽게 시작 (운영 안정 후 점진적으로 좁힘).
// inline script / eval 은 Next.js (특히 dev) 가 사용하므로 'unsafe-inline' / 'unsafe-eval' 일부 허용.
const securityHeaders = [
  // HSTS — HTTPS 강제 (Vercel 은 이미 HTTPS, 이 헤더는 브라우저가 기억)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // 클릭재킹 방지
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // MIME sniffing 방지
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Referrer 누출 최소화
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // 위험한 브라우저 기능 차단 (마이크/카메라/지오로케이션 등)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()",
  },
  // 보수적 CSP — 운영 안정 후 inline-script 제거 시도 권장.
  // 외부 도메인:
  //  - Supabase (REST + Storage)
  //  - Gemini API
  //  - v0 API
  //  - CodeSandbox 미리보기
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://generativelanguage.googleapis.com https://api.v0.dev https://codesandbox.io https://*.csb.app https://*.vercel-insights.com",
      "frame-src 'self' https://*.csb.app https://codesandbox.io",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
]

const nextConfig = {
  // [C4 — 후속 작업] ignoreBuildErrors 는 보안 점검 보고서에서 제거 권장됐지만,
  // 기존 코드에 50+ 타입 에러가 누적되어 있어 한꺼번에 끄면 빌드가 깨진다.
  // 보안 자체와는 직접 관련이 없는 코드 위생 이슈이므로, 일단 유지하고
  // 별도 작업으로 점진 정리할 것. (SECURITY_FIX.md 의 follow-up 섹션 참고)
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // unoptimized: true 는 Next.js 의 자동 이미지 최적화를 끄는 옵션.
    // DoS 가능성이 있어 운영에서는 제거 권장이지만, Vercel 무료 플랜 호환을 위해 유지.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
