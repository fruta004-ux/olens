"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileDown, Trash2, Send } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Contract, ContractClause } from "@/lib/types/contract"
import {
  escapeHtml,
  formatContractDateKR,
  replacePlaceholders,
} from "@/lib/contract-utils"
import { enrichContractWithLiveAccount } from "@/lib/contract-sync"
import { SignatureRequestDialog } from "@/components/signature-request-dialog"

// ============================================================================
// 페이지 사이즈 상수 (A4)
// 변경 시 buildPrintCSS 의 변수도 같이 바뀌도록 일치시킴
//
// 페이지 여백은 4 방향 모두 20mm 로 균일.
// (15mm → 20mm 로 넓힘. 더 여유로운 레이아웃)
// ============================================================================
const PAGE_WIDTH_MM = 210
const PAGE_HEIGHT_MM = 297
const PAGE_PADDING_TOP_MM = 20
const PAGE_PADDING_BOTTOM_MM = 20
const PAGE_PADDING_LEFT_MM = 20
const PAGE_PADDING_RIGHT_MM = 20
// 서명 블록은 padding 안쪽 끝에 정렬 (= padding-bottom 과 같은 거리)
const SIGNATURE_BOTTOM_MM = 20
// 페이지 번호는 padding 영역 안쪽에 살짝 (페이지 가독성에 영향 없음)
const PAGE_NUMBER_BOTTOM_MM = 8

const MM_TO_PX = 96 / 25.4
const CONTENT_HEIGHT_PX = (PAGE_HEIGHT_MM - PAGE_PADDING_TOP_MM - PAGE_PADDING_BOTTOM_MM) * MM_TO_PX
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_PADDING_LEFT_MM - PAGE_PADDING_RIGHT_MM // 180mm

// 측정 안정성을 위한 여유 (안전 마진).
// 페이지마다 본문이 절대 페이지 번호/서명 블록 영역을 침범하지 않도록 보수적으로 잡음.
const SAFETY_MARGIN_PX = 16

// ============================================================================
// HTML 빌더 — 미리보기와 인쇄가 같은 HTML 사용 (100% 일치 보장)
// ============================================================================

interface PageData {
  clauses: ContractClause[]
  isFirst: boolean
  isLast: boolean
}

/** 카테고리별 전문(preamble) 목적 문구 — HWP 원본 양식의 문구를 따른다. */
const PREAMBLE_PURPOSE_BY_CATEGORY: Record<string, string> = {
  마케팅: "온라인 마케팅을 위하여",
  영상: "영상 제작·납품을 위하여",
}

function buildPreambleInnerHTML(contract: Contract, contractDateFormatted: string): string {
  const clientName = contract.client_info?.company_name || "홍길동"
  const clientLabel = contract.client_info?.company_name
    ? escapeHtml(contract.client_info.company_name)
    : "홍길동"
  const sellerLabel = escapeHtml(contract.company_info?.company_name || "플루타")
  const cat = escapeHtml(contract.category)

  const purpose = PREAMBLE_PURPOSE_BY_CATEGORY[contract.category]
  if (purpose) {
    return `${clientLabel} (이하 &quot;갑&quot;이라 한다)와 ${sellerLabel} (이하 &quot;을&quot;이라 한다)는 ${escapeHtml(purpose)} 다음과 같이 계약을 체결한다.`
  }

  const dealName = contract.contract_data?.content_description
    ? `${clientName} 홈페이지 구축`
    : `${clientName} ${contract.category} 프로젝트`

  return `${clientLabel} (이하 &quot;갑&quot;이라 한다)와 ${sellerLabel} (이하 &quot;을&quot;이라 한다)은 ${escapeHtml(contractDateFormatted)}자로 &apos;${escapeHtml(dealName)}&apos;(이하 &quot;${cat} 구축&quot;이라 한다.)에 관해 다음과 같이 계약을 체결한다.`
}

function buildClauseHTML(clauseTitle: string, clauseBody: string): string {
  return `
    <div class="clause">
      <p class="clause-title">${escapeHtml(clauseTitle)}</p>
      <p class="clause-body">${escapeHtml(clauseBody)}</p>
    </div>
  `.trim()
}

