import DOMPurify from "dompurify"

/**
 * 사용자 입력 HTML 을 신뢰 가능한 부분만 남기고 sanitize 한다.
 * dangerouslySetInnerHTML / element.innerHTML 사용처에서 반드시 거쳐야 한다.
 *
 * 정책:
 *  - <script>, on*= 핸들러, javascript: URL, srcdoc, iframe 등을 제거
 *  - 메모/리치텍스트 에디터에서 base64 이미지 / 일반 포맷팅 태그는 허용
 *  - form / input / iframe / link 차단 (data exfiltration / clickjacking 방지)
 *
 * 참고: DOMPurify 는 브라우저 DOM 을 사용하므로 client component / 브라우저
 *       런타임에서만 동작한다. SSR 에서 호출되면 정규식 fallback 으로 안전하게 처리.
 *       (현재 사용처는 모두 "use client" 이므로 정상 경로는 항상 브라우저에서 실행됨.)
 */
const ALLOWED_TAGS = [
  "b", "strong", "i", "em", "u", "s", "del", "ins", "mark", "small",
  "sub", "sup", "span", "br", "hr",
  "code", "pre", "kbd", "samp", "var", "blockquote", "q", "cite",
  "p", "div", "section", "article", "header", "footer", "main", "aside", "nav",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  "a", "img", "figure", "figcaption",
  "abbr", "address", "time",
]

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "target", "rel", "name", "id", "class", "style",
  "width", "height", "align", "valign", "colspan", "rowspan",
  "cellpadding", "cellspacing", "border", "color", "size", "face", "datetime",
]

const FORBID_TAGS = [
  "script", "style", "iframe", "object", "embed", "form", "input", "button",
  "textarea", "select", "link", "meta", "base", "frame", "frameset",
]

const FORBID_ATTR = [
  "onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur",
  "onkeyup", "onkeydown", "onkeypress", "formaction", "srcdoc", "ping",
]

const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel|data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml));|[a-z0-9._-]*(?:#|\?|\/))/i

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined"
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return ""
  // SSR 환경에서 호출되면 안전한 정규식 기반 fallback 사용 (모든 태그 제거).
  // 현재 호출처는 모두 client 이므로 일반적인 경로는 항상 DOMPurify 가 실행된다.
  if (!isBrowser()) {
    return stripHtmlSafe(input)
  }
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOWED_URI_REGEXP,
  })
}

/**
 * HTML 에서 모든 태그를 제거하고 텍스트만 추출. innerHTML 을 거치지 않는 안전한 fallback.
 * 정규식 기반이라 SSR / Edge 환경에서도 안전하다.
 */
export function stripHtmlSafe(input: string | null | undefined): string {
  if (!input) return ""
  return String(input).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
}
