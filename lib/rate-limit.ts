/**
 * 단순한 in-memory token bucket. Vercel Edge / serverless 환경에서는 인스턴스마다
 * 별도 카운터가 되므로 완벽한 분산 rate limit 은 아니지만, 단일 사용자가
 * 한 인스턴스에서 LLM API 를 폭주하는 것을 막는 1차 방어선으로 충분하다.
 *
 * 분산 rate limit 이 필요해지면 Upstash Redis / Vercel KV 로 교체할 것.
 */

type Bucket = { tokens: number; updatedAt: number }

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

export interface RateLimitOptions {
  /** 버킷 식별자 (보통 user.id 또는 ip) */
  key: string
  /** 윈도우 동안 허용되는 요청 수 */
  limit: number
  /** 윈도우 길이 (ms) */
  windowMs: number
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)
  const refillRate = limit / windowMs

  if (!bucket) {
    buckets.set(key, { tokens: limit - 1, updatedAt: now })
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 }
  }

  const elapsed = now - bucket.updatedAt
  const refilled = Math.min(limit, bucket.tokens + elapsed * refillRate)
  bucket.tokens = refilled
  bucket.updatedAt = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { ok: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 }
  }

  const needed = 1 - bucket.tokens
  const retryAfterMs = Math.ceil(needed / refillRate)
  return { ok: false, remaining: 0, retryAfterMs }
}

/**
 * 메모리 누수를 막기 위해 5 분마다 한 번씩 stale 버킷 청소.
 * (서버리스 콜드 스타트 환경에서도 인스턴스가 살아 있는 동안만 동작.)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
let lastCleanup = Date.now()

export function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [k, v] of buckets) {
    if (now - v.updatedAt > CLEANUP_INTERVAL_MS) buckets.delete(k)
  }
}