function buildSignatureHTML(contract: Contract, contractDateFormatted: string): string {
  const ci = contract.client_info || {}
  const co = contract.company_info || {}
  const sealUrl = contract.seal_url || ""
  // 갑(거래처) 측 도장 — 자체 서명 시스템으로 받은 도장
  const clientSealUrl = contract.client_seal_url || ""

  // 도장 자리 — (인) 텍스트는 항상 표시, 도장 있으면 그 위에 absolute 오버레이.
  // id 부여 → 외부에서 postMessage 로 동적 갱신 가능 (실시간 서명 미리보기).
  const buildSealZone = (zoneId: string, seal: string, alt: string) => `
    <span class="seal-zone" id="${zoneId}">
      <span class="seal-text">(인)</span>
      ${seal ? `<img class="seal-img" src="${escapeHtml(seal)}" alt="${escapeHtml(alt)}" />` : ""}
    </span>
  `.trim()

  // 갑이 "개인" 이면 사업자 항목 대신 주민번호/전화번호/성명으로 표기.
  // 도장(인)은 항상 마지막 행(사업자: 대표자, 개인: 성명) 옆에 찍힌다.
  const isIndividual = ci.client_type === "개인"
  const clientRowsHTML = isIndividual
    ? `
          <div class="row"><span class="label">주 소 :</span><span>${escapeHtml(ci.address || "")}</span></div>
          <div class="row"><span class="label">주민번호 :</span><span>${escapeHtml(ci.business_number || "")}</span></div>
          <div class="row"><span class="label">전화번호 :</span><span>${escapeHtml(ci.representative || "")}</span></div>
          <div class="row row-rep">
            <span class="label">성 명 :</span>
            <span>${escapeHtml(ci.company_name || "")}</span>
            ${buildSealZone("client-seal-zone", clientSealUrl, "갑 도장")}
          </div>
    `.trim()
    : `
          <div class="row"><span class="label">주 소 :</span><span>${escapeHtml(ci.address || "")}</span></div>
          <div class="row"><span class="label">사 업 자 :</span><span>${escapeHtml(ci.business_number || "")}</span></div>
          <div class="row"><span class="label">회 사 명 :</span><span>${escapeHtml(ci.company_name || "")}</span></div>
          <div class="row row-rep">
            <span class="label">대 표 자 :</span>
            <span>${escapeHtml(ci.representative || "")}</span>
            ${buildSealZone("client-seal-zone", clientSealUrl, "갑 도장")}
          </div>
    `.trim()

  return `
    <div class="signature">
      <div class="sig-date">계약일자 : ${escapeHtml(contractDateFormatted)}</div>
      <div class="parties">
        <div class="party">
          <h3>(갑)</h3>
          ${clientRowsHTML}
        </div>
        <div class="party">
          <h3>(을)</h3>
          <div class="row"><span class="label">주 소 :</span><span class="addr-narrow">${escapeHtml(co.address || "")}</span></div>
          <div class="row"><span class="label">사 업 자 :</span><span>${escapeHtml(co.business_number || "")}</span></div>
          <div class="row"><span class="label">회 사 명 :</span><span>${escapeHtml(co.company_name || "")}</span></div>
          <div class="row row-rep">
            <span class="label">대 표 자 :</span>
            <span>${escapeHtml(co.representative || "")}</span>
            ${buildSealZone("seller-seal-zone", sealUrl, "을 도장")}
          </div>
        </div>
      </div>
    </div>
  `.trim()
}

function buildPageHTML(
  contract: Contract,
  page: PageData,
  pageIdx: number,
  contractDateFormatted: string
): string {
  const titleAndPreamble = page.isFirst
    ? `
      <h1 class="title">${escapeHtml(contract.title)}</h1>
      <p class="preamble">${buildPreambleInnerHTML(contract, contractDateFormatted)}</p>
    `
    : ""

  const clausesHTML = page.clauses
    .map((c) => buildClauseHTML(c.title, replacePlaceholders(c.body, contract)))
    .join("\n")

  const signatureHTML = page.isLast ? buildSignatureHTML(contract, contractDateFormatted) : ""

  return `
    <div class="page">
      ${titleAndPreamble}
      ${clausesHTML}
      ${signatureHTML}
      <div class="page-number">- ${pageIdx + 1} -</div>
    </div>
  `.trim()
}

