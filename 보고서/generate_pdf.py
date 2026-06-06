import sys
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

BASE = Path(__file__).parent
HTML_PATH = BASE / "report.html"
PDF_PATH = BASE / "프로젝트명세서_기능수정_보고서.pdf"


def _resolve_output() -> Path:
    if not PDF_PATH.exists():
        return PDF_PATH
    try:
        with open(PDF_PATH, "ab"):
            return PDF_PATH
    except PermissionError:
        ts = datetime.now().strftime("%H%M%S")
        return PDF_PATH.with_name(f"{PDF_PATH.stem}_{ts}.pdf")


def main() -> None:
    if not HTML_PATH.exists():
        sys.exit(f"[ERROR] HTML 파일이 없습니다: {HTML_PATH}")

    out = _resolve_output()
    url = HTML_PATH.resolve().as_uri()
    print(f"[INFO] HTML : {url}")
    print(f"[INFO] PDF  : {out}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, wait_until="networkidle")
        page.emulate_media(media="print")
        page.pdf(
            path=str(out),
            format="A4",
            print_background=True,
            margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            prefer_css_page_size=True,
        )
        browser.close()

    size_kb = out.stat().st_size / 1024
    print(f"[DONE] PDF 생성 완료 ({size_kb:,.1f} KB) -> {out.name}")


if __name__ == "__main__":
    main()
