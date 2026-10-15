#!/usr/bin/env node
/**
 * 헤드리스 로더 — imjin-war
 *
 * index.html 의 <script src="src/*.js"> 를 순서대로 읽어 node vm 안에서 실행한다.
 * DOM / Canvas / localStorage / AudioContext / requestAnimationFrame 은 전부 가짜(stub)다.
 * 게임 로직이 DOM과 분리되어 있으면 이 위에서 AI vs AI 자동 플레이·교착 검출·밸런스 통계를 돌릴 수 있다.
 *
 * 사용:
 *   node test/headless.js                            → 로드만 하고 전역 오류가 없는지 확인
 *   node test/headless.js --eval "Game.selfTest()"   → 식을 평가해 결과를 JSON으로 출력
 *   node test/headless.js --run test/sim.js          → vm 컨텍스트를 인자로 받는 스크립트 실행 (module.exports = (ctx, win)=>{...})
 *   node test/headless.js --seed 7                   → window.__SEED 로 전달
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = { eval: null, run: null, seed: null, html: 'index.html', quiet: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--eval') opt.eval = args[++i];
  else if (a === '--run') opt.run = args[++i];
  else if (a === '--seed') opt.seed = Number(args[++i]);
  else if (a === '--html') opt.html = args[++i];
  else if (a === '--quiet') opt.quiet = true;
}

/* ---------------------------------------------------------------- 가짜 캔버스 */
function makeCtx2d() {
  const store = {};
  return new Proxy({}, {
    get(_, k) {
      if (k === 'canvas') return store.canvas;
      if (k === 'measureText') return (t) => ({ width: String(t).length * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient') return () => ({ addColorStop() {} });
      if (k === 'createPattern') return () => ({});
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      if (k === 'isPointInPath' || k === 'isPointInStroke') return () => false;
      if (k in store) return store[k];
      return () => {};
    },
    set(_, k, v) { store[k] = v; return true; },
  });
}

function makeClassList() {
  const set = new Set();
  return { add(...c) { c.forEach((x) => set.add(x)); }, remove(...c) { c.forEach((x) => set.delete(x)); },
    toggle(c, f) { if (f === undefined) f = !set.has(c); f ? set.add(c) : set.delete(c); return f; }, contains(c) { return set.has(c); } };
}

function makeElement(tag) {
  const el = {
    tagName: String(tag).toUpperCase(), style: {}, dataset: {}, children: [], classList: makeClassList(),
    width: 1280, height: 720, clientWidth: 1280, clientHeight: 720, offsetWidth: 1280, offsetHeight: 720,
    innerHTML: '', textContent: '', value: '', id: '', className: '', hidden: false, parentNode: null,
    getContext() { const c = makeCtx2d(); c.canvas = el; return c; },
    getBoundingClientRect() { return { left: 0, top: 0, width: el.width, height: el.height, right: el.width, bottom: el.height, x: 0, y: 0 }; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    appendChild(c) { el.children.push(c); c.parentNode = el; return c; }, removeChild() {}, insertBefore(c) { el.children.push(c); return c; },
    append(...c) { c.forEach((x) => el.children.push(x)); }, prepend(...c) { c.forEach((x) => el.children.unshift(x)); },
    setAttribute(k, v) { el[k] = v; }, getAttribute(k) { return el[k] ?? null; }, removeAttribute() {}, hasAttribute(k) { return k in el; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {}, remove() {},
    requestFullscreen() { return Promise.resolve(); },
    toDataURL() { return 'data:,'; }, toBlob(cb) { cb && cb(null); },
    getElementsByTagName() { return []; },
    setPointerCapture() {}, releasePointerCapture() {},
  };
  return el;
}

/* ---------------------------------------------------------------- 가짜 window */
function makeWindow() {
  const elements = {};
  const listeners = {};
  const storage = {};
  const makeStorage = (s) => ({
    getItem: (k) => (k in s ? s[k] : null),
    setItem: (k, v) => { s[k] = String(v); },
    removeItem: (k) => { delete s[k]; },
    clear: () => { for (const k in s) delete s[k]; },
    key: (i) => Object.keys(s)[i] ?? null,
    get length() { return Object.keys(s).length; },
  });
  const rafQueue = [];
  const w = {
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, scrollX: 0, scrollY: 0,
    localStorage: makeStorage(storage), sessionStorage: makeStorage({}),
    navigator: { userAgent: 'headless', language: 'ko-KR', maxTouchPoints: 0, vibrate() {}, clipboard: { writeText: () => Promise.resolve() } },
    location: { href: 'file:///index.html', search: '', hash: '', reload() {}, protocol: 'file:' },
    screen: { width: 1280, height: 720, orientation: { type: 'landscape-primary', lock: () => Promise.reject(new Error('headless')), addEventListener() {} } },
    performance: { now: () => Number(process.hrtime.bigint() / 1000000n) },
    requestAnimationFrame(cb) { rafQueue.push(cb); return rafQueue.length; },
    cancelAnimationFrame() {},
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
    addEventListener(t, f) { (listeners[t] ||= []).push(f); },
    removeEventListener() {}, dispatchEvent() { return true; },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {}, removeEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    alert() {}, confirm() { return true; }, prompt() { return null; }, open() { return null; }, focus() {}, scrollTo() {},
    // ES 내장(Object·Array·Math·JSON·Date…)은 vm 컨텍스트가 제 realm 것을 제공한다. 호스트 것을 넣으면
    // `Object.getPrototypeOf(x) === Object.prototype` 같은 검사가 realm 불일치로 깨진다. 넣지 않는다.
    structuredClone,
    console,
    Image: function () { return makeElement('img'); },
    Audio: function () { return { play: () => Promise.resolve(), pause() {}, addEventListener() {} }; },
    AudioContext: undefined, webkitAudioContext: undefined,
    OffscreenCanvas: function (w, h) { const e = makeElement('canvas'); e.width = w; e.height = h; return e; },
    Path2D: function () { return { moveTo() {}, lineTo() {}, closePath() {}, arc() {}, rect() {}, addPath() {} }; },
    TextEncoder, TextDecoder, URL, URLSearchParams,
    fetch: () => Promise.reject(new Error('headless: no network')),
    __listeners: listeners,
    __raf: { step(n = 1) { for (let i = 0; i < n; i++) { const q = rafQueue.splice(0); q.forEach((cb) => cb(w.performance.now())); } }, pending: () => rafQueue.length },
    __storage: storage,
  };
  if (opt.seed != null) w.__SEED = opt.seed;
  w.self = w; w.window = w; w.globalThis = w; w.top = w; w.parent = w;
  const document = {
    title: '', body: makeElement('body'), head: makeElement('head'), documentElement: makeElement('html'),
    hidden: false, visibilityState: 'visible', readyState: 'complete', activeElement: null, fullscreenElement: null,
    getElementById(id) { return elements[id] || (elements[id] = Object.assign(makeElement('div'), { id })); },
    createElement(t) { return makeElement(t); },
    createElementNS(_, t) { return makeElement(t); },
    createTextNode(t) { return { textContent: t }; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener(t, f) { (listeners['doc:' + t] ||= []).push(f); }, removeEventListener() {},
    exitFullscreen() { return Promise.resolve(); }, hasFocus() { return true; },
    fonts: { load: () => Promise.resolve([]), ready: Promise.resolve(), check: () => true },
  };
  w.document = document;
  return w;
}

/* ---------------------------------------------------------------- 로드 */
function loadScripts(overrides) {
  const htmlPath = path.join(ROOT, opt.html);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const srcs = [...html.matchAll(/<script\s+src="([^"]+)"\s*>\s*<\/script>/g)].map((m) => m[1]);
  if (!srcs.length) throw new Error('index.html 에 <script src> 가 없습니다: ' + htmlPath);
  const w = makeWindow();
  if (overrides) Object.assign(w, overrides);
  const ctx = vm.createContext(w);
  const errors = [];
  for (const src of srcs) {
    const p = path.resolve(path.dirname(htmlPath), src);
    if (!fs.existsSync(p)) {
      errors.push({ src, error: '파일 없음' });
      if (!opt.quiet) console.error('[headless] ' + src + ' 파일 없음 — 건너뜀');
      continue;
    }
    const code = fs.readFileSync(p, 'utf8');
    try {
      vm.runInContext(code, ctx, { filename: src });
    } catch (e) {
      errors.push({ src, error: String((e && e.stack) || e) });
      if (!opt.quiet) console.error('[headless] ' + src + ' 실행 오류:\n' + ((e && e.stack) || e));
    }
  }
  return { ctx, w, srcs, errors };
}

function main() {
  const { ctx, w, srcs, errors } = loadScripts();
  if (!opt.quiet) console.error('[headless] 로드: ' + srcs.join(', ') + '  오류 ' + errors.length + '건');
  if (errors.length) process.exitCode = 1;
  const out = (v) => { if (v !== undefined) console.log(JSON.stringify(v, null, 1)); };
  const fail = (e) => { console.error((e && e.stack) || e); process.exitCode = 1; };
  if (opt.run) {
    const fn = require(path.resolve(opt.run));
    try {
      const r = fn(ctx, w);
      if (r && typeof r.then === 'function') r.then(out, fail); else out(r);
    } catch (e) { fail(e); }
  } else if (opt.eval) {
    try {
      const r = vm.runInContext(opt.eval, ctx);
      if (r && typeof r.then === 'function') r.then(out, fail); else out(r);
    } catch (e) { fail(e); }
  }
}

if (require.main === module) main();
module.exports = { loadScripts, makeWindow, makeElement, makeCtx2d };