// ============================================================================
// CSS — 인쇄 + 미리보기 공용. 미리보기에는 음영 추가.
// ============================================================================

function buildBaseCSS(): string {
  return `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    body {
      font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif;
      background: white;
      color: #111;
    }
    .page {
      width: ${PAGE_WIDTH_MM}mm;
      height: ${PAGE_HEIGHT_MM}mm;
      padding: ${PAGE_PADDING_TOP_MM}mm ${PAGE_PADDING_RIGHT_MM}mm ${PAGE_PADDING_BOTTOM_MM}mm ${PAGE_PADDING_LEFT_MM}mm;
      position: relative;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      background: white;
    }
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    h1.title {
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      margin: 0 0 40px 0;
      letter-spacing: 0.05em;
    }
    .preamble {
      font-size: 10.5px;
      line-height: 1.7;
      margin: 0 0 28px 0;
    }
    .clause {
      margin-bottom: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .clause-title {
      font-weight: bold;
      font-size: 11px;
      margin: 0 0 2px 0;
    }
    .clause-body {
      font-size: 10.5px;
      line-height: 1.55;
      white-space: pre-wrap;
      margin: 0;
    }
    .signature {
      position: absolute;
      bottom: ${SIGNATURE_BOTTOM_MM}mm;
      left: ${PAGE_PADDING_LEFT_MM}mm;
      right: ${PAGE_PADDING_RIGHT_MM}mm;
      font-size: 10.5px;
    }
    .sig-date {
      text-align: center;
      margin-bottom: 16px;
      font-size: 11px;
      font-weight: 600;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .party {
      position: relative;
    }
    .party h3 {
      font-weight: bold;
      margin: 0 0 8px 0;
      font-size: 10.5px;
    }
    .row {
      margin-bottom: 4px;
      display: flex;
      align-items: flex-start;
    }
    .row .label {
      font-weight: 600;
      width: 56px;
      flex-shrink: 0;
    }
    .row-rep {
      position: relative;
      align-items: center;
    }
    /* (인) + 도장 자리. (인) 텍스트는 항상 표시되고, 도장이 있으면 그 위에 absolute 오버레이. */
    .seal-zone {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 16px;
      width: 64px;
      height: 64px;
      vertical-align: middle;
    }
    .seal-text {
      color: #aaa;
      font-size: 10.5px;
    }
    .seal-zone .seal-img {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 64px;
      height: 64px;
      object-fit: contain;
      pointer-events: none;
      opacity: 0.92;
    }
    .addr-narrow {
      font-size: 10px;
      line-height: 1.4;
    }
    .page-number {
      position: absolute;
      bottom: ${PAGE_NUMBER_BOTTOM_MM}mm;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 10px;
      color: #999;
    }
  `
}

function buildPreviewCSS(): string {
  return (
    buildBaseCSS() +
    `
      body { background: #f1f5f9; padding: 16px 0; }
      .page {
        margin: 0 auto 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        border: 1px solid #e2e8f0;
      }
    `
  )
}

// ============================================================================
// 페이지네이션 — DOM 에 hidden 으로 한 번 렌더링하고 실제 픽셀 높이로 분할
// 사용자 정의 규칙:
//   1. 조 단위로 분할 (조 중간에서 짤리지 않음)
//   2. 페이지 꽉 채우기 (들어가는 만큼 다 채움)
//   3. 마지막 조항 + 서명 블록을 같은 페이지에 두려고 시도
//      못 들어가면 마지막 조항을 다음 페이지로 옮겨서 서명 블록과 함께
// ============================================================================

interface MeasureResult {
  preambleHeight: number
  clauseHeights: number[]
  signatureHeight: number
}

/**
 * 모든 조항/preamble/서명 블록을 한 번에 hidden 컨테이너에 렌더링하고
 * 각각의 실제 픽셀 높이를 측정한다.
 *
 * 측정용 컨테이너는 페이지의 콘텐츠 너비(180mm)와 동일해야 줄바꿈이
 * 실제 페이지와 같음.
 */
