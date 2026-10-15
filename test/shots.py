"""화면 사진 찍기 — test/shot.html 을 헤드리스 Edge(또는 Chrome)로 1280x720 PNG 로 찍는다.

    py -3 test/shots.py --out <폴더> [--scen test/shots.json] [이름 ...]

서버가 필요 없다(file:// 로 연다). 장면마다 --dump-dom 으로 문서 제목을 읽어
'OK ' 로 시작하지 않으면(오류 화면·빈 화면) 실패로 센다. 실패가 하나라도 있으면 종료 코드 1.
"""
import argparse, hashlib, json, os, pathlib, re, subprocess, sys, urllib.parse

HERE = pathlib.Path(__file__).resolve().parent
BROWSERS = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe"]


def browser():
    for b in BROWSERS:
        if os.path.exists(b):
            return b
    sys.exit('Edge/Chrome 을 찾지 못했다')


def run(exe, prof, url, extra):
    cmd = [exe, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files',
           '--window-size=1280,720', '--user-data-dir=' + prof, '--virtual-time-budget=2500'] + extra + [url]
    return subprocess.run(cmd, capture_output=True, timeout=120)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--scen', default=str(HERE / 'shots.json'))
    ap.add_argument('names', nargs='*')
    a = ap.parse_args()
    scen = json.load(open(a.scen, encoding='utf-8'))
    out = pathlib.Path(a.out).resolve(); out.mkdir(parents=True, exist_ok=True)
    prof = str(out / '_profile')
    exe = browser()
    base = (HERE / 'shot.html').as_uri()
    fails, hashes = [], {}
    for name, code in scen.items():
        if a.names and name not in a.names:
            continue
        url = base + '#' + urllib.parse.quote(code, safe='')
        png = out / (name + '.png')
        if png.exists():
            png.unlink()
        run(exe, prof, url, ['--screenshot=' + str(png)])
        dom = run(exe, prof, url, ['--dump-dom']).stdout.decode('utf-8', 'replace')
        m = re.search(r'<title>(.*?)</title>', dom, re.S)
        title = (m.group(1).strip() if m else '(제목 없음)')
        ok = png.exists() and title.startswith('OK ')
        if png.exists():
            h = hashlib.md5(png.read_bytes()).hexdigest()
            if h in hashes:
                title += '  [같은 그림: ' + hashes[h] + ']'
            hashes.setdefault(h, name)
        print(('ok  ' if ok else 'FAIL') + ' ' + name + '  ' + title)
        if not ok:
            fails.append(name)
    print(('실패 ' + str(len(fails)) + ': ' + ', '.join(fails)) if fails else '모두 성공')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
