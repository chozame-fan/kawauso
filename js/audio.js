// 音はすべてその場で合成（録音した音・ネットの音は使わない）
// 部屋の響き（残響）とやわらかい音色で、電子音っぽさをおさえる
let ctx = null, master = null, dry = null, wet = null, on = true, amb = null;

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  // 出口：耳に痛い高音を丸める → 軽く音量をそろえる
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 7500; tone.Q.value = 0.4;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  master = ctx.createGain(); master.gain.value = on ? 0.75 : 0;
  tone.connect(comp); comp.connect(master); master.connect(ctx.destination);
  // 直接の音と、部屋の響き（作った残響）
  dry = ctx.createGain(); dry.gain.value = 1; dry.connect(tone);
  const verb = ctx.createConvolver(); verb.buffer = roomImpulse(1.6);
  wet = ctx.createGain(); wet.gain.value = 0.32; wet.connect(verb); verb.connect(tone);
  return ctx;
}
// 部屋の残響：だんだん小さく・こもっていくざわざわ
function roomImpulse(sec) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / n; lp += (Math.random() * 2 - 1 - lp) * (0.5 - 0.42 * t); d[i] = lp * Math.pow(1 - t, 3.2) * (i < 60 ? i / 60 : 1); }
  }
  return b;
}
// 音を「直接」と「響き」の両方へ送る
function out(node, verbAmt = 0.6) {
  node.connect(dry);
  if (verbAmt > 0) { const g = ctx.createGain(); g.gain.value = verbAmt; node.connect(g); g.connect(wet); }
}
export function unlock() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
export function setOn(v) { on = v; if (master) master.gain.value = v ? 0.75 : 0; if (v) startAmbient(); }
export const isOn = () => on;

const ready = () => on && init() && ctx.state !== 'closed';
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
let _noise = null;
function noise() {
  if (_noise) return _noise;
  const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return (_noise = b);
}
function env(g, t, a, peak, dec, sus = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dec);
}
// ざわざわ（雑音）を一瞬：フィルターで「水」「カリッ」「コツッ」などに
function burst(t, len, type, f, q, vol, verb = 0.4, sweepTo) {
  const s = ctx.createBufferSource(); s.buffer = noise(); s.playbackRate.value = rnd(0.8, 1.2);
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + len);
  const g = ctx.createGain(); env(g, t, Math.min(0.01, len * 0.2), vol, len);
  s.connect(fl); fl.connect(g); out(g, verb);
  s.start(t, Math.random()); s.stop(t + len + 0.05);
}

// ベル（カリンバ・鉄琴のような澄んだ音）：FMで金属っぽい倍音を少しだけ
function bell(f, t, dur = 1.4, vol = 0.12, bright = 1, verb = 0.8) {
  const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
  c.type = 'sine'; c.frequency.value = f; m.type = 'sine'; m.frequency.value = f * 3.5;
  mg.gain.setValueAtTime(f * 1.2 * bright, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + dur * 0.5);
  m.connect(mg); mg.connect(c.frequency);
  env(g, t, 0.004, vol, dur);
  const h = ctx.createOscillator(), hg = ctx.createGain(); h.type = 'sine'; h.frequency.value = f * 2.01; env(hg, t, 0.003, vol * 0.25, dur * 0.35);
  c.connect(g); h.connect(hg); out(g, verb); out(hg, verb);
  c.start(t); m.start(t); h.start(t); c.stop(t + dur + 0.1); m.stop(t + dur + 0.1); h.stop(t + dur * 0.4 + 0.1);
}
// 木の音（マリンバのようなコトッ）
function wood(f, t, vol = 0.1, dur = 0.25) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
  const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine'; o2.frequency.value = f * 3.9;
  env(g, t, 0.002, vol, dur); env(g2, t, 0.001, vol * 0.4, dur * 0.25);
  o.connect(g); o2.connect(g2); out(g, 0.35); out(g2, 0.2);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur * 0.3 + 0.05);
}
// 泡がはじける「ポコッ」
function bubble(t, vol = 0.06, f0) {
  const f = f0 || rnd(500, 1100), o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * rnd(2.2, 3), t + 0.06);
  env(g, t, 0.003, vol, 0.07);
  o.connect(g); out(g, 0.5); o.start(t); o.stop(t + 0.12);
}

// カワウソの鳴き声「ピィ」「キュッ」：上がって下がる声に小刻みなふるえと息の音
export function chirp(n = 2, pitch = 1) {
  if (!ready()) return;
  const t0 = ctx.currentTime + 0.02;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * rnd(0.11, 0.17), f = rnd(1900, 2400) * pitch, len = rnd(0.07, 0.11);
    const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 0.78, t); o.frequency.exponentialRampToValueAtTime(f * 1.08, t + len * 0.35); o.frequency.exponentialRampToValueAtTime(f * 0.86, t + len);
    vib.frequency.value = rnd(28, 40); vg.gain.value = f * 0.025; vib.connect(vg); vg.connect(o.frequency);
    // 2倍音を少し（声らしさ）
    const o2 = ctx.createOscillator(), g2 = ctx.createGain(); o2.type = 'sine';
    o2.frequency.setValueAtTime(f * 1.56, t); o2.frequency.exponentialRampToValueAtTime(f * 2.1, t + len * 0.35); o2.frequency.exponentialRampToValueAtTime(f * 1.7, t + len);
    env(g, t, 0.012, 0.09, len); env(g2, t, 0.012, 0.018, len * 0.8);
    o.connect(g); o2.connect(g2); out(g, 0.5); out(g2, 0.4);
    o.start(t); o2.start(t); vib.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05); vib.stop(t + len + 0.05);
    burst(t, len * 0.8, 'bandpass', f * 1.4, 2, 0.012, 0.3);   // 息の音
  }
}