function measureHeights(contract: Contract, contractDateFormatted: string): MeasureResult {
  const measureRoot = document.createElement("div")
  measureRoot.setAttribute("data-contract-measure", "1")
  measureRoot.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: ${CONTENT_WIDTH_MM}mm;
    visibility: hidden;
    pointer-events: none;
    background: white;
    color: #111;
    font-family: 'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif;
  `

  // base CSS 의 일부 (page 컨테이너 없이 클래스만 적용 가능)
  const styleEl = document.createElement("style")
  styleEl.textContent = buildBaseCSS()
  measureRoot.appendChild(styleEl)

  const clauses = contract.clauses || []

  // preamble + clauses + signature 를 한 컨테이너에 모두 렌더링
  // 단, signature 는 absolute positioned 라 wrapper 의 offsetHeight 로 측정 안 됨.
  // → signature 는 inline 으로 렌더해서 측정하는 별도 영역을 만든다.
  const inner = document.createElement("div")
  inner.innerHTML = `
    <div data-m="preamble">
      <h1 class="title">${escapeHtml(contract.title)}</h1>
      <p class="preamble">${buildPreambleInnerHTML(contract, contractDateFormatted)}</p>
    </div>
    ${clauses
      .map(
        (c, i) => `<div data-m="clause-${i}">${buildClauseHTML(c.title, replacePlaceholders(c.body, contract))}</div>`
      )
      .join("")}
    <div data-m="signature-inline">${buildSignatureInlineForMeasure(contract, contractDateFormatted)}</div>
  `
  measureRoot.appendChild(inner)
  document.body.appendChild(measureRoot)

  // 형제 요소들의 offsetTop 차이로 측정 → margin-collapse / margin-bottom 까지 포함.
  // offsetHeight 만 쓰면 .clause 의 margin-bottom 10px 가 누락되어 페이지가 넘침.
  const preambleEl = inner.querySelector('[data-m="preamble"]') as HTMLElement | null
  const clauseEls: (HTMLElement | null)[] = clauses.map(
    (_, i) => inner.querySelector(`[data-m="clause-${i}"]`) as HTMLElement | null
  )
  const sigEl = inner.querySelector('[data-m="signature-inline"]') as HTMLElement | null

  const preambleTop = preambleEl?.offsetTop ?? 0
  const firstClauseTop = clauseEls[0]?.offsetTop ?? preambleTop
  const preambleHeight = firstClauseTop - preambleTop

  const clauseHeights: number[] = clauses.map((_, i) => {
    const cur = clauseEls[i]
    if (!cur) return 0
    const next = i + 1 < clauseEls.length ? clauseEls[i + 1] : sigEl
    if (next) {
      // 다음 형제까지의 거리 = 현재 요소 + margin-bottom
      return next.offsetTop - cur.offsetTop
    }
    // 마지막 형제 → 자체 높이 + margin-bottom 추정치
    return cur.offsetHeight + 10
  })

  const signatureHeight = (sigEl?.offsetHeight ?? 0) + SAFETY_MARGIN_PX

  document.body.removeChild(measureRoot)

  return { preambleHeight, clauseHeights, signatureHeight }
}

/**
 * 서명 블록은 실제 인쇄 시 absolute positioned 라 offsetHeight 로 못 잡음.
 * 측정 전용으로 absolute 떼고 같은 내용을 inline 으로 렌더링한 HTML 을 만든다.
 */
function buildSignatureInlineForMeasure(contract: Contract, contractDateFormatted: string): string {
  const ci = contract.client_info || {}
  const co = contract.company_info || {}
  return `
    <div style="font-size:10.5px; padding-top: 8px;">
      <div style="text-align:center;margin-bottom:16px;font-size:11px;font-weight:600">계약일자 : ${escapeHtml(contractDateFormatted)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <h3 style="font-weight:bold;margin:0 0 8px 0;font-size:10.5px">(갑)</h3>
          <div style="margin-bottom:4px;display:flex"><span style="font-weight:600;width:56px;flex-shrink:0">주 소 :</span><span>${escapeHtml(ci.address || "")}</span></div>
          <div style="margin-bottom:4px;display:flex"><span style="font-weight:600;width:56px;flex-shrink:0">${ci.client_type === "개인" ? "주민번호" : "사 업 자"} :</span><span>${escapeHtml(ci.business_number || "")}</span></div>
          <div style="margin-bottom:4px;display:flex"><span style="font-weight:600;width:56px;flex-shrink:0">${ci.client_type === "개인" ? "전화번호" : "회 사 명"} :</span><span>${escapeHtml(ci.client_type === "개인" ? ci.representative || "" : ci.company_name || "")}</span></div>
          <div style="display:flex"><span style="font-weight:600;width:56px;flex-shrink:0">${ci.client_type === "개인" ? "성 명" : "대 표 자"} :</span><span>${escapeHtml(ci.client_type === "개인" ? ci.company_name || "" : ci.representative || "")}</span></div>
        </div>
        <div>
          <h3 style="font-weight:bold;margin:0 0 8px 0;font-size:10.5px">(을)</h3>
          <div style="margin-bottom:4px;display:flex"><span style="font-weight:600;width:56px;flex-shrink:0">주 소 :</span><span style="font-size:10px">${escapeHtml(co.address || "")}</span></div>
          <div style="margin-bottom:4px;display:flex"><span style="font-weight:600;width:56px;flex-shrink:0">사 업 자 :</span><span>${escapeHtml(co.business_number || "")}</span></div>
          <div style="margin-bottom:4px;display:flex"><span style="font-weight:600;width:56px;flex-shrink:0">회 사 명 :</span><span>${escapeHtml(co.company_name || "")}</span></div>
          <div style="display:flex"><span style="font-weight:600;width:56px;flex-shrink:0">대 표 자 :</span><span>${escapeHtml(co.representative || "")}</span></div>
        </div>
      </div>
    </div>
  `
}

function paginate(contract: Contract, measure: MeasureResult): PageData[] {
  const clauses = [...(contract.clauses || [])].sort((a, b) => a.order - b.order)
  if (clauses.length === 0) return []

  const { preambleHeight, clauseHeights, signatureHeight } = measure

  const pages: PageData[] = []
  let currentClauses: ContractClause[] = []
  let currentHeight = 0

  const availableForPage = (isFirst: boolean) =>
    CONTENT_HEIGHT_PX - (isFirst ? preambleHeight : 0) - SAFETY_MARGIN_PX

  for (let i = 0; i < clauses.length; i++) {
    const isLastClause = i === clauses.length - 1
    const reservedSig = isLastClause ? signatureHeight : 0
    const clauseH = clauseHeights[i] || 0
    const isFirstPageNow = pages.length === 0

    if (
      currentHeight + clauseH + reservedSig > availableForPage(isFirstPageNow) &&
      currentClauses.length > 0
    ) {
      // 현재 페이지 마감 (서명 블록 없이)
      pages.push({
        clauses: currentClauses,
        isFirst: isFirstPageNow,
        isLast: false,
      })
      currentClauses = [clauses[i]]
      currentHeight = clauseH
    } else {
      currentClauses.push(clauses[i])
      currentHeight += clauseH
    }
  }

  // 남은 조항 + 서명 블록 마무리
  if (currentClauses.length > 0) {
    const isFirstPageNow = pages.length === 0
    const available = availableForPage(isFirstPageNow)

    // 마지막 조항 + 서명 블록이 같은 페이지에 들어가는지 마지막 안전장치
    if (currentHeight + signatureHeight <= available) {
      // 들어감 → 같은 페이지에 서명 블록 함께
      pages.push({
        clauses: currentClauses,
        isFirst: isFirstPageNow,
        isLast: true,
      })
    } else {
      // 안 들어감 → 마지막 조항을 다음 페이지로 옮겨서 서명과 같이
      // (단, 현재 페이지에 조항이 1개뿐이고 그게 안 들어가는 케이스면 어쩔 수 없이
      //  서명 블록만 새 페이지에 둠)
      if (currentClauses.length > 1) {
        const lastClause = currentClauses[currentClauses.length - 1]
        const rest = currentClauses.slice(0, -1)
        pages.push({ clauses: rest, isFirst: isFirstPageNow, isLast: false })
        pages.push({ clauses: [lastClause], isFirst: false, isLast: true })
      } else {
        pages.push({ clauses: currentClauses, isFirst: isFirstPageNow, isLast: false })
        pages.push({ clauses: [], isFirst: false, isLast: true })
      }
    }
  }

  return pages
}

// ============================================================================
// 미리보기 / 인쇄 HTML 빌더
// ============================================================================

export function buildContractFullHTML(
  contract: Contract,
  pages: PageData[],
  options: { mode: "preview" | "print"; title?: string }
): string {
  return buildFullHTML(contract, pages, options)
}

export function measureContractHeights(contract: Contract, contractDateFormatted: string) {
  return measureHeights(contract, contractDateFormatted)
}

export function paginateContract(contract: Contract, measure: MeasureResult) {
  return paginate(contract, measure)
}

function buildFullHTML(
  contract: Contract,
  pages: PageData[],
  options: { mode: "preview" | "print"; title?: string }
): string {
  const contractDateFormatted = formatContractDateKR(contract.contract_date)
  const css = options.mode === "print" ? buildBaseCSS() : buildPreviewCSS()
  const pagesHTML = pages
    .map((page, idx) => buildPageHTML(contract, page, idx, contractDateFormatted))
    .join("\n")

  const docTitle = options.title || `${contract.client_info?.company_name || "거래처"}_${contract.title}`

  // preview 모드에서만 — 외부에서 도장 실시간 업데이트 가능하게 listener 주입
  const liveSealScript = options.mode === "preview" ? `
<script>
(function() {
  if (window.__contractSealReady) return;
  window.__contractSealReady = true;
  window.addEventListener("message", function(ev) {
    var d = ev.data || {};
    if (d.type !== "updateClientSeal") return;
    var zone = document.getElementById("client-seal-zone");
    if (!zone) return;
    var old = zone.querySelector("img.seal-img");
    if (old) old.remove();
    if (d.dataUrl) {
      var img = document.createElement("img");
      img.src = d.dataUrl;
      img.className = "seal-img";
      img.alt = "갑 도장";
      zone.appendChild(img);
    }
  });
  // 부모에게 ready 신호 — 부모가 첫 페인트 시점에 도장 이미 그려져 있어도 동기화 가능
  try { window.parent.postMessage({ type: "contractPreviewReady" }, "*"); } catch (e) {}
})();
</script>
` : ""

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(docTitle)}</title>
  <style>${css}</style>
</head>
<body>
  ${pagesHTML}
  ${liveSealScript}
</body>
</html>`
}

// ============================================================================
// React 컴포넌트
// ============================================================================

interface ContractViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: Contract
  onDelete?: () => void
}

