#!/usr/bin/env python3
"""
단일 HTML 빌드 — imjin-war

index.html(개발용)의 <script src="src/xxx.js"></script> 와
<link rel="stylesheet" href="..."> 를 파일 내용으로 인라인해
더블클릭으로 바로 실행되는 HTML 한 장을 만든다.

사용:  py -3 build.py --out jingbi.html   (또는 python build.py --out jingbi.html)
"""
import re, sys, pathlib, argparse

HERE = pathlib.Path(__file__).resolve().parent

def inline(html: str, base: pathlib.Path) -> str:
    def js(m):
        src = m.group(1)
        p = (base / src).resolve()
        code = p.read_text(encoding='utf-8')
        # </script> 가 코드 문자열 안에 있으면 HTML 파서가 끊기므로 분리
        code = code.replace('</script>', '<\/script>')
        return f'<script>\n/* ===== {src} ===== */\n{code}\n</script>'
    def css(m):
        href = m.group(1)
        p = (base / href).resolve()
        return f'<style>\n/* ===== {href} ===== */\n{p.read_text(encoding="utf-8")}\n</style>'
    html = re.sub(r'<script\s+src="([^"]+)"\s*>\s*</script>', js, html)
    html = re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>', css, html)
    return html

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='index.html')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    src = HERE / a.src
    html = src.read_text(encoding='utf-8')
    out = inline(html, src.parent)
    if a.out:
        dest = HERE / a.out
    else:
        m = re.search(r'data-slug="([^"]+)"', html)
        slug = m.group(1) if m else 'game'
        dest = HERE / 'dist' / f'{slug}.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(out, encoding='utf-8')
    left = re.findall(r'<script\s+src=', out)
    if left:
        print(f'경고: 인라인되지 않은 script src {len(left)}개', file=sys.stderr)
        sys.exit(1)
    print(f'빌드 완료 → {dest}  ({dest.stat().st_size:,} bytes)')

if __name__ == '__main__':
    main()
