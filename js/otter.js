// カワウソをコードで組み立てる。単位は「頭の半径＝1」。成長に合わせて形を作り直し、全体を実寸(m)に縮める。
import * as THREE from 'three';
import { blob, furMesh, makeFurMaterial, paintGeo } from './fur.js';
import { lengthAt, COATS, FACES, NOSES, IRIS, TUFTS } from './data.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// 個性（名前と生まれた時刻から決まる）
export function makeTraits(seedStr, look = {}) {
  let h = 2166136261;
  for (const ch of seedStr) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
  const pickR = (arr, id) => arr.find(x => (x.id ?? x) === id) || arr[Math.floor(rnd() * arr.length)];
  return {
    coat: pickR(COATS, look.coat),
    face: pickR(FACES, look.face).id,
    nose: pickR(NOSES, look.nose).c,
    iris: pickR(IRIS, look.iris).c,
    tuftStyle: pickR(TUFTS, look.tuft),
    blush: 0.35 + rnd() * 0.5,
    earK: 0.85 + rnd() * 0.35,
    tone: rnd() * 2 - 1,        // 毛の明るさ
    warm: rnd() * 2 - 1,        // 赤み
    cream: 0.85 + rnd() * 0.3,  // 白っぽい所の広さ
    eye: 0.92 + rnd() * 0.18,   // 目の大きさ
    tuft: 0.6 + rnd() * 0.7,    // アホ毛
    fluff: 0.9 + rnd() * 0.25,  // もふもふ
    chub: 0.95 + rnd() * 0.12,  // ぽっちゃり
  };
}

// 日齢 → 体の形
export function shapeAt(d, tr) {
  const g = clamp(Math.log(1 + d / 25) / Math.log(1 + 365 / 25), 0, 1);
  const nb = 1 - sstep(0, 40, d); // 生まれたてらしさ
  const L = (a, b) => mix(a, b, g);
  const ch = tr.chub * mix(1.04, 1, g);
  return {
    g, nb, d,
    head: { rx: L(1.0, 0.93), ry: L(0.86, 0.72), rz: L(0.86, 1.0) },
    muz: { len: L(0.34, 0.52), w: L(0.5, 0.44), h: L(0.33, 0.3) },
    eyeR: L(0.22, 0.13) * tr.eye,
    earR: L(0.19, 0.14) * (tr.earK || 1),
    neckLen: L(0.2, 0.6), neckR: L(0.68, 0.68) * ch,
    chest: { rx: L(0.86, 0.78) * ch, ry: L(0.8, 0.73) * ch, rz: L(0.95, 1.5) },
    hips: { rx: L(0.98, 0.86) * ch, ry: L(0.88, 0.77) * ch, rz: L(1.0, 1.5) },   // おしり側が太い洋なし形
    gap: L(1.0, 2.2) * (1 - nb * 0.2),
    arm: L(0.44, 0.58), armR: L(0.23, 0.21), paw: L(0.2, 0.18),
    thigh: L(0.36, 0.58), thighR: L(0.38, 0.34), foot: L(0.4, 0.52),
    tail: L(0.85, 2.9) * (1 - nb * 0.15), tailR: L(0.38, 0.43),
    fur: L(0.052, 0.036) * (1 - nb * 0.3) * tr.fluff,   // ふわふわで少し長い毛
    tuft: (tr.tuftStyle === 'none' ? 0 : tr.tuft) * (1 - sstep(110, 300, d)) * (0.4 + 0.6 * sstep(5, 30, d)),
  };
}

// ポーズ（角度はラジアン。b=体 sp=背骨 nk=首 hd=頭 sh=肩 el=ひじ hp=もも kn=ひざ tl=しっぽ）
const KEYS = ['bP', 'bY', 'bR', 'spP', 'spY', 'nkP', 'nkY', 'hdP', 'hdY', 'hdR', 'shL', 'shR', 'elL', 'elR', 'shS',
  'hpL', 'hpR', 'knL', 'knR', 'hpS', 'tlP', 'tlC', 'tlY', 'eye', 'mouth', 'tongue', 'ear'];
const BASE = Object.fromEntries(KEYS.map(k => [k, 0]));
Object.assign(BASE, { eye: 1, tlP: -0.15, tlC: 0.04, knL: -0.1, knR: -0.1, shS: 0.12, hpS: 0.1 });   // ひじ・ひざは少し外に張る
const P = o => ({ ...BASE, ...o });
export const POSES = {
  stand: P({}),
  sit: P({ bP: 0.28, spP: 0.18, nkP: -0.05, hdP: -0.3, shL: -0.3, shR: -0.3, elL: 0.0, elR: 0.0, hpL: 0.55, hpR: 0.55, knL: -0.9, knR: -0.9, tlP: 0.2, tlC: 0.03 }),
  lie: P({ nkP: -0.05, hdP: -0.2, shL: 1.35, shR: 1.35, elL: -0.15, elR: -0.15, hpL: -1.3, hpR: -1.3, knL: 0.2, knR: 0.2, tlP: -0.1, tlC: 0 }),
  lieUp: P({ nkP: 0.25, hdP: -0.15, shL: 1.3, shR: 1.3, elL: -0.25, elR: -0.25, hpL: -1.3, hpR: -1.3, knL: 0.2, knR: 0.2, tlP: -0.1, tlC: 0 }),
  back: P({ bR: Math.PI, nkP: -0.35, hdP: -0.85, hdR: 0.25, shL: 0.55, shR: 1.5, elL: 1.2, elR: 0.35, shS: 0.15, hpL: 0.7, hpR: 0.6, knL: -1.0, knR: -1.1, hpS: 0.35, tlP: 0.0, tlC: -0.02, eye: 0 }),
  curl: P({ bR: 1.45, spY: 0.55, nkY: 0.55, hdY: 0.4, hdP: 0.2, shL: 0.9, shR: 0.9, elL: -1.3, elR: -1.3, hpL: 0.9, hpR: 0.9, knL: -1.2, knR: -1.2, tlY: 0.35, tlC: 0.0, eye: 0 }),
  sleepLie: P({ nkP: -0.2, nkY: 0.35, hdP: 0.1, hdR: 0.3, shL: 1.3, shR: 1.35, elL: -0.3, elR: -0.2, hpL: -1.3, hpR: -1.2, knL: 0.2, knR: 0.2, tlY: 0.35, tlP: -0.1, tlC: 0, eye: 0 }),
  stand2: P({ bP: 1.3, spP: 0.12, nkP: -0.85, hdP: -0.45, shL: 0.6, shR: 0.6, elL: -1.5, elR: -1.5, hpL: -1.05, hpR: -1.05, knL: -0.25, knR: -0.25, tlP: 1.2, tlC: 0.05 }),
  eat: P({ bP: 0.85, spP: 0.2, nkP: -0.15, hdP: -0.25, shL: 1.25, shR: 1.25, elL: -1.55, elR: -1.55, shS: -0.18, hpL: 1.1, hpR: 1.1, knL: -0.6, knR: -0.6, tlP: 0.75 }),
  milk: P({ bR: 2.6, nkP: 0.35, hdP: 0.2, hdR: 0.2, shL: 1.45, shR: 1.45, elL: -1.0, elR: -1.0, shS: -0.15, hpL: 0.8, hpR: 0.8, knL: -0.8, knR: -0.8, hpS: 0.35, tlC: 0 }),
  hug: P({ nkP: 0.1, hdP: -0.3, hdR: -0.15, shL: 1.45, shR: 1.45, elL: -0.45, elR: -0.45, shS: -0.12, hpL: -1.3, hpR: -1.3, knL: 0.2, knR: 0.2, tlC: 0.03 }),
  groom: P({ bP: 0.7, spP: 0.15, spY: 0.25, nkP: 0.25, nkY: 0.95, hdP: 0.45, hdY: 0.45, shL: 1.3, shR: 1.0, elL: -1.4, elR: -1.2, hpL: 1.1, hpR: 1.1, knL: -0.6, knR: -0.6, tlP: 0.6, eye: 0.3 }),
  swim: P({ bP: 0.24, spP: 0.05, nkP: 0.2, hdP: -0.32, shL: 0.75, shR: 0.75, elL: -0.25, elR: -0.25, hpL: -1.25, hpR: -1.25, knL: 0.25, knR: 0.25, tlP: 0.2, tlC: 0.02 }),
  sitUp: P({ bP: 0.95, spP: 0.32, nkP: -0.55, hdP: -0.45, shL: 0.4, shR: 0.4, elL: -0.55, elR: -0.55, shS: 0.08, hpL: -0.2, hpR: -0.2, knL: 0.7, knR: 0.7, hpS: 0.3, tlP: 0.9, tlC: 0.06 }),
  sled: P({ nkP: -0.08, hdP: 0.14, shL: -1.35, shR: -1.35, elL: 0.35, elR: 0.35, shS: 0.05, hpL: -1.55, hpR: -1.55, knL: 0.25, knR: 0.25, hpS: 0.08, tlP: -0.08, tlC: 0 }),   // お腹ですべる：前足は体の横、後ろ足は後ろへ
  beg: P({ bP: 0.3, spP: 0.1, nkP: 0.5, hdP: 0.38, shL: 0.35, shR: 0.35, elL: 0.05, elR: 0.05, hpL: -0.9, hpR: -0.9, knL: 0.1, knR: 0.1, tlP: 0.15 }),
  eatLie: P({ nkP: 0.05, hdP: -0.2, shL: 1.05, shR: 1.05, elL: -0.35, elR: -0.35, hpL: -1.3, hpR: -1.3, knL: 0.2, knR: 0.2, tlP: -0.1, tlC: 0 }),
  tuck: P({ spP: -0.3, nkP: -0.35, hdP: 0.15, shL: 1.25, shR: 1.25, elL: -1.45, elR: -1.45, hpL: 1.05, hpR: 1.05, knL: -1.35, knR: -1.35, tlP: -0.6, tlC: 0.22 }),
  crawl: P({ nkP: -0.12, hdP: 0.08, shL: 0.35, shR: 0.35, elL: -0.75, elR: -0.75, hpL: -0.35, hpR: -0.35, knL: -0.65, knR: -0.65, tlP: -0.2, tlC: 0.0 }),
  finger: P({ nkP: 0.35, hdP: -0.05, shL: 1.25, shR: 1.25, elL: -0.2, elR: -0.2, hpL: -1.3, hpR: -1.3, knL: 0.2, knR: 0.2, tlC: 0 }),
  hold: P({ bP: 0.95, spP: 0.12, nkP: -0.3, hdP: -0.1, shL: 1.25, shR: 1.25, elL: -1.0, elR: -1.0, shS: -0.25, hpL: 1.1, hpR: 1.1, knL: -0.6, knR: -0.6, tlP: 0.85 }),
  feel: P({ bP: -0.2, spP: -0.05, nkP: -0.35, hdP: -0.2, shL: 0.6, shR: -0.2, elL: 0.3, elR: 0.4, hpL: 0.2, hpR: 0.2, tlP: 0.2 }),
  climb: P({ bP: 0.75, spP: 0.15, nkP: -0.35, hdP: -0.2, shL: 1.55, shR: 1.55, elL: -0.5, elR: -0.5, hpL: -0.75, hpR: -0.75, knL: -0.2, knR: -0.2, tlP: 0.6 }),
  dive: P({ bP: -0.45, spP: -0.1, nkP: 0.1, hdP: 0.1, shL: 1.35, shR: 1.35, elL: 0.1, elR: 0.1, hpL: -1.45, hpR: -1.45, knL: 0.3, knR: 0.3, tlP: 0.35, tlC: 0.04 }),
  juggle: P({ bP: 0.6, spP: 0.2, nkP: -0.2, hdP: -0.45, shL: 1.05, shR: 1.05, elL: -1.1, elR: -1.1, shS: -0.12, hpL: 1.0, hpR: 1.0, knL: -0.6, knR: -0.6, tlP: 0.5 }),
};