export function ContractViewDialog({ open, onOpenChange, contract, onDelete }: ContractViewDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [pages, setPages] = useState<PageData[]>([])
  // 거래처 정보를 실시간으로 가져온 버전. 호출자가 enrich 안 했어도 안전.
  const [liveContract, setLiveContract] = useState<Contract>(contract)
  const [showSignDialog, setShowSignDialog] = useState(false)

  // open / contract 변경 시: 거래처 최신 정보 fetch 후 페이지 측정.
  useEffect(() => {
    if (!open) {
      setLiveContract(contract)
      return
    }

    let cancelled = false

    const run = async () => {
      // 1) 거래처 최신 정보로 client_info 덮어쓰기 (deal_id 있을 때만 실제 fetch)
      let workingContract: Contract = contract
      if (contract.deal_id) {
        try {
          const supabase = createBrowserClient()
          const enriched = await enrichContractWithLiveAccount(supabase, contract)
          if (!cancelled) workingContract = enriched as Contract
        } catch (err) {
          console.warn("[contract-view] 거래처 최신 정보 fetch 실패:", err)
        }
      }
      if (!cancelled) setLiveContract(workingContract)

      if (!workingContract.clauses || workingContract.clauses.length === 0) {
        if (!cancelled) setPages([])
        return
      }

      // 2) 폰트 로딩 대기 후 페이지 측정
      try {
        if (typeof document !== "undefined" && (document as any).fonts?.ready) {
          await (document as any).fonts.ready
        }
      } catch {
        // 무시
      }
      if (cancelled) return

      const dateF = formatContractDateKR(workingContract.contract_date)
      const measured = measureHeights(workingContract, dateF)
      const result = paginate(workingContract, measured)
      if (!cancelled) setPages(result)
    }
    run()

    return () => {
      cancelled = true
    }
  }, [open, contract])

  const previewHTML = useMemo(() => {
    if (pages.length === 0) return ""
    return buildFullHTML(liveContract, pages, { mode: "preview" })
  }, [liveContract, pages])

  const handlePrint = () => {
    if (pages.length === 0) {
      alert("계약서 내용이 없습니다.")
      return
    }

    const printWin = window.open("", "_blank", "width=900,height=1200")
    if (!printWin) {
      alert("팝업이 차단되었습니다. 브라우저 팝업 차단 설정을 확인해주세요.")
      return
    }

    const html = buildFullHTML(liveContract, pages, { mode: "print" })
    printWin.document.open()
    printWin.document.write(html)
    printWin.document.close()

    // 폰트/이미지 로드 대기 후 인쇄 트리거
    const triggerPrint = () => {
      try {
        printWin.focus()
        printWin.print()
      } catch (err) {
        console.error("인쇄 트리거 실패:", err)
      }
    }

    // afterprint 시 자동으로 새 창 닫기 (사용자가 PDF 저장 / 취소 둘 다 동작)
    printWin.onafterprint = () => {
      try {
        printWin.close()
      } catch {
        // 무시
      }
    }

    // 이미지(도장)가 있으면 로딩 후, 없으면 짧은 지연 후 인쇄
    if (printWin.document.readyState === "complete") {
      setTimeout(triggerPrint, 200)
    } else {
      printWin.onload = () => setTimeout(triggerPrint, 200)
    }

    // 안전장치: 1분 후에도 안 닫혔으면 강제 닫기
    setTimeout(() => {
      try {
        if (!printWin.closed) printWin.close()
      } catch {
        // 무시
      }
    }, 60_000)
  }

  const handleDelete = async () => {
    if (!contract.id) return
    if (!confirm("이 계약서를 삭제하시겠습니까?")) return
    setDeleting(true)
    try {
      const supabase = createBrowserClient()
      await supabase.from("contracts").delete().eq("id", contract.id)
      onOpenChange(false)
      onDelete?.()
    } catch (err) {
      console.error("계약서 삭제 실패:", err)
      alert("계약서 삭제에 실패했습니다.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[min(1200px,96vw)] !w-[min(1200px,96vw)] !h-[95vh] !max-h-[95vh] overflow-hidden p-0 flex flex-col"
      >
        <DialogTitle className="sr-only">계약서 상세</DialogTitle>
        <div className="px-4 py-3 border-b flex justify-between items-center bg-background shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">계약서 상세</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                contract.status === "확정"
                  ? "bg-green-100 text-green-700"
                  : contract.status === "서명완료"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {contract.status}
            </span>
            {pages.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">총 {pages.length} 페이지</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {contract.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "삭제 중..." : "삭제"}
              </Button>
            )}
            {contract.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignDialog(true)}
                disabled={pages.length === 0}
                className="gap-1"
              >
                <Send className="h-4 w-4" />
                서명 요청
              </Button>
            )}
            <Button onClick={handlePrint} className="gap-2" disabled={pages.length === 0}>
              <FileDown className="h-4 w-4" />
              인쇄 / PDF 저장
            </Button>
          </div>
        </div>

        {contract.id && (
          <SignatureRequestDialog
            open={showSignDialog}
            onOpenChange={setShowSignDialog}
            contractId={contract.id}
            contractTitle={contract.title}
            defaultEmail=""
            defaultName={
              // 개인 계약은 company_name 이 성명 (representative 는 전화번호)
              liveContract.client_info?.client_type === "개인"
                ? liveContract.client_info?.company_name || ""
                : liveContract.client_info?.representative || liveContract.client_info?.company_name || ""
            }
          />
        )}

        {/* 미리보기는 iframe srcDoc 으로 인쇄와 동일한 HTML 을 띄움 → 100% 일치 */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-100">
          {previewHTML ? (
            <iframe
              key={previewHTML.length /* 내용 바뀌면 재마운트 */}
              srcDoc={previewHTML}
              title="계약서 미리보기"
              className="w-full h-full block"
              style={{ border: 0, background: "#f1f5f9" }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {contract.clauses?.length === 0 ? "계약서 내용이 없습니다." : "페이지 계산 중..."}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