// うれしい時の「クルルル…」：のどを鳴らす低めのふるえ
export function purr() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.02, len = 0.7;
  const s = ctx.createBufferSource(); s.buffer = noise();
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 3;
  const am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = 24; lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.08); g.gain.linearRampToValueAtTime(0.0001, t + len);
  s.connect(bp); bp.connect(am); am.connect(g); out(g, 0.3);
  const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(900, t + len * 0.6);
  og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(0.02, t + 0.1); og.gain.linearRampToValueAtTime(0.0001, t + len); o.connect(og); og.connect(am);
  s.start(t, Math.random()); lfo.start(t); o.start(t); s.stop(t + len + 0.05); lfo.stop(t + len + 0.05); o.stop(t + len + 0.05);
}

// 水しぶき：ザブッという水の音＋泡のポコポコ
export function splash(big = 1) {
  if (!ready()) return;
  const t = ctx.currentTime + 0.01;
  burst(t, 0.35 * big + 0.1, 'bandpass', 2600, 0.7, 0.16 * big, 0.6, 500);
  burst(t, 0.12, 'lowpass', 900, 0.7, 0.12 * big, 0.3);
  for (let i = 0; i < 4 + big * 5; i++) bubble(t + rnd(0.05, 0.5), rnd(0.02, 0.05));
}
export function paddle() { if (ready()) { const t = ctx.currentTime; burst(t, 0.12, 'bandpass', rnd(1400, 2400), 1, 0.03, 0.4, 700); if (Math.random() < 0.5) bubble(t + 0.05, 0.025); } }

// もぐもぐ：カリッ・ポリッと短いかむ音
export function munch() {
  if (!ready()) return;
  const t = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const tt = t + i * rnd(0.08, 0.12);
    burst(tt, 0.045, 'bandpass', rnd(2500, 4200), 1.5, 0.12, 0.15);
    burst(tt, 0.06, 'lowpass', 300, 1, 0.08, 0.05);
  }
}
// ミルクを飲む「ちゅっ」
export function sip() { if (ready()) { const t = ctx.currentTime; bubble(t, 0.035, rnd(350, 450)); burst(t, 0.04, 'bandpass', 1800, 3, 0.012, 0.1); } }

// きらっ：鉄琴のような3音
export function sparkle() {
  if (!ready()) return;
  const t = ctx.currentTime;
  [88, 91, 96].forEach((n, i) => bell(hz(n), t + i * 0.07, 0.9, 0.05, 0.6, 1));
}
// 図鑑に登録：カリンバの分散和音＋やわらかい和音
export function fanfare() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.02;
  [72, 76, 79, 84].forEach((n, i) => bell(hz(n), t + i * 0.09, i === 3 ? 1.8 : 0.9, i === 3 ? 0.11 : 0.08, 0.8, 0.9));
  [60, 64, 67].forEach(n => {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o2.type = 'sine'; o.frequency.value = hz(n); o2.frequency.value = hz(n) * 1.004;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.025, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g); o2.connect(g); out(g, 1); o.start(t); o2.start(t); o.stop(t + 1.9); o2.stop(t + 1.9);
  });
}
// ボタン・タップ：木をたたく軽い音
export function tap() { if (ready()) wood(rnd(820, 900), ctx.currentTime, 0.07, 0.18); }
// 石がぶつかる「コツッ」
export function clack() {
  if (!ready()) return;
  const t = ctx.currentTime;
  burst(t, 0.03, 'bandpass', 3200, 3, 0.14, 0.3);
  const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = rnd(2300, 2900); env(g, t, 0.001, 0.04, 0.06); o.connect(g); out(g, 0.4); o.start(t); o.stop(t + 0.1);
}

// 部屋の環境音：ときどき遠くの小鳥（響きを多めに、小さく）
function startAmbient() {
  if (amb || !init()) return;
  amb = setInterval(() => {
    if (!on || ctx.state !== 'running' || Math.random() > 0.16) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const o = ctx.createOscillator(), g = ctx.createGain(), tt = t + i * rnd(0.1, 0.16), f = rnd(3000, 3900);
      o.frequency.setValueAtTime(f, tt); o.frequency.exponentialRampToValueAtTime(f * 1.22, tt + 0.06); o.frequency.exponentialRampToValueAtTime(f * 1.05, tt + 0.09);
      env(g, tt, 0.01, 0.008, 0.09); o.connect(g); out(g, 1.4); o.start(tt); o.stop(tt + 0.12);
    }
  }, 2500);
}

// 思い出アルバムのオルゴール（C → Am → F → G）
let albumTimer = null;
export function albumMusic(play) {
  if (albumTimer) { clearInterval(albumTimer); albumTimer = null; }
  if (!play || !ready()) return;
  const seq = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
  let bar = 0;
  const playBar = () => {
    if (!on) return;
    const t0 = ctx.currentTime + 0.05, ch = seq[bar % 4];
    [0, 1, 2, 3, 2, 1, 2, 3].forEach((k, i) => bell(hz(ch[k] + 12), t0 + i * 0.25, 1.1, 0.05, 0.5, 1));
    bell(hz(ch[0] - 12), t0, 2.2, 0.06, 0.2, 0.8);
    if (bar % 2 === 1) bell(hz(ch[3] + 24), t0 + 1.0, 1.4, 0.03, 0.6, 1.2);
    bar++;
  };
  playBar(); albumTimer = setInterval(playBar, 2000);
}

// お腹ですべる「スーッ」：床をこする音が、だんだん小さく低くなる
export function slide(dur = 1.2) {
  if (!ready()) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(2200, t); bp.frequency.exponentialRampToValueAtTime(700, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp); bp.connect(g); out(g, 0.35); src.start(t, Math.random()); src.stop(t + dur + 0.05);
}