const _v = new THREE.Vector3(), _q = new THREE.Quaternion();

// しぐさ：ポーズの上に重ねる短い動き。k=0→1 の進み具合、t=秒、o=カワウソ
const plat = (k, a = 0.15) => sstep(0, a, k) * sstep(1, 1 - a, k);
export const ACTS = {
  tilt: { dur: 2.4, fn(p, k, t, o) { const e = plat(k, 0.25); p.hdR += 0.5 * e * o.actSide; p.nkY += 0.1 * e * o.actSide; } },
  shake: { dur: 1.6, base: 'stand', fn(p, k, t, o) { const e = plat(k, 0.1), w = Math.sin(t * 42); p.bR += 0.3 * w * e; p.hdY += 0.45 * Math.sin(t * 42 + 1) * e; p.hdR += 0.3 * w * e; p.tlY += 0.5 * Math.sin(t * 42 + 2) * e; p.ear = 0.6 * e; p.eye = Math.min(p.eye, 1 - 0.85 * e); } },
  roll: { dur: 2.6, base: 'lie', fn(p, k, t, o) { p.bR += o.actSide * Math.PI * 2 * sstep(0.12, 0.88, k); const e = plat(k, 0.2); p.shL -= 0.4 * e; p.shR -= 0.4 * e; p.elL -= 0.8 * e; p.elR -= 0.8 * e; p.hpL += 0.9 * e; p.hpR += 0.9 * e; p.knL -= 0.8 * e; p.knR -= 0.8 * e; } },
  stretch: { dur: 2.8, base: 'stand', fn(p, k, t, o) {
    const e = plat(k, 0.25), y = Math.sin(Math.PI * sstep(0.2, 0.8, k));
    p.bP -= 0.28 * e; p.spP -= 0.2 * e; p.shL = mix(p.shL, 1.75, e); p.shR = mix(p.shR, 1.75, e); p.elL = mix(p.elL, 0.1, e); p.elR = mix(p.elR, 0.1, e);
    p.hpL = mix(p.hpL, -0.15, e); p.hpR = mix(p.hpR, -0.15, e); p.knL = mix(p.knL, -0.1, e); p.knR = mix(p.knR, -0.1, e);
    p.nkP += 0.3 * e; p.hdP += 0.2 * e; p.tlP += 0.4 * e; p.eye = Math.min(p.eye, 1 - 0.85 * e); p.mouth = Math.max(p.mouth, y); p.tongue = Math.max(p.tongue, 0.3 * y);
  } },
  scratch: { dur: 2.4, base: 'sit', fn(p, k, t, o) {
    const e = plat(k, 0.2), s = o.actSide, kick = 0.45 * Math.sin(t * 28) * e;
    if (s < 0) { p.hpL = mix(p.hpL, 2.3, e); p.knL = mix(p.knL, -1.5, e) + kick; } else { p.hpR = mix(p.hpR, 2.3, e); p.knR = mix(p.knR, -1.5, e) + kick; }
    p.nkY -= 0.5 * s * e; p.hdR += 0.45 * s * e; p.hdP += 0.2 * e; p.eye = Math.min(p.eye, 1 - 0.7 * e);
  } },
  chase: { dur: 3.2, base: 'stand', fn(p, k, t, o) { const e = plat(k, 0.15), s = o.actSide; p.spY += 0.75 * e * s; p.nkY += 0.6 * e * s; p.hdY += 0.3 * e * s; p.tlY -= 0.7 * e * s; o.spinV = 5.5 * e * s; } },
  hop: { dur: 2.6, base: 'stand', fn(p, k, t, o) { const e = plat(k, 0.1), h = Math.abs(Math.sin(t * 8)); o.hopY = h * 0.45 * e; p.shL += (0.6 * h - 0.2) * e; p.shR += (0.6 * h - 0.2) * e; p.hpL += (0.2 - 0.6 * h) * e; p.hpR += (0.2 - 0.6 * h) * e; p.spP += 0.15 * Math.sin(t * 16) * e; p.tlP += 0.3 * h * e; } },
  clap: { dur: 2.8, base: 'stand2', fn(p, k, t, o) { const e = plat(k, 0.2), c = Math.sin(t * 15); p.shS = mix(p.shS, -0.32 - 0.12 * c, e); p.elL += 0.25 * c * e; p.elR += 0.25 * c * e; p.mouth = Math.max(p.mouth, 0.35 * Math.max(0, Math.sin(t * 7)) * e); } },
  wave: { dur: 2.6, base: 'sit', fn(p, k, t, o) { const e = plat(k, 0.2); p.shR = mix(p.shR, 2.3, e); p.elR = mix(p.elR, -0.3, e) + 0.55 * Math.sin(t * 11) * e; p.hdR += 0.2 * e; } },
  pray: { dur: 3.0, base: 'stand2', fn(p, k, t, o) { const e = plat(k, 0.2); p.shL = mix(p.shL, 1.15, e); p.shR = mix(p.shR, 1.15, e); p.elL = mix(p.elL, -1.55, e); p.elR = mix(p.elR, -1.55, e); p.shS = mix(p.shS, -0.45, e); p.hdR += 0.25 * e * o.actSide; p.hdP -= 0.1 * e; } },
  sniff: { dur: 2.6, base: 'stand', fn(p, k, t, o) { const e = plat(k, 0.2); p.nkP -= 0.55 * e; p.hdP -= 0.35 * e; p.hdY += 0.25 * Math.sin(t * 2.5) * e; o.sniffBoost = e; } },
  dig: { dur: 4.2, base: 'stand', fn(p, k, t, o) { const e = plat(k, 0.15); p.nkP -= 0.5 * e; p.hdP -= 0.4 * e; p.bP -= 0.15 * e; p.shL += (0.25 + 0.55 * Math.sin(t * 15)) * e; p.shR += (0.25 + 0.55 * Math.sin(t * 15 + Math.PI)) * e; p.elL += 0.3 * Math.max(0, Math.sin(t * 15)) * e; p.elR += 0.3 * Math.max(0, Math.sin(t * 15 + Math.PI)) * e; p.tlY += 0.2 * Math.sin(t * 5) * e; o.sniffBoost = e * 0.7; } },
  kick: { dur: 2.6, base: 'back', fn(p, k, t, o) { const e = plat(k, 0.15); p.hpL += 0.6 * Math.sin(t * 13) * e; p.hpR += 0.6 * Math.sin(t * 13 + Math.PI) * e; p.shL += 0.4 * Math.sin(t * 11 + 1) * e; p.shR += 0.4 * Math.sin(t * 11) * e; p.bR += 0.12 * Math.sin(t * 6) * e; } },
};

