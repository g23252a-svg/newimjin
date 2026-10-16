"""화면 사진 찍기 — test/shot.html 을 헤드리스 Edge(또는 Chrome)로 1280x720 PNG 로 찍는다.

    py -3 test/shots.py --out <폴더> [--scen test/shots.json] [--slow] [이름 ...]

서버가 필요 없다(file:// 로 연다). 장면마다 문서 제목을 읽어 'OK ' 로 시작하지 않거나(오류 화면·빈 화면)
Main.debug.lastError() 가 남아 있으면 실패로 센다. 실패가 하나라도 있으면 종료 코드 1.

빠른 길(기본): websocket-client 모듈이 있으면 브라우저를 한 번만 띄우고 DevTools 로 장면을 차례로 연다(장면당 수 초).
느린 길(--slow 또는 모듈이 없을 때): 장면마다 브라우저를 두 번(--screenshot, --dump-dom) 띄운다. 전투 화면은
소프트웨어 렌더링이라 한 장에 1분 가까이 걸릴 수 있다.
"""
import argparse, base64, hashlib, json, os, pathlib, re, shutil, socket, subprocess, sys, tempfile, time, urllib.parse, urllib.request

HERE = pathlib.Path(__file__).resolve().parent
BROWSERS = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe"]
BASE_FLAGS = ['--headless=new', '--hide-scrollbars', '--mute-audio', '--allow-file-access-from-files', '--window-size=1280,720']


def browser():
    for b in BROWSERS:
        if os.path.exists(b):
            return b
    sys.exit('Edge/Chrome 을 찾지 못했다')


# ---------------------------------------------------------------- 느린 길: 장면마다 새 브라우저
def run(exe, prof, url, extra, tries=2):
    cmd = [exe] + BASE_FLAGS + ['--disable-gpu', '--user-data-dir=' + prof, '--virtual-time-budget=2500'] + extra + [url]
    for k in range(tries):
        try:
            return subprocess.run(cmd, capture_output=True, timeout=240)
        except subprocess.TimeoutExpired:
            print('  (시간 초과, ' + ('다시 찍는다' if k + 1 < tries else '포기') + ')', flush=True)
    return subprocess.CompletedProcess(cmd, 1, b'', b'')


def shoot_slow(exe, out, url, png):
    prof = str(out / '_profile')
    run(exe, prof, url, ['--screenshot=' + str(png)])
    dom = run(exe, prof, url, ['--dump-dom']).stdout.decode('utf-8', 'replace')
    m = re.search(r'<title>(.*?)</title>', dom, re.S)
    return (m.group(1).strip() if m else '(제목 없음)'), ''


# ---------------------------------------------------------------- 빠른 길: 브라우저 하나 + DevTools
class Fast:
    def __init__(self, exe):
        import websocket                                     # websocket-client
        s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
        self.prof = tempfile.mkdtemp(prefix='jingbi_shots_')
        gpu = ['--use-angle=d3d11', '--enable-gpu-rasterization'] if os.name == 'nt' else []   # 전투 화면 한 프레임 60ms → 7ms
        self.proc = subprocess.Popen([exe] + BASE_FLAGS + gpu + ['--remote-allow-origins=*', '--user-data-dir=' + self.prof,
                                      '--remote-debugging-port=' + str(port), 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        tabs = None
        for _ in range(150):
            try:
                tabs = json.load(urllib.request.urlopen('http://127.0.0.1:%d/json' % port, timeout=2)); break
            except Exception:
                time.sleep(0.2)
        page = [t for t in (tabs or []) if t.get('type') == 'page'][0]
        self.ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=120, suppress_origin=True)
        self.i = 0
        self.call('Page.enable'); self.call('Runtime.enable')
        self.call('Emulation.setDeviceMetricsOverride', width=1280, height=720, deviceScaleFactor=1, mobile=False)

    def call(self, method, **params):
        self.i += 1; mid = self.i
        self.ws.send(json.dumps({'id': mid, 'method': method, 'params': params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get('id') == mid:
                if 'error' in m:
                    raise RuntimeError(method + ': ' + json.dumps(m['error'], ensure_ascii=False))
                return m.get('result', {})

    def ev(self, expr):
        return self.call('Runtime.evaluate', expression=expr, returnByValue=True).get('result', {}).get('value', '')

    def shoot(self, url, png, settle=1.5):
        t0 = time.time()
        self.call('Page.navigate', url=url)
        title = ''
        while time.time() - t0 < 120:                        # shot.html 이 준비 코드를 돌리고 제목을 'OK …'/'ERR …' 로 바꾼다
            title = self.ev('document.title') or ''
            if title.startswith('OK ') or title.startswith('ERR'):
                break
            time.sleep(0.2)
        time.sleep(settle)                                    # 마지막 프레임이 그려지도록
        png.write_bytes(base64.b64decode(self.call('Page.captureScreenshot', format='png')['data']))
        err = self.ev('(window.Main && Main.debug && Main.debug.lastError && Main.debug.lastError()) || ""')
        return title or '(제목 없음)', err or ''

    def close(self):
        try:
            self.ws.close()
        except Exception:
            pass
        self.proc.kill()
        time.sleep(1)
        shutil.rmtree(self.prof, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--scen', default=str(HERE / 'shots.json'))
    ap.add_argument('--slow', action='store_true', help='장면마다 브라우저를 새로 띄운다(websocket-client 가 없을 때와 같다)')
    ap.add_argument('names', nargs='*')
    a = ap.parse_args()
    scen = json.load(open(a.scen, encoding='utf-8'))
    out = pathlib.Path(a.out).resolve(); out.mkdir(parents=True, exist_ok=True)
    exe = browser()
    base = (HERE / 'shot.html').as_uri()
    fast = None
    if not a.slow:
        try:
            fast = Fast(exe)
        except Exception as e:                                 # 모듈이 없거나 DevTools 연결 실패 → 느린 길
            print('(빠른 길을 쓸 수 없다: ' + str(e)[:120] + ' — 장면마다 브라우저를 띄운다)', flush=True)
    fails, hashes = [], {}
    try:
        for k, (name, code) in enumerate(scen.items()):
            if a.names and name not in a.names:
                continue
            png = out / (name + '.png')
            if png.exists():
                png.unlink()
            if fast:
                url = base + '?k=' + str(k) + '_' + str(int(time.time() * 1000)) + '#' + urllib.parse.quote(code, safe='')
                title, err = fast.shoot(url, png)
            else:
                title, err = shoot_slow(exe, out, base + '#' + urllib.parse.quote(code, safe=''), png)
            ok = png.exists() and title.startswith('OK ') and not err
            if err:
                title += '  [오류: ' + str(err)[:160] + ']'
            if png.exists():
                h = hashlib.md5(png.read_bytes()).hexdigest()
                if h in hashes:
                    title += '  [같은 그림: ' + hashes[h] + ']'
                hashes.setdefault(h, name)
            print(('ok  ' if ok else 'FAIL') + ' ' + name + '  ' + title, flush=True)
            if not ok:
                fails.append(name)
    finally:
        if fast:
            fast.close()
    print(('실패 ' + str(len(fails)) + ': ' + ', '.join(fails)) if fails else '모두 성공', flush=True)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