// イラスト風の目：こげ茶の瞳・黒いひとみ・左上の大きな光と右下の小さな光
const _eyeTex = {}; let _eyeGeo = null;
function eyeTexture(iris = '#4a2e1f', kind = 'normal') {
  const key = iris + kind;
  if (_eyeTex[key]) return _eyeTex[key];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const ir = new THREE.Color(iris), dk = '#' + ir.clone().multiplyScalar(0.55).getHexString(), lt = ir.clone().lerp(new THREE.Color('#c08a5e'), 0.45);
  const gr = g.createRadialGradient(128, 140, 10, 128, 128, 128);
  gr.addColorStop(0, '#0b0605'); gr.addColorStop(0.42, '#120a07'); gr.addColorStop(0.62, iris); gr.addColorStop(0.86, dk); gr.addColorStop(1, '#0d0806');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const lo = g.createLinearGradient(0, 130, 0, 250); lo.addColorStop(0, 'rgba(120,80,55,0)'); lo.addColorStop(1, `rgba(${lt.r * 255 | 0},${lt.g * 255 | 0},${lt.b * 255 | 0},.55)`);
  g.fillStyle = lo; g.beginPath(); g.arc(128, 128, 118, 0.15, Math.PI - 0.15); g.fill();
  const heart = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + r * 0.9); g.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.7, y - r * 1.25, x, y - r * 0.45); g.bezierCurveTo(x + r * 0.7, y - r * 1.25, x + r * 1.6, y - r * 0.1, x, y + r * 0.9); g.fill(); };
  const star = (x, y, r) => { g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.32 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
  if (kind === 'heart') {
    heart(128, 138, 62, '#ff6f9a'); heart(128, 138, 40, '#ff9bbb');
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(100, 92, 20, 16, -0.4, 0, 7); g.fill();
  } else if (kind === 'star') {
    star(98, 88, 46); star(168, 170, 22); star(150, 66, 12);
  } else {
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(92, 82, 34, 30, -0.4, 0, 7); g.fill();
    g.beginPath(); g.arc(165, 172, 13, 0, 7); g.fill();
    g.globalAlpha = 0.7; g.beginPath(); g.arc(140, 70, 7, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (_eyeTex[key] = t);
}
function eyeGeo() {
  if (_eyeGeo) return _eyeGeo;
  const g = new THREE.SphereGeometry(1, 32, 20), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, p.getY(i) * 0.5 + 0.5);
  return (_eyeGeo = g);
}

export class Otter {
  constructor(traits) {
    this.tr = traits;
    this.root = new THREE.Group();
    this.mat = makeFurMaterial();
    this.cur = { ...POSES.curl };
    this.want = 'curl';
    this.gait = null; this.gaitAmt = 0; this.phase = 0; this.speed = 0;
    this.look = null; this.lookAmt = 0;
    this.mouthMode = null; this.mt = 0;
    this.blinkT = 2; this.blink = 1;
    this.sniffT = 1; this.sniff = 0;
    this.earT = 3; this.earTw = 0;
    this.happy = 0; this.wet = 0; this.time = 0;
    this.groundY = null; this.surface = 0; this.floatY = null;
    this.eyesOpen = 0; this.extra = {};
    this.act = null; this.actSide = 1; this.hopY = 0; this.spinV = 0; this.sniffBoost = 0;
    this.face = 'normal'; this.smile = false; this.over = null; this.groundSlope = 0;
    this.S = null; this.lastD = -99;
    this.setAge(0);
  }

  // 日齢が変わったら形を作り直す（変化が小さい時はそのまま）
  setAge(d, force) {
    this.age = d;
    const ns = shapeAt(d, this.tr);
    if (force || !this.S || Math.abs(ns.g - this.S.g) > 0.008 || Math.abs(ns.nb - this.S.nb) > 0.04 || Math.abs(ns.tuft - this.S.tuft) > 0.05) this.build(ns);
    const S = this.S;
    const front = S.gap / 2 + S.chest.rz * 0.55 + S.neckLen + S.head.rz * 1.55 + S.muz.len * 0.55;
    const back = S.gap / 2 + S.hips.rz * 0.72 + S.tail;
    this.unitLen = front + back;
    this.frontLen = front; this.backLen = back;   // 体の前の端・うしろの端（しっぽの先）までの長さ（頭の半径=1の単位）
    this.scale = lengthAt(d) / 100 / this.unitLen;
    this.root.scale.setScalar(this.scale);
    this.colors(d);
  }

  colors(d) {
    const S = this.S, tr = this.tr, u = this.mat.uniforms;
    const co = tr.coat || COATS[0];
    const baby = new THREE.Color(co.main), adult = new THREE.Color(co.adult), born = new THREE.Color('#948a84');
    const c = baby.clone().lerp(adult, sstep(60, 300, d)).lerp(born, S.nb * 0.8);
    c.offsetHSL(tr.warm * 0.012, tr.warm * 0.05, tr.tone * 0.04);
    u.uColA.value.copy(c);
    const cr = new THREE.Color(co.cream).lerp(new THREE.Color(co.cream).multiplyScalar(0.93), sstep(60, 300, d));
    u.uColB.value.copy(cr);
    u.uColD.value.set('#3a2a22').lerp(c, 0.25);
    u.uLen.value = S.fur;
    u.uDensity.value = mix(96, 108, S.g);
  }

  clear() {
    for (const c of [...this.root.children]) {
      this.root.remove(c);
      c.traverse(o => { if (o.geometry) { o.userData.base?.dispose(); o.geometry.dispose(); } });
    }
  }

  build(S) {
    this.S = S;
    this.clear();
    const m = this.mat, tr = this.tr;
    const J = this.j = { sh: [], el: [], hip: [], kn: [], tail: [], eyes: [], ears: [], mk: [] };
    const add = (parent, geo, x = 0, y = 0, z = 0) => { const me = furMesh(geo, m); me.position.set(x, y, z); parent.add(me); return me; };
    const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
    const mark = (parent, x, y, z) => { const o = grp(parent, x, y, z); J.mk.push(o); return o; };
    const lo = { ws: 18, hs: 12 }, tiny = { ws: 12, hs: 8 };
    const padMat = new THREE.MeshStandardMaterial({ color: '#e9a3a5', roughness: 0.55 });
    const C = S.chest, Hp = S.hips, Hd = S.head;
    const creamBelly = (ry, amt) => v => [amt * sstep(-0.3, -0.8, v.y / ry), 1];

    // 胴体
    J.body = grp(this.root);
    J.hips = grp(J.body, 0, 0, -S.gap / 2);
    J.chest = grp(J.body);
    mark(J.hips, 0, -Hp.ry, 0); mark(J.hips, 0, Hp.ry, 0); mark(J.hips, Hp.rx, 0, 0); mark(J.hips, -Hp.rx, 0, 0);
    mark(J.chest, 0, -C.ry, S.gap / 2); mark(J.chest, 0, C.ry, S.gap / 2); mark(J.chest, C.rx, 0, S.gap / 2); mark(J.chest, -C.rx, 0, S.gap / 2);
    mark(J.body, 0, -C.ry * 0.95, 0);

    // 首と頭
    J.neck = grp(J.chest, 0, C.ry * 0.22, S.gap / 2 + C.rz * 0.55);
    J.head = grp(J.neck, 0, 0.12, S.neckLen);
    const hc = new THREE.Vector3(0, 0.05, Hd.rz * 0.72);
    J.hc = hc;
    // 頭は1つのなめらかな形。ほっぺと口元（ヒゲの生えるふくらみ）は頭そのものをふくらませて作る
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
    const bump = (u, d, w) => Math.exp(-u.distanceToSquared(d) / w);
    const chkL = V3(0.64, -0.4, 0.66), chkR = V3(-0.64, -0.4, 0.66);
    const padL = V3(0.2, -0.4, 0.9), padR = V3(-0.2, -0.4, 0.9), muzC = V3(0, -0.3, 0.95);
    const eyeL = V3(0.42, 0.0, 0.9), eyeR = V3(-0.42, 0.0, 0.9);
    const blL = V3(0.66, -0.3, 0.68), blR = V3(-0.66, -0.3, 0.68);
    const browL = V3(0.33, 0.36, 0.88), browR = V3(-0.33, 0.36, 0.88);
    const ml = mix(1, 1.25, S.g);
    const headShape = u0 => {
      const u = u0.clone().normalize();
      let r = 1 + 0.15 * (bump(u, chkL, 0.09) + bump(u, chkR, 0.09))
        + 0.13 * ml * (bump(u, padL, 0.035) + bump(u, padR, 0.035)) + 0.12 * ml * bump(u, muzC, 0.05)
        - 0.05 * (bump(u, eyeL, 0.03) + bump(u, eyeR, 0.03));
      const v = new THREE.Vector3(u.x * Hd.rx, u.y * Hd.ry, u.z * Hd.rz).multiplyScalar(r);
      if (u.y > 0.45) v.y *= 1 - (u.y - 0.45) * 0.14;   // 頭のてっぺんは少し平ら
      if (u.y < 0) v.x *= 1 + (-u.y) * 0.08;            // 下ぶくれ
      return v;
    };
    const onHead = (x, y, z, k = 1) => headShape(V3(x, y, z)).multiplyScalar(k).add(hc);
    add(J.head, blob(1, 1, 1, {
      ws: 56, hs: 44,
      deform: (v, u) => v.copy(headShape(u)),
      paint: v => {
        const n = V3(v.x / Hd.rx, v.y / Hd.ry, v.z / Hd.rz);
        const up = { big: 0.13, small: -0.13, bib: 0.03 }[tr.face] || 0;
        let c = sstep(0.0, 0.16, -n.y + n.z * 0.25 - 0.27 + up) * tr.cream;
        if (tr.face === 'small') c *= sstep(0.55, 0.8, n.z);
        if (tr.face === 'brow') c = Math.max(c, 0.65 * sstep(0.984, 0.996, Math.max(n.dot(browL), n.dot(browR))));
        if (tr.face === 'bridge') c = Math.max(c, 0.8 * sstep(0.16, 0.06, Math.abs(n.x)) * sstep(0.55, 0.8, n.z) * sstep(0.5, 0.2, n.y));
        const ne = Math.max(n.dot(eyeL), n.dot(eyeR));
        const bl = 0.8 * sstep(0.93, 0.985, Math.max(n.dot(blL), n.dot(blR)));
        return [Math.min(1, c), (0.45 + 0.55 * sstep(0.7, -0.2, n.z)) * (0.25 + 0.75 * sstep(0.975, 0.9, ne)), bl];
      },
    }), hc.x, hc.y, hc.z);
    mark(J.head, 0, hc.y + Hd.ry, hc.z); mark(J.head, Hd.rx, hc.y, hc.z); mark(J.head, -Hd.rx, hc.y, hc.z);
    const mz = onHead(0, -0.4, 0.9, 0.85);
    const noseP = onHead(0, -0.13, 1, 1.0);
    noseP.z += 0.01;
    J.noseP = noseP;
    // あご（口をあける時だけ前に出る）
    J.jaw = grp(J.head, 0, mz.y - 0.12, mz.z - 0.18);
    mark(J.jaw, 0, -0.12, 0.12);
    // 鼻（こげ茶のおにぎり形・つやつや）
    const ng = new THREE.SphereGeometry(1, 24, 16);
    { const p = ng.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i); if (y < 0) x *= 1 + y * 0.5; p.setX(i, x); } ng.computeVertexNormals(); }
    J.nose = new THREE.Mesh(ng, new THREE.MeshPhysicalMaterial({ color: tr.nose || '#5a3a35', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }));
    const ns = mix(0.8, 0.78, S.g);
    J.nose.scale.set(0.15 * ns, 0.095 * ns, 0.09 * ns); J.nose.position.copy(noseP); J.nose.rotation.x = -0.15; J.head.add(J.nose);
    J.noseBase = J.nose.scale.clone();
    // 口の線（ω）は鼻の下、ふくらみの間
    const lipP = onHead(0, -0.36, 0.93, 1.0);
    const lip = new THREE.CatmullRomCurve3([[-0.12, -0.0], [-0.065, -0.05], [0, -0.012], [0, lipP.y < noseP.y ? (noseP.y - lipP.y) - 0.05 : 0.03], [0, -0.012], [0.065, -0.05], [0.12, 0.0]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
    const lipM = new THREE.Mesh(new THREE.TubeGeometry(lip, 40, 0.012, 5), new THREE.MeshBasicMaterial({ color: '#4a302b' }));
    lipM.position.copy(lipP); lipM.position.z += 0.012; lipM.rotation.x = -0.3; J.head.add(lipM);
    J.lip = lipM;
    const fr = new THREE.CatmullRomCurve3([[-0.075, -0.035], [-0.03, -0.005], [0, 0.002], [0.03, -0.005], [0.075, -0.035]].map(([x, y]) => new THREE.Vector3(x, y, 0)));
    J.frown = new THREE.Mesh(new THREE.TubeGeometry(fr, 20, 0.012, 5), lipM.material); J.frown.position.copy(lipP); J.frown.position.y -= 0.02; J.frown.position.z += 0.014; J.frown.rotation.x = -0.3; J.head.add(J.frown);
    // 開いた口：顔の表面に開く穴（中に舌）。イラストの「o」の口のように、鼻の下から下へ開く
    const mN = onHead(0, -0.37, 0.93, 1.0).sub(onHead(0, -0.37, 0.93, 0.9)).normalize();
    J.mouthG = grp(J.head, lipP.x, lipP.y + 0.03, lipP.z + 0.004);
    J.mouthG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mN);
    const hole = J.hole = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), new THREE.MeshStandardMaterial({ color: '#5e2329', roughness: 0.7 }));
    J.mouthG.add(hole);
    const tMat = new THREE.MeshStandardMaterial({ color: '#ec8f9a', roughness: 0.45 });
    J.tongueIn = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), tMat); J.mouthG.add(J.tongueIn);
    J.tongueOut = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), tMat); J.mouthG.add(J.tongueOut);
    const rimMat = new THREE.MeshBasicMaterial({ color: '#4a302b' });
    J.rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 32), rimMat); J.mouthG.add(J.rim);
    // 目（イラストのような茶色い瞳＋大きな光）。閉じた時は「‿」の線
    const eyeMat = new THREE.MeshPhysicalMaterial({ map: eyeTexture(tr.iris), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
    const lidMat = new THREE.MeshBasicMaterial({ color: '#3e2a24' });
    for (const s of [-1, 1]) {
      const dir = new THREE.Vector3(s * 0.42, 0.0, 0.9).normalize();
      const pos = onHead(dir.x, dir.y, dir.z, 0.97);
      const eg = grp(J.head, pos.x, pos.y, pos.z);
      eg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().lerp(new THREE.Vector3(0, 0, 1), 0.5).normalize());
      const open = grp(eg);
      const mat = eyeMat.clone(); mat.userData.iris = tr.iris;
      const ball = new THREE.Mesh(eyeGeo(), mat);
      ball.scale.set(S.eyeR, S.eyeR * 1.15, S.eyeR * 0.55); open.add(ball);
      const arc = new THREE.CatmullRomCurve3([-1, -0.5, 0, 0.5, 1].map(x => new THREE.Vector3(x * S.eyeR * 0.9, -(1 - x * x) * S.eyeR * 0.45, S.eyeR * 0.45)));
      const shut = new THREE.Mesh(new THREE.TubeGeometry(arc, 16, S.eyeR * 0.09, 5), lidMat);
      eg.add(shut);
      // にっこり目「∩」
      const harc = new THREE.CatmullRomCurve3([-1, -0.5, 0, 0.5, 1].map(x => new THREE.Vector3(x * S.eyeR * 0.85, (1 - x * x) * S.eyeR * 0.5 - S.eyeR * 0.2, S.eyeR * 0.45)));
      const happy = new THREE.Mesh(new THREE.TubeGeometry(harc, 16, S.eyeR * 0.1, 5), lidMat); eg.add(happy);
      // 半目のまぶたの線
      const larc = new THREE.CatmullRomCurve3([-1, -0.5, 0, 0.5, 1].map(x => new THREE.Vector3(x * S.eyeR * 1.0, (1 - x * x) * S.eyeR * 0.1 + S.eyeR * 0.2, S.eyeR * 0.5)));
      const lid = new THREE.Mesh(new THREE.TubeGeometry(larc, 16, S.eyeR * 0.08, 5), lidMat); eg.add(lid);
      // 大笑いの「> <」（見る人から見て左の目が >）
      const sx = -s;
      const xp = [[-0.7, 0.55], [0.5, 0], [-0.7, -0.55]].map(([x, y]) => new THREE.Vector3(x * sx * S.eyeR, y * S.eyeR, S.eyeR * 0.45));
      const laugh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(xp, false, 'catmullrom', 0.1), 16, S.eyeR * 0.1, 5), lidMat); eg.add(laugh);
      // まゆ毛（しょんぼり・ぷくーの時だけ）
      const brow = grp(eg, 0, S.eyeR * 1.45, S.eyeR * 0.2);
      const barc = new THREE.CatmullRomCurve3([-1, 0, 1].map(x => new THREE.Vector3(x * S.eyeR * 0.6, (1 - x * x) * S.eyeR * 0.12, 0)));
      brow.add(new THREE.Mesh(new THREE.TubeGeometry(barc, 8, S.eyeR * 0.09, 5), lidMat));
      J.eyes.push({ open, shut, happy, lid, laugh, brow, mat, s });
    }
    // 肉球（ピンク）は足の部品のところで付ける
    // 耳（小さくて丸い）
    for (const s of [-1, 1]) {
      const dir = new THREE.Vector3(s * 0.9, 0.28, -0.12).normalize();   // 耳は小さく、顔の横の低い所
      const pos = onHead(dir.x, dir.y, dir.z, 0.95);
      const eg = grp(J.head, pos.x, pos.y, pos.z);
      eg.lookAt(pos.clone().add(new THREE.Vector3(s * 0.8, 0.25, 0.55)));
      add(eg, blob(S.earR, S.earR * 0.85, S.earR * 0.42, { ...tiny, paint: v => [v.z > 0 ? -0.5 : 0.1, 0.45] }));
      J.ears.push(eg);
    }
    // アホ毛
    J.tuft = grp(J.head, 0, hc.y + Hd.ry * 0.93, hc.z - Hd.rz * 0.05);
    if (S.tuft > 0.05) {
      const tm = new THREE.MeshStandardMaterial({ color: m.uniforms.uColA.value.clone().multiplyScalar(0.9), roughness: 0.9 });
      const style = tr.tuftStyle || 'tuft', n = style === 'one' ? 2 : style === 'curl' ? 4 : 7;
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n - 1) - 0.5) * (style === 'one' ? 0.5 : 1.2), h = (style === 'one' ? 0.42 : 0.28 + 0.12 * Math.sin(i * 2.3)) * S.tuft;
        const pts = [];
        for (let k = 0; k <= 8; k++) {
          const t = k / 8;
          if (style === 'curl') { const ang = t * 4.2; pts.push(new THREE.Vector3(a * 0.08 + Math.sin(ang) * 0.05 * t, h * Math.min(1, t * 1.6) * 0.8, -0.02 + (1 - Math.cos(ang)) * 0.06 * t)); }
          else pts.push(new THREE.Vector3(Math.sin(a) * 0.06 * t + a * 0.03, h * t, -0.02 + Math.sin(t * 2.6) * h * (style === 'one' ? 0.55 : 0.35) + a * 0.02));
        }
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.016, 4), tm);
        J.tuft.add(tube);
      }
    }
    // 花かんむり（図鑑コンプリートのごほうび）
    J.crown = grp(J.head, 0, 0, 0);
    {
      const cols = ['#ffb3c7', '#fff6f8', '#ffd86b', '#ffc6dc', '#ffffff', '#ff9fb8'];
      const leaf = new THREE.MeshStandardMaterial({ color: '#7cb86a', roughness: 0.8 });
      const yc = hc.y + Hd.ry * 0.8, ring = 0.64;
      for (let i = 0; i < 11; i++) {
        const a = i / 11 * Math.PI * 2 + 0.3;
        const n = new THREE.Vector3(Math.cos(a) * 0.68, 0.72, Math.sin(a) * 0.68).normalize();
        const p = new THREE.Vector3(n.x * Hd.rx * ring / 0.68 * 0.68, yc - hc.y, n.z * Hd.rz * ring);
        p.set(Math.cos(a) * Hd.rx * ring, yc + Math.sin(a * 2) * 0.01, hc.z + Math.sin(a) * Hd.rz * ring * 0.95);
        const fl = new THREE.Group(); fl.position.copy(p); J.crown.add(fl);
        fl.lookAt(p.clone().add(new THREE.Vector3(Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6)));
        const pm = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.6 });
        for (let k = 0; k < 5; k++) {
          const b = k / 5 * Math.PI * 2, pe = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), pm);
          pe.scale.set(0.085, 0.06, 0.025); pe.position.set(Math.cos(b) * 0.085, Math.sin(b) * 0.085, 0.02); pe.rotation.z = b; fl.add(pe);
        }
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffcf4a', roughness: 0.5 })); c.position.z = 0.035; fl.add(c);
        const lf = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), leaf); lf.scale.set(0.075, 0.03, 0.018); lf.position.set(0.12, -0.05, 0); lf.rotation.z = -0.6; fl.add(lf);
      }
      J.crown.visible = !!this.crownOn;
    }
    // ヒゲ
    const wv = [];
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const y0 = mz.y + (i % 3 - 1) * 0.05 + 0.04, z0 = mz.z + 0.05 - Math.floor(i / 3) * 0.06;
      const x0 = s * 0.32;
      const a = (i % 3 - 1) * 0.16 + 0.02, len = 0.46 + (i % 3) * 0.06;
      let px = x0, py = y0, pz = z0;
      for (let k = 1; k <= 4; k++) {
        const t = k / 4;
        const nx = x0 + s * len * t * 0.95, ny = y0 + Math.sin(a) * len * t - 0.04 * t * t, nz = z0 + len * t * 0.3 - 0.12 * t * t;
        wv.push(px, py, pz, nx, ny, nz); px = nx; py = ny; pz = nz;
      }
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wv, 3));
    J.whisk = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#f6f1e8', transparent: true, opacity: 0.6 }));
    J.head.add(J.whisk);

    // 前足
    for (const [i, s] of [[0, -1], [1, 1]]) {
      const sh = grp(J.chest, s * C.rx * 0.55, -C.ry * 0.38, S.gap / 2 + C.rz * 0.32);
      add(sh, blob(S.armR, S.arm * 0.5 + S.armR * 0.6, S.armR * 1.15, { ...lo, paint: () => [-0.1, 0.8] }), 0, -S.arm * 0.48, 0);
      const el = grp(sh, 0, -S.arm, 0);
      add(el, blob(S.paw * 1.05, S.paw * 0.58, S.paw * 1.25, { ...lo, paint: () => [-0.55, 0.35] }), 0, -S.paw * 0.25, S.paw * 0.35);
      for (let k = 0; k < 4; k++) {
        const a = (k - 1.5) * 0.38;
        add(el, blob(S.paw * 0.27, S.paw * 0.25, S.paw * 0.32, { ...tiny, paint: () => [-0.8, 0.25] }), Math.sin(a) * S.paw * 0.85, -S.paw * 0.38, S.paw * 0.35 + Math.cos(a) * S.paw * 1.05);
      }
      const pad = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), padMat);
      pad.scale.set(S.paw * 0.55, S.paw * 0.12, S.paw * 0.5); pad.position.set(0, -S.paw * 0.78, S.paw * 0.45); el.add(pad);
      for (let k = 0; k < 4; k++) { const a = (k - 1.5) * 0.4; const tp = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), padMat); tp.scale.setScalar(S.paw * 0.13); tp.scale.y *= 0.5; tp.position.set(Math.sin(a) * S.paw * 0.8, -S.paw * 0.6, S.paw * 0.35 + Math.cos(a) * S.paw * 1.0); el.add(tp); }
      mark(el, 0, -S.paw * 0.75, S.paw * 0.5);
      J.sh[i] = sh; J.el[i] = el;
    }
    // 後ろ足（大きな水かき）
    for (const [i, s] of [[0, -1], [1, 1]]) {
      const hp = grp(J.hips, s * Hp.rx * 0.55, -Hp.ry * 0.22, Hp.rz * 0.05);
      add(hp, blob(S.thighR, S.thigh * 0.55 + 0.12, S.thighR * 1.25, { ...lo, paint: () => [0.05, 0.9] }), 0, -S.thigh * 0.42, 0.04);
      const kn = grp(hp, 0, -S.thigh, 0);
      add(kn, blob(S.foot * 0.42, 0.1, S.foot * 0.72, { ...lo, paint: () => [-0.55, 0.35] }), 0, -0.05, S.foot * 0.42);
      for (let k = 0; k < 4; k++) {
        const a = (k - 1.5) * 0.3;
        add(kn, blob(S.foot * 0.14, S.foot * 0.12, S.foot * 0.2, { ...tiny, paint: () => [-0.8, 0.25] }), Math.sin(a) * S.foot * 0.45, -0.07, S.foot * 0.95 + Math.cos(a) * 0.04);
      }
      const hpad = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), padMat);
      hpad.scale.set(S.foot * 0.25, 0.03, S.foot * 0.3); hpad.position.set(0, -0.135, S.foot * 0.4); kn.add(hpad);
      for (let k = 0; k < 4; k++) { const a = (k - 1.5) * 0.3; const tp = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), padMat); tp.scale.set(S.foot * 0.08, 0.025, S.foot * 0.08); tp.position.set(Math.sin(a) * S.foot * 0.45, -0.12, S.foot * 0.95 + Math.cos(a) * 0.04); kn.add(tp); }
      mark(kn, 0, -0.16, S.foot * 0.45);
      J.hip[i] = hp; J.kn[i] = kn;
    }
    // しっぽ（根元が太い）
    const nT = 5, seg = S.tail / nT;
    let parent = grp(J.hips, 0, Hp.ry * 0.05, -Hp.rz * 0.72);
    for (let k = 0; k < nT; k++) {
      const r0 = S.tailR * mix(1, 0.22, k / nT), r1 = S.tailR * mix(1, 0.22, (k + 1) / nT), r = r0;
      const g = k === 0 ? parent : grp(parent, 0, 0, -seg);
      mark(g, 0, -r * 0.8, -seg * 0.5);
      J.tail.push(g); parent = g;
    }
    this.buildSpine(S, seg, nT);
    // 計算用の目印
    J.mouthMk = grp(J.head, lipP.x, lipP.y - 0.04, lipP.z + 0.02);
    J.pawMk = grp(J.chest, 0, 0, 0);
    this.root.updateMatrixWorld(true);
  }

  // 体を地面（または水面）に合わせる高さ
  ground(dt) {
    const J = this.j;
    J.body.position.y = 0;
    this.root.updateMatrixWorld(true);
    let min = 1e9;
    // 坂の上では地面が傾いている：前ほど高い面に、どの足もつくように合わせる
    const tg = Math.tan(this.groundSlope || 0);
    for (const o of J.mk) {
      o.getWorldPosition(_v);
      this.root.worldToLocal(_v);
      const y = _v.y - _v.z * tg;
      if (y < min) min = y;
    }
    const pad = this.S.fur * 1.1 + 0.02;
    const tgt = -min + pad;
    if (this.groundY == null || dt <= 0) this.groundY = tgt;
    else this.groundY += (tgt - this.groundY) * Math.min(1, dt * (this.gaitAmt > 0.3 ? 2.5 : 8));
    J.body.position.y = this.groundY + (this.floatY ?? 0) + this.hopY + (this.floatY != null ? (this.wave?.bob || 0) : 0);
  }

  // dt秒すすめる
  update(dt) {
    this.time += dt;
    const S = this.S, cur = this.cur, tgt = POSES[this.want] || POSES.stand;
    const rate = this.want === 'curl' || this.want === 'back' ? 2.5 : 3.8;
    for (const k of KEYS) cur[k] += (tgt[k] - cur[k]) * Math.min(1, dt * rate);
    const p = { ...cur };
    const t = this.time;

    // 歩く・泳ぐ：足だけでなく背骨・腰・しっぽを波のようにしならせる（しっぽの先ほど遅れて動く）
    const W = this.wave = { hipY: 0, hipP: 0, tx: [0, 0, 0, 0, 0], ty: [0, 0, 0, 0, 0], bob: 0 };
    const gTarget = this.gait ? 1 : 0;
    this.gaitAmt += (gTarget - this.gaitAmt) * Math.min(1, dt * 6);
    if (this.gait) this.lastGait = this.gait;
    // 足の回転は「進む速さ ÷ 歩幅」で決める（足がすべらず、地面をちゃんとけって進む）
    const legM = (S.arm + S.paw) * this.scale, v = this.moveV || 0;
    if (this.gaitAmt > 0.01) {
      const ga = this.gaitAmt;
      if (this.lastGait === 'swim') {
        // 犬かき：頭を水から出し、前足を左右交互に前へかく。後ろ足もけり、しっぽは水面で左右にゆれる
        this.phase += dt * clamp(v / Math.max(0.01, legM * 1.2) * Math.PI * 2, 5, 14);
        const ph = this.phase;
        p.shL += 0.55 * Math.sin(ph) * ga; p.shR += 0.55 * Math.sin(ph + Math.PI) * ga;
        p.elL += -0.45 * Math.max(0, Math.cos(ph)) * ga; p.elR += -0.45 * Math.max(0, Math.cos(ph + Math.PI)) * ga;
        p.hpL += Math.sin(ph + 0.6) * 0.45 * ga; p.hpR += Math.sin(ph + 0.6 + Math.PI) * 0.45 * ga;
        p.knL += Math.sin(ph + 1.6) * 0.35 * ga; p.knR += Math.sin(ph + 1.6 + Math.PI) * 0.35 * ga;
        // かくたびに体が左右へ少しゆれ、その波がしっぽの先まで伝わる
        p.spY += 0.04 * ga * Math.sin(ph); W.hipY = -0.05 * ga * Math.sin(ph - 0.7);
        for (let k = 0; k < 5; k++) W.ty[k] = 0.13 * ga * Math.sin(ph - 1.3 - k * 0.7) * (0.7 + k * 0.15);
        p.spP += 0.06 * ga * Math.sin(ph * 2); W.hipP = -0.06 * ga * Math.sin(ph * 2 - 0.8);
        for (let k = 0; k < 5; k++) W.tx[k] = 0.08 * ga * Math.sin(ph * 2 - 1.5 - k * 0.8);
        p.bR += 0.03 * ga * Math.sin(ph);
        p.hdY -= 0.03 * ga * Math.sin(ph); p.hdR -= 0.02 * ga * Math.sin(ph);
        W.bob = 0.03 * ga * Math.sin(ph * 2);
      } else {
        const baby = 1 - sstep(60, 140, S.d);
        const run = sstep(0.75, 1.1, v / Math.max(0.05, this.unitLen * this.scale));   // 体長/秒が速い時だけぴょこぴょこ走り
        const A = mix(0.56, 0.55, run) * ga;
        const stride = 2 * legM * Math.sin(A) + 1e-3;
        this.phase += dt * clamp(v / stride * Math.PI * 2, 3, mix(19, 22, run));
        const ph = this.phase;
        // ふだんの歩き：対角の足を交互に（右前と左後ろ）。前へ出す足だけ曲げて持ち上げ、けり足はまっすぐ地面に
        const fL = Math.sin(ph), fR = Math.sin(ph + Math.PI);
        const liftL = Math.max(0, Math.cos(ph)), liftR = Math.max(0, Math.cos(ph + Math.PI));
        const bF = Math.sin(ph + 2.0), bH = Math.sin(ph);
        p.shL += A * mix(fL, bF, run); p.shR += A * mix(fR, bF, run);
        p.elL -= A * 0.9 * mix(liftL, Math.max(0, Math.cos(ph + 2)), run); p.elR -= A * 0.9 * mix(liftR, Math.max(0, Math.cos(ph + 2)), run);
        p.hpL += A * mix(fR, bH, run); p.hpR += A * mix(fL, bH, run);
        p.knL -= A * 0.8 * mix(liftR, Math.max(0, Math.cos(ph)), run); p.knR -= A * 0.8 * mix(liftL, Math.max(0, Math.cos(ph)), run);
        // 体重を左右に移す：胸と腰が反対にふれ、体が少しかたむく（赤ちゃんほど大きく）
        const sw = mix(1, 1.3, baby);
        p.spY += 0.04 * sw * ga * Math.sin(ph) * (1 - run); W.hipY = -0.035 * sw * ga * Math.sin(ph - 0.5) * (1 - run);
        p.bR += 0.018 * sw * ga * Math.sin(ph) * (1 - run);
        p.spP += 0.03 * ga * Math.sin(ph * 2) * (1 - run);
        p.nkP += 0.035 * ga * Math.sin(ph * 2 + 0.6) * (1 - run);
        // 走る時だけ：背中を丸めて伸ばす（ぴょこぴょこ）
        p.spP += 0.22 * ga * Math.sin(ph + 1) * run; W.hipP = 0.14 * ga * Math.sin(ph + 2.4) * run;
        // しっぽは低く地面近くで、根元から先へ遅れて左右にゆれる
        p.tlP -= 0.12 * ga;
        for (let k = 0; k < 5; k++) {
          W.ty[k] = 0.1 * ga * Math.sin(ph - 0.9 - k * 0.65) * (0.7 + k * 0.12);
          W.tx[k] = 0.06 * ga * Math.sin(ph * 2 - 1.2 - k * 0.7) + 0.1 * run * ga * Math.sin(ph - 1.2 - k * 0.7);
        }
      }
    }
    // 頭はぶれにくく（体がゆれても目線を保つ）
    p.nkY -= p.spY * 0.35; p.hdY -= p.spY * 0.3; p.hdR -= (p.bR - (this.cur.bR || 0)) * 0.5;
    // 向きを変えた時、頭は先に、しっぽはあとから遅れて付いてくる（ばねのような遅れ）
    const yawNow = this.root.rotation.y;
    let yv = this.prevYaw == null ? 0 : yawNow - this.prevYaw; yv = Math.atan2(Math.sin(yv), Math.cos(yv)) / Math.max(dt, 1e-3);
    this.prevYaw = yawNow;
    this.tailLag = mix(this.tailLag || 0, clamp(-yv * 0.06, -0.25, 0.25), Math.min(1, dt * 3));
    this.headLead = mix(this.headLead || 0, clamp(yv * 0.08, -0.3, 0.3), Math.min(1, dt * 6));
    for (let k = 0; k < 5; k++) W.ty[k] += this.tailLag * (0.3 + k * 0.18);
    p.nkY += this.headLead;

    // 曲がる時は体をその向きにしならせ、しっぽはあとから付いてくる
    const tn = clamp(this.turn || 0, -2.5, 2.5);
    this.turnS = mix(this.turnS || 0, tn, Math.min(1, dt * 4));
    const ts = this.turnS;
    p.nkY += ts * 0.1; p.hdY += ts * 0.06;
    // 道なりのしなり：頭（胸）の向きと、腰がたどってきた向きの差だけ体をカーブさせる。しっぽはさらに先まで曲がる
    const bd = this.bend || 0;
    p.spY += bd * 0.3; W.hipY -= bd * 0.7;
    for (let k = 0; k < 5; k++) W.ty[k] -= bd * 0.16 * (k + 1) / 2.5;

    // しぐさ
    this.hopY = 0; this.spinV = 0; this.sniffBoost = 0;
    if (this.act) {
      const A = ACTS[this.act.id];
      this.act.t += dt;
      const k = this.act.t / A.dur;
      if (k >= 1) this.act = null; else A.fn(p, k, this.act.t, this);
    }

    // 外から足す動き（main がごはんの時などに入れる）
    if (this.over) for (const k in this.over) p[k] += this.over[k];
    // キョロキョロ：起きている時は、ときどき頭をすばやく小さく動かす
    if (p.eye > 0.5 && !this.look && this.lastGait !== 'swim') {
      this.sacT = (this.sacT ?? 1) - dt;
      if (this.sacT < 0) { this.sacT = 1.2 + Math.random() * 2.2; this.sacY = (Math.random() - 0.5) * 0.4; this.sacP = (Math.random() - 0.4) * 0.18; }
      this.sy = mix(this.sy || 0, this.sacY || 0, Math.min(1, dt * 12)); this.sp = mix(this.sp || 0, this.sacP || 0, Math.min(1, dt * 12));
    } else { this.sy = mix(this.sy || 0, 0, Math.min(1, dt * 6)); this.sp = mix(this.sp || 0, 0, Math.min(1, dt * 6)); }
    p.nkY += this.sy * 0.45; p.hdY += this.sy * 0.4; p.hdP += this.sp;

    // まばたき・鼻ヒクヒク・耳ぴくっ
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blinkT = 2 + Math.random() * 4; this.blinkS = t; }
    const bt = t - (this.blinkS ?? -9);
    this.blink = bt < 0.16 ? 1 - Math.sin(bt / 0.16 * Math.PI) * 0.92 : 1;
    this.sniffT -= dt;
    if (this.sniffT < 0) { this.sniffT = 1.5 + Math.random() * 3; this.sniffS = t; this.sniffN = 2 + Math.floor(Math.random() * 3); }
    const st = t - (this.sniffS ?? -9);
    this.sniff = st < this.sniffN * 0.16 ? Math.max(0, Math.sin(st / 0.16 * Math.PI)) : 0;
    if (this.sniffBoost > 0.3) this.sniff = Math.abs(Math.sin(t * 22)) * this.sniffBoost;
    this.earT -= dt;
    if (this.earT < 0) { this.earT = 3 + Math.random() * 6; this.earS = t; this.earSide = Math.random() < 0.5 ? 0 : 1; }
    this.earTw = Math.max(0, Math.sin(Math.min(1, (t - (this.earS ?? -9)) / 0.25) * Math.PI));

    // 口：もぐもぐ・かみかみ・ぺろっ
    let mouth = p.mouth, tongue = p.tongue;
    if (this.mouthMode === 'chew') mouth = Math.max(mouth, 0.25 + 0.25 * Math.sin(t * 11));
    else if (this.mouthMode === 'bite') mouth = Math.max(mouth, 0.55 + 0.25 * Math.sin(t * 6));
    else if (this.mouthMode === 'suck') mouth = Math.max(mouth, 0.2 + 0.08 * Math.sin(t * 9));
    else if (this.mouthMode === 'bero') { mouth = Math.max(mouth, 0.3); tongue = 1; }
    else if (this.mouthMode === 'yawn') { const y = Math.sin(Math.min(1, this.mt / 1.6) * Math.PI); mouth = Math.max(mouth, y * 1.2); tongue = y * 0.4; }
    else if (this.mouthMode === 'chirp') mouth = Math.max(mouth, Math.max(0, Math.sin(t * 16)) * 0.5);
    else if (this.mouthMode === 'beg') mouth = Math.max(mouth, 0.75 + 0.35 * Math.sin(t * 9));
    this.mt += dt;

    // 呼吸
    const breath = Math.sin(t * (this.want === 'curl' || p.eye < 0.2 ? 2.2 : 3.4));

    // 見る
    const lw = this.look ? 1 : 0;
    this.lookAmt += (lw - this.lookAmt) * Math.min(1, dt * 3);
    if (this.lookAmt > 0.01 && this.look) {
      this.root.updateMatrixWorld(true);
      const J = this.j;
      J.neck.getWorldPosition(_v);
      const loc = this.root.worldToLocal(this.look.clone());
      const nl = this.root.worldToLocal(_v.clone());
      const dx = loc.x - nl.x, dy = loc.y - nl.y, dz = loc.z - nl.z;
      const roll = Math.abs(p.bR) > 1.2;
      if (!roll) {
        const yaw = clamp(Math.atan2(dx, dz), -1.1, 1.1);
        const pit = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.5, 0.7);
        const A = this.lookAmt;
        this.lyaw = mix(this.lyaw ?? 0, yaw, Math.min(1, dt * 5));
        this.lpit = mix(this.lpit ?? 0, pit, Math.min(1, dt * 5));
        p.nkY += this.lyaw * 0.5 * A; p.hdY += this.lyaw * 0.5 * A;
        p.hdP += (this.lpit - (p.bP + p.nkP + p.hdP) * 0.6) * 0.6 * A;
        p.hdR += -this.lyaw * 0.12 * A;
      }
    }
    p.hdR += Math.sin(t * 0.7) * 0.02;
    p.tlY += Math.sin(t * 0.9) * 0.03;

    this.apply(p, mouth, tongue, breath);
    this.ground(dt);
  }

  apply(p, mouth, tongue, breath) {
    const J = this.j, S = this.S;
    J.body.rotation.set(-p.bP, p.bY, p.bR, 'YXZ');
    J.chest.rotation.set(-p.spP, p.spY, 0, 'YXZ');
    J.neck.rotation.set(-p.nkP, p.nkY, 0, 'YXZ');
    J.head.rotation.set(-p.hdP, p.hdY, p.hdR, 'YXZ');
    J.sh[0].rotation.set(-p.shL, 0, -p.shS, 'XYZ'); J.sh[1].rotation.set(-p.shR, 0, p.shS, 'XYZ');
    J.el[0].rotation.x = -p.elL; J.el[1].rotation.x = -p.elR;
    J.hip[0].rotation.set(-p.hpL, 0, -p.hpS, 'XYZ'); J.hip[1].rotation.set(-p.hpR, 0, p.hpS, 'XYZ');
    J.kn[0].rotation.x = -p.knL - p.hpL * 0.35; J.kn[1].rotation.x = -p.knR - p.hpR * 0.35;
    const Wv = this.wave || { hipY: 0, hipP: 0, tx: [0, 0, 0, 0, 0], ty: [0, 0, 0, 0, 0] };
    J.hips.rotation.set(-Wv.hipP, Wv.hipY, 0, 'YXZ');
    J.tail[0].rotation.set(p.tlP + Wv.tx[0], p.tlY + Wv.ty[0], 0);
    for (let k = 1; k < J.tail.length; k++) J.tail[k].rotation.set(p.tlC + Wv.tx[k], p.tlY * 0.6 + Wv.ty[k], 0);
    // 表情：normal / happy（∩）/ wide（びっくり）/ half（ねむい）/ wink
    const face = this.face || 'normal';
    const open = clamp(p.eye, 0, 1) * this.blink;
    this.eyesOpen = open;
    // 目：normal / happy(∩) / laugh(><) / love(ハート) / sparkle(星) / wide / half / sad / pout / wink
    const closedFace = face === 'happy' || face === 'laugh';
    J.eyes.forEach((e, i) => {
      let m = open < 0.18 && !closedFace ? 'shut' : face;
      if (face === 'wink') m = open < 0.18 ? 'shut' : i === 0 ? 'happy' : 'normal';
      const ball = ['normal', 'wide', 'half', 'love', 'sparkle', 'sad', 'pout'].includes(m);
      e.open.visible = ball; e.shut.visible = m === 'shut'; e.happy.visible = m === 'happy';
      e.lid.visible = m === 'half' || m === 'sad'; e.laugh.visible = m === 'laugh';
      const kind = m === 'love' ? 'heart' : m === 'sparkle' ? 'star' : 'normal';
      const tex = eyeTexture(e.mat.userData.iris, kind);
      if (e.mat.map !== tex) { e.mat.map = tex; e.mat.needsUpdate = true; }
      const sc = m === 'wide' || m === 'sparkle' || m === 'love' ? 1.13 : 1;
      const half = m === 'half' || m === 'sad';
      e.open.scale.set(sc, (half ? 0.6 : Math.max(0.2, open)) * sc, 1);
      e.open.position.y = half ? -S.eyeR * 0.28 : 0;
      // まゆ毛：しょんぼりは内側が上がる、ぷくーは内側が下がる
      e.brow.visible = m === 'sad' || m === 'pout';
      e.brow.rotation.z = (m === 'sad' ? -0.45 : 0.4) * e.s;
    });
    const smile = this.smile || ['happy', 'laugh', 'love'].includes(face);
    J.frown.visible = false;
    if (face === 'sad') { J.lip.scale.set(1, 1, 1); J.frown.visible = true; }
    else if (face === 'pout') J.lip.scale.set(0.5, 0.7, 1);
    else J.lip.scale.set(smile ? 1.3 : 1, smile ? 1.35 : 1, 1);
    const bk = (this.tr.blush ?? 0.6) + (smile ? 0.45 : 0) + (face === 'love' || face === 'pout' ? 0.5 : 0);
    this.mat.uniforms.uBlushK.value += (bk - this.mat.uniforms.uBlushK.value) * 0.1;
    // 口：開くほど下へ広がる穴。閉じている時は ω の線
    if (this.face === 'laugh') mouth = Math.max(mouth, 0.55 + 0.1 * Math.sin(this.time * 14));
    if (this.face === 'wide' || this.face === 'sparkle') mouth = Math.max(mouth, 0.28);
    const op = clamp(mouth, 0, 1.2), show = op > 0.06 || tongue > 0.05;
    J.lip.visible = !show && !J.frown.visible; J.mouthG.visible = show;
    if (show) J.frown.visible = false;
    if (show) {
      const w = 0.075 + 0.035 * op, h = 0.02 + 0.075 * op, y = -0.012 - h * 0.8;
      J.hole.scale.set(w, h, 0.02); J.hole.position.set(0, y, 0);
      J.rim.scale.set(w, h, 0.3); J.rim.position.set(0, y, 0.004);
      J.tongueIn.scale.set(w * 0.7, Math.max(0.012, h * 0.45), 0.018); J.tongueIn.position.set(0, y - h * 0.45, 0.006);
      J.tongueOut.visible = tongue > 0.05;
      J.tongueOut.scale.set(0.055, 0.06 * tongue + 0.01, 0.022); J.tongueOut.position.set(0, y - h * 0.8 - 0.035 * tongue, 0.018); J.tongueOut.rotation.x = 0.35;
    }
    J.nose.scale.copy(J.noseBase).multiply(_v.set(1 + this.sniff * 0.08, 1 - this.sniff * 0.1, 1));
    J.nose.position.y = J.noseP.y + this.sniff * 0.015;
    J.whisk.rotation.set(-this.sniff * 0.08, 0, 0);
    J.ears.forEach((e, i) => { e.scale.setScalar(1 - (i === this.earSide ? this.earTw * 0.15 : 0) - p.ear * 0.2); });
    J.chest.scale.set(1 + breath * 0.012, 1 + breath * 0.018, 1);
    this.skin();
    J.tuft.rotation.set(Math.sin(this.time * 2.1) * 0.08 + this.gaitAmt * 0.2 * Math.sin(this.phase * 2), 0, Math.sin(this.time * 1.7) * 0.1);
    this.mat.uniforms.uWet.value = this.wet;
  }

  // しっぽの先〜おしり〜胸〜首を1本のなめらかな形で作る（段差が出ないように）
  buildSpine(S, seg, nT) {
    const J = this.j, tr = this.tr, C = S.chest, Hp = S.hips;
    const z0 = -S.gap / 2 - Hp.rz * 0.72, zT = z0 - S.tail;
    const zN = S.gap / 2 + C.rz * 0.55, ny = C.ry * 0.22, Hd = S.head;
    const Hc = new THREE.Vector3(0, ny + 0.17, zN + S.neckLen + Hd.rz * 0.72);   // 頭の中心
    const zE = Hc.z;
    // [z, 横の太さ, 縦の太さ, 中心の高さ]
    const P = [
      [zT, S.tailR * 0.2, S.tailR * 0.17, Hp.ry * 0.05],
      [z0 - S.tail * 0.5, S.tailR * 0.6, S.tailR * 0.52, Hp.ry * 0.05],
      [z0, S.tailR, S.tailR * 0.86, Hp.ry * 0.05],
      [z0 + Hp.rz * 0.42, Hp.rx * 0.8, Hp.ry * 0.84, Hp.ry * 0.02],
      [-S.gap / 2, Hp.rx, Hp.ry, 0],
      [S.gap / 2, C.rx, C.ry, 0],
      [zN, S.neckR * 1.0, S.neckR * 0.93, ny * 0.6],
      [zN + S.neckLen, S.neckR * 0.8, S.neckR * 0.74, ny + 0.1],
      [zE, 0.05, 0.05, Hc.y],
    ];
    const at = (z, c) => {
      let i = 0; while (i < P.length - 2 && z > P[i + 1][0]) i++;
      const a = P[i], b = P[i + 1], t = clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
      const pa = P[i - 1] || a, pb = P[i + 2] || b;
      const m0 = (b[c] - pa[c]) / Math.max(1e-4, b[0] - pa[0]) * (b[0] - a[0]);
      const m1 = (pb[c] - a[c]) / Math.max(1e-4, pb[0] - a[0]) * (b[0] - a[0]);
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * a[c] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * b[c] + (t3 - t2) * m1;
    };
    const N = 110, M = 36, pos = [], idx = [];
    const ring = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, z = zT + (zE - zT) * u;
      let rx = at(z, 1), ry = at(z, 2), yc = at(z, 3);
      const dz = (z - Hc.z) / Hd.rz;
      if (dz > -1) {
        const f = Math.sqrt(Math.max(0, 1 - dz * dz));
        const hx = Hd.rx * 0.985 * f, hy = Hd.ry * 0.93 * f, k = 0.3;
        const smax = (a, b) => { const h = clamp(0.5 + 0.5 * (a - b) / k, 0, 1); return b + (a - b) * h + k * h * (1 - h); };
        const w = clamp(hx / (hx + rx + 1e-4), 0, 1);
        rx = smax(rx, hx); ry = smax(ry, hy); yc = mix(yc, Hc.y, w * w * (3 - 2 * w));
      }
      ring.push(pos.length / 3);
      // お腹側は下へふくらむ（おしり〜お腹がぽっこりした洋なし形）
      const bulge = 1 + 0.16 * sstep(z0, -S.gap / 2, z) * sstep(S.gap / 2 + 0.1, -S.gap * 0.1, z);
      for (let j = 0; j < M; j++) { const a = j / M * Math.PI * 2, sa = Math.sin(a); pos.push(Math.cos(a) * rx * (sa < 0 ? 1 + (bulge - 1) * 0.5 * -sa : 1), yc + sa * ry * (sa < 0 ? bulge : 1), z); }
    }
    const p0 = pos.length / 3; pos.push(0, P[0][3], zT - S.tailR * 0.18);
    const p1 = pos.length / 3; pos.push(0, Hc.y, zE + 0.02);
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      const a = ring[i] + j, b = ring[i] + (j + 1) % M, c = ring[i + 1] + j, d = ring[i + 1] + (j + 1) % M;
      idx.push(a, b, c, b, d, c);
    }
    for (let j = 0; j < M; j++) { idx.push(p0, ring[0] + (j + 1) % M, ring[0] + j); idx.push(p1, ring[N] + j, ring[N] + (j + 1) % M); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    paintGeo(g, v => {
      const ry = at(v.z, 2), rx = at(v.z, 1), under = (v.y - at(v.z, 3)) / ry;
      const torso = sstep(z0, z0 + Hp.rz * 0.5, v.z);
      const belly = 0.6 * sstep(-0.25, -0.8, under);   // お腹は明るい茶色〜ベージュ
      const bib = tr.face === 'bib' ? 1 : 0;
      const throat = sstep(S.gap / 2 - 0.3 - bib * 0.9, zN - bib * 0.5, v.z) * sstep(-0.05 + bib * 0.15, -0.55, under) * sstep(0.85 + bib * 0.1, 0.5, Math.abs(v.x) / rx);
      return [tr.cream * torso * Math.max(belly, throat * 0.78), v.z < z0 ? 0.8 : 1];
    });
    J.spine = furMesh(g, this.mat); J.body.add(J.spine);
    // 骨（しっぽ先→しっぽ根元→おしり→胸→首→頭）と、それぞれの中心のz
    const bones = [];
    for (let k = nT - 1; k >= 0; k--) bones.push([J.tail[k], z0 - seg * (k + 0.5)]);
    bones.push([J.hips, -S.gap / 2], [J.chest, S.gap / 2], [J.neck, zN + S.neckLen * 0.4], [J.head, Hc.z - Hd.rz * 0.55]);
    this.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(J.body.matrixWorld).invert();
    const restInv = bones.map(([o]) => new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld).invert());
    const n = g.attributes.position.count, BI = new Uint8Array(n * 3), BW = new Float32Array(n * 3);
    const P0 = g.attributes.position.array.slice(), N0 = g.attributes.normal.array.slice();
    const cz = bones.map(b => b[1]), nb = bones.length, W = new Float32Array(nb);
    // 曲がりを広い範囲に分ける：骨の三角形の重みを前後になめらかにぼかす（首の折れジワ対策）
    const blur = z => z > S.gap / 2 ? 0.42 : 0.3;
    for (let v = 0; v < n; v++) {
      const z0v = P0[v * 3 + 2], H = blur(z0v);
      W.fill(0);
      for (let sI = -4; sI <= 4; sI++) {
        const z = z0v + H * sI / 4;
        let i = 0; while (i < nb - 2 && z > cz[i + 1]) i++;
        const t = clamp((z - cz[i]) / (cz[i + 1] - cz[i]), 0, 1);
        W[i] += 1 - t; W[i + 1] += t;
      }
      const order = [...W.keys()].sort((a, b) => W[b] - W[a]).slice(0, 3);
      const sum = order.reduce((s2, i) => s2 + W[i], 0) || 1;
      order.forEach((bi, j) => { BI[v * 3 + j] = bi; BW[v * 3 + j] = W[bi] / sum; });
    }
    J.skin = { geo: g, bones: bones.map(b => b[0]), restInv, BI, BW, P0, N0, M: bones.map(() => new THREE.Matrix4()) };
  }

  // 骨の動きに合わせて体の頂点を動かす（2本の骨をなめらかに混ぜる）
  skin() {
    const J = this.j, K = J.skin; if (!K) return;
    this.root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(J.body.matrixWorld).invert();
    const E = K.bones.map((o, i) => K.M[i].multiplyMatrices(inv, o.matrixWorld).multiply(K.restInv[i]).elements);
    const pa = K.geo.attributes.position.array, na = K.geo.attributes.normal.array, P0 = K.P0, N0 = K.N0;
    const BI = K.BI, BW = K.BW;
    for (let v = 0, n = BI.length / 3; v < n; v++) {
      const k = v * 3, x = P0[k], y = P0[k + 1], z = P0[k + 2], nx = N0[k], ny = N0[k + 1], nz = N0[k + 2];
      let px = 0, py = 0, pz = 0, ox = 0, oy = 0, oz = 0;
      for (let j = 0; j < 3; j++) {
        const w = BW[k + j]; if (w < 1e-4) continue;
        const a = E[BI[k + j]];
        px += w * (a[0] * x + a[4] * y + a[8] * z + a[12]); py += w * (a[1] * x + a[5] * y + a[9] * z + a[13]); pz += w * (a[2] * x + a[6] * y + a[10] * z + a[14]);
        ox += w * (a[0] * nx + a[4] * ny + a[8] * nz); oy += w * (a[1] * nx + a[5] * ny + a[9] * nz); oz += w * (a[2] * nx + a[6] * ny + a[10] * nz);
      }
      const l = Math.hypot(ox, oy, oz) || 1;
      pa[k] = px; pa[k + 1] = py; pa[k + 2] = pz; na[k] = ox / l; na[k + 1] = oy / l; na[k + 2] = oz / l;
    }
    K.geo.attributes.position.needsUpdate = true; K.geo.attributes.normal.needsUpdate = true;
  }

  setCrown(on) { this.crownOn = on; if (this.j?.crown) this.j.crown.visible = on; }

  startAct(id) {
    if (!ACTS[id]) return 0;
    this.act = { id, t: 0 }; this.actSide = Math.random() < 0.5 ? -1 : 1;
    return ACTS[id].dur;
  }

  // 便利な位置（ワールド座標）
  mouthWorld(out = new THREE.Vector3()) { return this.j.mouthMk.getWorldPosition(out); }
  headWorld(out = new THREE.Vector3()) { return this.j.head.localToWorld(out.copy(this.j.hc)); }
  pawsWorld(out = new THREE.Vector3()) {
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    this.j.el[0].localToWorld(a.set(0, -this.S.paw * 0.3, this.S.paw * 0.9));
    this.j.el[1].localToWorld(b.set(0, -this.S.paw * 0.3, this.S.paw * 0.9));
    return out.addVectors(a, b).multiplyScalar(0.5);
  }
  centerWorld(out = new THREE.Vector3()) { return this.j.body.getWorldPosition(out); }
  // 背中の上の高さ（かさなりねんね用）
  backTop() { return (this.S.chest.ry + this.S.fur) * this.scale * 1.6; }
  sizeM() { return this.unitLen * this.scale; }
  frontM() { return this.frontLen * this.scale; }
  backM() { return this.backLen * this.scale; }
}
