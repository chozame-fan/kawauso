// カワウソ育成：時間・成長・お世話・行動・図鑑・セーブ
import * as THREE from 'three';
import { Otter, makeTraits, ACTS } from './otter.js';
import { World, BED, BED_R, POOL, BOWL, TUNNEL, SLIDE, SLIDE_DIR, SAND, HAMMOCK, STUMP, ROOM, PLANT } from './world.js';
const inRoom = p => { p.x = clamp(p.x, ROOM.x0, ROOM.x1); p.z = clamp(p.z, ROOM.z0, ROOM.z1); return p; };
import * as A from './audio.js';
import { lengthAt, weightAt, stageAt, STAGES, FOODS, TOYS, ZUKAN, NAMES, PERSONAS, SOURCES, LAW_NOTE, COATS, FACES, ROOM_ITEMS } from './data.js';

// しぐさ → 図鑑
const ACT_Z = { dig: 'horihori', tilt: 'kubikashige', shake: 'buruburu', roll: 'goron', stretch: 'nobi', scratch: 'kaki', chase: 'kurukuru', hop: 'pyon', clap: 'onedari', wave: 'baibai', pray: 'oteawase', kick: 'batabata', furi: 'furifuri' };

const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const TEST = new URLSearchParams(location.search).has('test');
const KEY = TEST ? 'kawauso-test' : 'kawauso-v1';
const PHOTO_KEY = KEY + '-photos';

// 1日が何秒か
const SPEEDS = { real: { sec: 86400, name: 'リアル（1日＝1日）', s: 'リアル' }, slow: { sec: 1800, name: 'ゆっくり（1日＝30分）', s: 'ゆっくり' }, normal: { sec: 600, name: 'ふつう（1日＝10分）', s: 'ふつう' }, fast: { sec: 120, name: 'はやい（1日＝2分）', s: 'はやい' }, turbo: { sec: 30, name: 'とてもはやい（1日＝30秒）', s: 'とても' }, super: { sec: 10, name: 'ちょうはやい（1日＝10秒）', s: 'ちょう' }, dev1: { sec: 2, name: '開発用（1日＝2秒）', s: '開発2秒' }, dev2: { sec: 0.5, name: '開発用（1日＝0.5秒）', s: '開発0.5秒' } };

// ---------- ふきだしの言葉 ----------
const SAY = {
  tap1: ['うれしい！💕', 'えへへ😊', 'きもちいい☺️', 'ピィ♪🎵'],
  tap2: ['もっと〜！✨', 'そこそこ〜💕', 'だいすき❤️', 'ごろごろ…😌'],
  tap3: ['しあわせ〜💖', 'もっともっと！💕', 'だーいすき❤️❤️', 'とろける〜🫠'],
  sleepTap: ['むにゃ…💕', 'すやぁ…☺️'],
  eat: ['おいしい😋', 'もぐもぐ…', 'うまうま✨', 'しあわせ〜😋'],
  milk: ['んくんく🍼', 'ちゅぱちゅぱ…', 'おいちい🍼'],
  food: ['ごはん！✨', 'わぁ！😍', 'まってました！'],
  toy: ['わーい！🎵', 'あそぼ！✨', 'やったー！'],
  swim: ['ぱしゃぱしゃ💦', 'スイスイ〜🌊', 'おみずだいすき💧'],
  call: ['おなかすいた…🍼', 'ごはんまだ？🥺', 'ピィピィ！'],
  sleep: ['すぴー💤', 'むにゃむにゃ…💤', 'Zzz…'],
  sleepy: ['ねむい…😪', 'ふぁ〜…'],
  itchy: ['かゆい…', 'おみずであそびたい💧'],
  lonely: ['かまって〜🥺', 'ねぇねぇ…', 'こっち見て〜'],
  wrap: ['ぬくぬく☺️', 'あったか〜💕'],
  hug: ['だいすき💕', 'ぎゅー！', 'はなさない〜'],
  juggle: ['ころころ〜🪨', 'じょうずでしょ？✨'],
  ball: ['まて〜！⚽', 'えいっ！'],
  roll: ['おなかもなでて〜💕', 'ごろ〜ん☺️'],
  act: {
    tilt: ['？', 'なになに？❓'], stretch: ['ふぁ〜😪', 'のび〜'], shake: ['ぶるぶるっ💦'], clap: ['ちょうだい👏', 'ごはん！👏'],
    wave: ['やっほー👋', 'おーい！'], pray: ['おねがい🙏', 'すき🙏💕'], roll: ['ごろーん🔄'], sniff: ['くんくん👃', 'くんくん…なにもない？', 'ふむふむ👃'],
    hop: ['わーい！🎵', 'ぴょん！✨'], chase: ['くるくる〜🌀', 'まてまて〜'], kick: ['きゃっきゃっ😆'], furi: ['フリフリ〜🚁', 'ぶんぶん！🌪️', 'しっぽ ぐるぐる〜'], scratch: ['かきかき…'],
  },
};

// ---------- セーブ ----------
let R = null, PHOTOS = {};
function load() {
  try { R = JSON.parse(localStorage.getItem(KEY)); } catch { R = null; }
  try { PHOTOS = JSON.parse(localStorage.getItem(PHOTO_KEY)) || {}; } catch { PHOTOS = {}; }
}
let resetting = false;
function save() {
  if (!R || resetting) return;
  R.last = Date.now();
  for (const k of kids) { k.d.x = k.pos.x; k.d.z = k.pos.z; k.d.yaw = k.yaw; }
  try { localStorage.setItem(KEY, JSON.stringify(R)); } catch (e) { console.warn(e); }
}
function savePhotos() { try { localStorage.setItem(PHOTO_KEY, JSON.stringify(PHOTOS)); } catch (e) { toast('写真の保存場所がいっぱいです'); } }

function newKid(name, day = 0, look = {}) {
  const born = Date.now() - Math.round(day * 86400000);
  return { look, name, sex: Math.random() < 0.5 ? 'オス' : 'メス', born, seed: name + ':' + born + ':' + Math.random().toString(36).slice(2, 7), day, hunger: 70, energy: 80, clean: 90, aff: 20, persona: pick(PERSONAS).id, x: BED.x + rnd(-0.08, 0.08), z: BED.z + rnd(-0.08, 0.08), yaw: rnd(0, 6.28) };
}

// ---------- 3D ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const world = new World(renderer);
const scene = world.scene;
const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 30);
const photoCam = new THREE.PerspectiveCamera(38, 1.5, 0.01, 30);
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- カワウソたち ----------
const kids = [];
let active = 0;
const K = () => kids[active];
function spawnKid(d) {
  // 見た目を選ぶ前に始めた子は、今までどおりの見た目のまま
  const o = new Otter(makeTraits(d.seed, d.look || { coat: 'futsu', face: 'mask', nose: 'rose', iris: 'choco', tuft: 'tuft' }));
  o.setCrown(!!R.crown);
  o.setAge(d.day, true);
  scene.add(o.root);
  const k = { d, o, pos: new THREE.Vector3(d.x, 0, d.z), yaw: d.yaw, st: { name: 'idle', t: 0, dur: 2 }, shadow: world.makeShadow(0.1), wet: 0, swimY: 0, nextChirp: 3, petT: 0, ageT: 0 };
  k.persona = PERSONAS.find(p => p.id === d.persona) || PERSONAS[0];
  k.sayEl = document.createElement('div'); k.sayEl.className = 'say'; k.sayEl.hidden = true; document.body.appendChild(k.sayEl);
  k.touchAt = performance.now();
  kids.push(k);
  setState(k, d.day < 38 ? 'sleep' : 'idle');
  return k;
}

const secPerDay = () => SPEEDS[R.speed]?.sec || 600;
const size = k => k.o.sizeM();
const fwd = k => new THREE.Vector3(Math.sin(k.yaw), 0, Math.cos(k.yaw));
const inBed = k => Math.hypot(k.pos.x - BED.x, k.pos.z - BED.z) < BED_R * 0.85;
function bedSpot(k, i = 0) {
  const a = rnd(0, 6.28), r = BED_R * (kids.length > 1 ? 0.35 : 0.25);
  return new THREE.Vector3(BED.x + Math.cos(a) * r * Math.random(), 0, BED.z + Math.sin(a) * r * Math.random());
}
function roomPoint(k) {
  const d = k.d.day;
  if (d < 46) { const a = rnd(0, 6.28), r = rnd(0, BED_R * 0.55); return new THREE.Vector3(BED.x + Math.cos(a) * r, 0, BED.z + Math.sin(a) * r); }
  const reach = clamp(0.6 + (d - 46) / 50, 0.6, 2.4);
  for (let i = 0; i < 20; i++) {
    const p = inRoom(new THREE.Vector3(k.pos.x + rnd(-reach, reach), 0, k.pos.z + rnd(-reach, reach)));
    if (!blockers(k).some(c => Math.hypot(p.x - c.x, p.z - c.z) < c.r + 0.05)) return p;
  }
  return k.pos.clone();
}

// ---------- 状態 ----------
function setState(k, name, data = {}) {
  const o = k.o;
  k.st = { name, t: 0, dur: data.dur ?? 4, ...data };
  if (name !== 'act') o.act = null;
  o.gait = null; o.mouthMode = null; o.happy = 0; o.turn = 0; o.over = null; o.groundSlope = 0;
  if (k.bite) k.bite.visible = false;
  o.look = null;
  switch (name) {
    case 'sleep': {
      const d = k.d.day;
      let pose = d < 38 ? 'curl' : pick(['curl', 'sleepLie', 'sleepLie']);
      if (d >= 20 && k.d.aff >= 50 && Math.random() < (k.persona.id === 'nonbiri' ? 0.8 : 0.5)) pose = 'back';
      if (data.pose) pose = data.pose;
      o.want = pose; k.st.dur = rnd(10, 20);
      break;
    }
    case 'idle': o.want = data.pose || pick(k.d.day < 46 ? ['lie', 'lieUp', 'sit'] : ['sit', 'sitUp', 'stand', 'lie', 'lieUp', 'sitUp']); k.st.dur = data.dur ?? rnd(3, 7); break;
    case 'call': o.want = k.d.day < 46 ? 'lieUp' : 'beg'; o.mouthMode = k.d.day < 46 ? 'chirp' : 'beg'; k.st.dur = 4; break;
    case 'stand2': o.want = 'stand2'; k.st.dur = rnd(3, 4.5); break;
    case 'groom': o.want = 'groom'; k.st.dur = rnd(4, 6); break;
    case 'milk': o.want = k.d.day < 60 ? 'milk' : 'hold'; o.mouthMode = 'suck'; k.st.dur = 6; break;
    case 'eat': o.want = 'eatLie'; k.st.dur = 4 * 2.3; break;
    case 'feel': o.want = 'feel'; k.st.dur = 1.8; break;
    case 'hug': o.want = 'hug'; k.st.dur = 9; break;
    case 'juggle': o.want = 'juggle'; k.st.dur = 9; break;
    case 'finger': o.want = data.hold ? 'hold' : (k.d.day < 38 ? 'lieUp' : 'finger'); o.mouthMode = data.hold ? null : (k.d.day < 38 ? 'suck' : 'bite'); k.st.dur = 14; break;
    case 'wrap': o.want = 'lieUp'; k.st.dur = 12; break;
    case 'pet': k.st.dur = 99; break;
    case 'stroke': o.want = data.pose || 'lieUp'; k.st.dur = 8; break;
    case 'swim': k.st.dur = data.dur ?? rnd(10, 15); break;
    case 'ball': k.st.dur = 12; break;
    case 'walk': break;
    case 'curious': o.want = k.d.day < 46 ? 'lieUp' : 'stand'; k.st.dur = 99; break;
    case 'sled': o.want = 'stand'; k.st.dur = 99; k.st.left = data.cycles ?? (2 + Math.floor(Math.random() * 3)); k.st.ph = 'run'; k.st.pt = 0; break;
    case 'act': { const A = ACTS[data.act]; if (A?.base) o.want = A.base; k.st.dur = o.startAct(data.act) + 0.2; if (Math.random() < 0.8) say(k, SAY.act[data.act]); break; }
  }
}

function decide(k) {
  const d = k.d.day, o = k.o;
  if (R.night || k.d.energy < 18) return goSleep(k);
  if (d < 38) return Math.random() < 0.65 ? setState(k, 'sleep') : setState(k, 'idle', { pose: pick(['curl', 'lie', 'lieUp']), dur: rnd(3, 6) });
  if (k.d.hunger < 25 && Math.random() < 0.6) return d >= 80 && Math.random() < 0.5 ? setState(k, 'act', { act: 'clap' }) : setState(k, 'call');
  const w = [
    ['idle', 3], ['wander', d >= 46 ? 3 : 1.5], ['stand2', d >= 46 ? 1 : 0], ['groom', d >= 60 ? 0.8 : 0],
    ['swim', world.poolOn && d >= 63 ? (k.persona.id === 'wanpaku' ? 2 : 1) : 0], ['yawn', 0.5],
    ['visit', kids.length > 1 ? 0.8 : 0], ['comeToCam', k.persona.id === 'amae' ? 1.5 : 0.6],
    ['act:tilt', d >= 46 ? 1 : 0], ['act:stretch', d >= 46 ? 0.5 : 0], ['act:scratch', d >= 50 ? 0.5 : 0], ['act:sniff', d >= 46 ? 0.8 : 0],
    ['act:hop', d >= 60 ? (k.persona.id === 'wanpaku' ? 1.2 : 0.4) : 0], ['act:chase', d >= 70 ? (k.persona.id === 'wanpaku' ? 0.8 : 0.3) : 0],
    ['sled', d >= 90 ? (k.persona.id === 'wanpaku' ? 1.0 : 0.45) : 0],
    ['room:tunnel', world.has?.tunnel ? (k.persona.id === 'wanpaku' ? 1.3 : 0.7) : 0],
    ['room:sandbox', world.has?.sandbox ? 0.5 : 0], ['room:stump', world.has?.stump ? 0.6 : 0],
    ['act:furi', d >= 25 ? (d < 150 ? 0.9 : 0.4) * (k.persona.id === 'wanpaku' ? 1.4 : 1) : 0],
    ['act:roll', d >= 40 && k.d.aff >= 30 ? 0.5 : 0], ['act:wave', d >= 60 && k.d.aff >= 50 ? 0.5 : 0], ['act:pray', d >= 60 && k.d.aff >= 40 ? 0.4 : 0],
  ];
  let tot = w.reduce((s, x) => s + x[1], 0), r = Math.random() * tot, c = 'idle';
  for (const [n, x] of w) { r -= x; if (r <= 0) { c = n; break; } }
  if (c.startsWith('room:')) goRoom(k, c.slice(5));
  else if (c.startsWith('act:')) setState(k, 'act', { act: c.slice(4) });
  else if (c === 'wander') walkTo(k, roomPoint(k), 'idle');
  else if (c === 'swim') goSwim(k);
  else if (c === 'yawn') { setState(k, 'idle', { pose: 'sit', dur: 2.2 }); o.mouthMode = 'yawn'; o.mt = 0; }
  else if (c === 'visit') { const other = kids.find(x => x !== k); walkTo(k, other.pos.clone().add(fwd(other).multiplyScalar(size(other) * 0.5)), 'idle'); }
  else if (c === 'comeToCam') { const p = camera.position.clone(); p.y = 0; const dir = p.sub(k.pos); const L = dir.length(); if (L > size(k) * 1.2 && d >= 46) walkTo(k, k.pos.clone().add(dir.multiplyScalar(Math.min(1, (L - size(k) * 1.2) / L) * 0.7)), 'idle'); else setState(k, 'idle', { pose: 'lieUp' }); }
  else setState(k, c);
}

function walkTo(k, to, then, thenData = {}, mul = 1) {
  setState(k, 'walk');
  k.st.to = to.clone(); k.st.then = then; k.st.thenData = thenData; k.st.mul = mul;
  k.st.via = detour(k.pos, to, size(k), k); k.st.best = 1e9; k.st.bestT = 0;
  k.o.want = 'stand';
}
function goSleep(k, pose) {
  if (k.st.name === 'sleep' && k.st.hammock) return;   // ハンモックで寝ている子はそのまま
  if (world.has?.hammock && !R.night && !pose && Math.random() < 0.4 && !kids.some(j => j !== k && j.st.hammock)) return goRoom(k, 'hammock');
  if (inBed(k)) setState(k, 'sleep', pose ? { pose } : {});
  else walkTo(k, bedSpot(k), 'sleep', pose ? { pose } : {});
}
// 遊び場へ行く（入口・はしご・坂の下まで歩いてから、ちゃんと登ったりくぐったりする）
const PLAY_STATES = ['tunnel', 'slideClimb', 'slideDown', 'rampUp', 'onTop', 'hopDown', 'hopIn', 'hamUp', 'hopOut', 'enter', 'exitPool'];
const climbing = k => PLAY_STATES.includes(k.st.name) || (k.st.name === 'sleep' && k.st.hammock);
function goRoom(k, id) {
  const s = size(k);
  if (id === 'tunnel') {
    const near = k.pos.distanceTo(TUNNEL.a) < k.pos.distanceTo(TUNNEL.b);
    const A = near ? TUNNEL.a : TUNNEL.b, B = near ? TUNNEL.b : TUNNEL.a, ax = B.clone().sub(A).normalize();
    const from = A.clone().addScaledVector(ax, -(s * 0.5 + 0.08)), to = B.clone().addScaledVector(ax, s * 0.6 + 0.06);
    walkTo(k, from, 'tunnel', { from, to });
  } else if (id === 'slide') {
    if (!world.poolBig) return play('water');
    walkTo(k, SLIDE.ladder.clone().addScaledVector(SLIDE_DIR, s * 0.45 + 0.05), 'slideClimb');
  } else if (id === 'sandbox') {
    const p = SAND.c.clone().add(new THREE.Vector3(rnd(-0.18, 0.18), 0, rnd(-0.1, 0.1)));
    walkTo(k, p, 'act', { act: 'dig' });
  } else if (id === 'stump') {
    const away = STUMP.ramp.clone().sub(STUMP.c).setY(0).normalize();
    walkTo(k, STUMP.ramp.clone().addScaledVector(away, s * 0.45 + 0.05), 'rampUp');
  } else if (id === 'hammock') {
    walkTo(k, HAMMOCK.rampBase.clone().add(new THREE.Vector3(0, 0, s * 0.45 + 0.06)), 'hamUp');
  }
}
const faceDir = (k, d, dt, rate = 8) => { let a = Math.atan2(d.x, d.z) - k.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); k.yaw += a * Math.min(1, dt * rate); };

// プールへはふちの手前まで歩き、ふちを越えて飛びこむ（壁はすり抜けない）
const poolDir = k => { const d = k.pos.clone().sub(POOL).setY(0); if (d.lengthSq() < 1e-4) d.set(-1, 0, 1); return d.normalize(); };
function goSwim(k) {
  const dir = poolDir(k);
  const out = POOL.clone().addScaledVector(dir, world.poolR + 0.06 + size(k) * 0.45).setY(0);
  walkTo(k, out, 'enter', { dir });
}
// 歩く道がプールを横切る時は、ふちの外を回る
// よける物（丸）の一覧：プール・遊具・植木・皿。行き先そのものを含む丸はよけない
function blockers(k, to) {
  const s = size(k), list = [];
  if (world.poolOn && !k.swimming) list.push({ x: POOL.x, z: POOL.z, r: world.poolR + 0.05 + s * 0.42 });
  for (const ob of world.obstacles) list.push({ x: ob.x, z: ob.z, r: ob.r + s * 0.3 });
  list.push({ x: PLANT.x, z: PLANT.z, r: 0.45 });
  if (!(k.st.then === 'eat' || k.st.then === 'feel' || k.st.name === 'eat' || k.st.name === 'feel')) list.push({ x: BOWL.x, z: BOWL.z, r: 0.11 + s * 0.22 });
  return to ? list.filter(c => Math.hypot(to.x - c.x, to.z - c.z) > c.r) : list;
}
// 点がどの丸の中にも入らないよう外へ出す（丸どうしのすき間のくぼみに目印を置かない）
function pushOut(k, p) {
  const list = blockers(k);
  for (let it = 0; it < 6; it++) {
    let moved = false;
    for (const c of list) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d < c.r + 0.04) { const R1 = c.r + 0.05; p.x = c.x + (d > 1e-4 ? dx / d : 1) * R1; p.z = c.z + (d > 1e-4 ? dz / d : 0) * R1; moved = true; }
    }
    if (!moved) break;
  }
  return p;
}
// まっすぐ行くと丸にぶつかる時は、いちばん手前の丸の外側を回る点を返す
function detour(from, to, s, k) {
  const d = to.clone().sub(from).setY(0), L = d.length(); if (L < 1e-3) return null;
  d.divideScalar(L);
  let best = null, bt = 1e9;
  for (const c of blockers(k, to)) {
    if (Math.hypot(from.x - c.x, from.z - c.z) < c.r * 0.98) continue;
    const t = (c.x - from.x) * d.x + (c.z - from.z) * d.z;
    if (t <= 0 || t >= L) continue;
    const off = new THREE.Vector3(from.x + d.x * t - c.x, 0, from.z + d.z * t - c.z), dist = off.length();
    if (dist >= c.r || t >= bt) continue;
    if (dist < 1e-3) off.set(-d.z, 0, d.x);
    off.normalize();
    // 左右の両方を考えて、部屋の中に収まり、ほかの丸に入らない側を選ぶ
    let pick = null, score = 1e9;
    for (const sgn of [1, -1]) {
      const cand = new THREE.Vector3(c.x, 0, c.z).addScaledVector(off, sgn * (c.r + 0.08));
      const outside = Math.max(0, ROOM.x0 - cand.x, cand.x - ROOM.x1, ROOM.z0 - cand.z, cand.z - ROOM.z1);
      const inOther = blockers(k, to).some(o => o !== c && Math.hypot(cand.x - o.x, cand.z - o.z) < o.r);
      const sc = outside * 50 + (inOther ? 5 : 0) + from.distanceTo(cand) + cand.distanceTo(to) + (sgn < 0 ? 0.01 : 0);
      if (sc < score) { score = sc; pick = cand; }
    }
    bt = t; best = pick;
  }
  if (best) { pushOut(k, best); inRoom(best); }
  return best;
}
// プールのふちを越える：体の前の端〜しっぽの先のどこかがふちの上にある間は、ふちより高い所を通る
function rimCross(k, st, dt, enter) {
  const o = k.o, s = size(k), F = o.frontM(), Bk = o.backM() * 0.92;
  const shallow = k.d.day < 63, rimTop = world.rimH + 0.03;
  const waterRoot = shallow ? 0.005 : world.waterY + (-o.S.chest.ry * 0.55 - (o.groundY ?? 0)) * o.scale;
  if (st.d == null) {
    const dir = st.dir;   // プールの中心から外向き
    st.from = k.pos.clone();
    st.to = enter ? POOL.clone().addScaledVector(dir, Math.max(0, world.poolR - Bk - 0.14)).setY(0) : POOL.clone().addScaledVector(dir, world.poolR + Bk + 0.16).setY(0);
    st.L = st.from.distanceTo(st.to) || 0.01;
    const r0 = Math.hypot(st.from.x - POOL.x, st.from.z - POOL.z);
    st.dr = enter ? r0 - world.poolR : world.poolR - r0;
    st.y0 = enter ? 0 : k.ry + (shallow ? 0 : (-o.S.chest.ry * 0.55 - (o.groundY ?? 0)) * o.scale);
    st.y1 = enter ? waterRoot : 0;
    st.d = 0; st.y = st.y0;
  }
  const over = st.d < st.L - 1e-3 && st.d + F > st.dr - 0.14 && st.d - Bk < st.dr + 0.08;
  const want = over ? rimTop : (st.d < st.dr ? st.y0 : st.y1);
  const rising = want > st.y + 0.005;
  // ふちの手前では、ふちより高くなるまで前へ進まない（よじ登る）
  const blocked = rising && st.d + F > st.dr - 0.16 && st.y < rimTop - 0.02;
  if (!blocked) st.d = Math.min(st.L, st.d + s * 0.45 * dt);
  st.y += clamp(want - st.y, -1.1 * dt, 0.55 * dt);
  k.pos.lerpVectors(st.from, st.to, st.d / st.L);
  k.yOverride = st.y;
  faceDir(k, enter ? st.dir.clone().negate() : st.dir, dt, 10);
  o.want = rising ? 'climb' : over ? 'stand' : (enter && st.d > st.dr ? (shallow ? 'stand' : 'dive') : 'stand');
  o.gait = blocked ? null : 'walk'; o.moveV = blocked ? 0 : s * 0.45;
  return st.d >= st.L - 1e-4 && Math.abs(st.y - st.y1) < 0.004;
}
// ふちを越える弧（start→peak→end の2次曲線）
const arcY = (e, y0, peak, y1) => { const c = 2 * peak - 0.5 * (y0 + y1); return (1 - e) * (1 - e) * y0 + 2 * e * (1 - e) * c + e * e * y1; };

function moveTo(k, to, dt, mul = 1) {
  const dx = to.x - k.pos.x, dz = to.z - k.pos.z, dist = Math.hypot(dx, dz);
  const s = size(k);
  if (dist < Math.max(0.015, s * 0.12)) { k.o.gait = null; k.o.turn = 0; k.o.moveV = 0; return true; }
  const want = Math.atan2(dx, dz);
  let da = want - k.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
  const dy = clamp(da, -2.2 * dt, 2.2 * dt);
  k.yaw += dy; k.o.turn = dt > 0 ? dy / dt : 0;
  const baby = k.d.day < 60;
  const sp = s * (k.swimming ? 0.42 : k.d.day < 46 ? 0.14 : baby ? 0.26 : 0.36) * mul * (Math.abs(da) > 1.2 ? 0.3 : 1);
  k.pos.addScaledVector(fwd(k), Math.min(dist, sp * dt));
  k.o.gait = k.swimming ? 'swim' : 'walk';
  k.o.speed = clamp(sp / s / (baby ? 0.26 : 0.36), 0.3, 1.8); k.o.moveV = Math.min(dist / Math.max(dt, 1e-3), sp);
  return false;
}
const turnTo = (k, p, dt) => { const want = Math.atan2(p.x - k.pos.x, p.z - k.pos.z); let da = want - k.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); k.yaw += clamp(da, -2.5 * dt, 2.5 * dt); return Math.abs(da) < 0.2; };
const camLook = () => camera.position.clone();

// 1匹ぶんの考える＋動く
function think(k, dt) {
  const st = k.st, o = k.o;
  st.t += dt;
  switch (st.name) {
    case 'idle':
      if (k.d.day >= 46 && Math.random() < dt * 0.12) {
        if (k.d.energy < 25) say(k, 'sleepy');
        else if (k.d.clean < 25) say(k, 'itchy');
        else if (k.d.aff >= 40 && performance.now() - k.touchAt > 60000) { say(k, 'lonely'); setFace(k, 'pout', 2.2); }
      }
      if (k.d.day >= 38 && Math.sin(st.t * 0.7 + k.yaw) > -0.2) { o.look = camLook(); if (k.d.aff >= 40 && Math.random() < dt * 0.07) { k.winkT = 0.8; setTimeout(() => unlock('wink', k), 300); } } else o.look = null;
      if (st.t > st.dur) decide(k);
      break;
    case 'sleep':
      if (Math.random() < dt * 0.08) say(k, 'sleep');
      k.d.energy = Math.min(100, k.d.energy + dt * 1.6);
      if (st.hammock) { k.pos.copy(HAMMOCK.c); k.yOverride = world.hammockY(T); if (st.t > 1.5) unlock('hammock', k); }
      if (st.hammock && !R.night && (k.d.energy > 98 && st.t > 8 || st.t > 25)) setState(k, 'hopOut');
      else if (!R.night && k.d.energy > 98 && st.t > 8) { if (k.d.day >= 46) setState(k, 'act', { act: 'stretch' }); else { setState(k, 'idle', { pose: 'sit', dur: 2.5 }); o.mouthMode = 'yawn'; o.mt = 0; } }
      else if (!R.night && k.d.day < 38 && st.t > st.dur) decide(k);
      break;
    case 'walk':
      // 0.3秒ごとに道を見直す（回り道）。2秒近く近づけなければ横へよける、それでもだめならあきらめる
      st.replan = (st.replan || 0) - dt;
      if (st.replan < 0) { st.replan = 0.3; if (!st.via) st.via = detour(k.pos, st.to, size(k), k); }
      { const dd = Math.hypot(st.to.x - k.pos.x, st.to.z - k.pos.z);
        if (dd < st.best - 0.01) { st.best = dd; st.bestT = st.t; }
        else if (st.t - st.bestT > 1.8) {
          st.stuck = (st.stuck || 0) + 1; st.bestT = st.t;
          if (st.stuck > 2) { setState(k, 'idle', { dur: 1.5 }); break; }
          const f2 = fwd(k), side = Math.random() < 0.5 ? 1 : -1;
          st.via = k.pos.clone().add(new THREE.Vector3(-f2.z * side, 0, f2.x * side).multiplyScalar(size(k) * 0.8)).addScaledVector(f2, -size(k) * 0.3);
          pushOut(k, st.via); inRoom(st.via);
        } }
      if (st.via) { if (moveTo(k, st.via, dt, st.mul)) st.via = null; }
      else if (moveTo(k, st.to, dt, st.mul)) setState(k, st.then, st.thenData);
      break;
    case 'sled': {
      // 数歩走る → お腹でスーッ（だんだん止まる）→ ときどき顔を上げて見わたす → くり返す
      const s0 = size(k);
      if (!st.dir) { const d = sledDir(k); if (!d) { setState(k, 'idle'); break; } st.dir = d; }
      st.pt += dt;
      const f2 = st.dir, room = clearAhead(k, f2);
      faceDir(k, f2, dt, 8);
      if (st.ph === 'run') {
        st.v = Math.min(s0 * 1.6, (st.v || 0) + s0 * 4 * dt);
        o.want = 'stand'; o.gait = 'walk'; o.moveV = st.v;
        k.pos.addScaledVector(f2, st.v * dt);
        if (st.pt > 0.75 || room < s0 * 1.2) { st.ph = 'slide'; st.pt = 0; st.v = Math.max(st.v, s0 * 1.2) * 1.15; A.slide(1.3); setFace(k, 'happy', 1.4); if (Math.random() < 0.6) say(k, ['スーッ！✨', 'すべるの たのしい！', 'ひゅーん🛷'], true); unlock('onakasu', k); }
      } else if (st.ph === 'slide') {
        o.want = 'sled'; o.gait = null; o.moveV = 0;
        st.v *= Math.exp(-1.7 * dt);
        if (room < s0 * 0.7) st.v *= Math.exp(-8 * dt);
        k.pos.addScaledVector(f2, st.v * dt);
        if (Math.random() < dt * 8 && st.v > s0 * 0.4) world.splash(k.pos.clone().setY(0.01), 1, '#e9dccb');
        if (st.v < s0 * 0.12) { st.left--; st.pt = 0; st.ph = Math.random() < 0.45 || st.left <= 0 ? 'look' : 'run'; st.v = 0; if (st.ph === 'run') { const d = sledDir(k, f2); if (d) st.dir = d; else st.left = 0; } }
      } else {   // 見わたす
        o.want = st.pt < 0.3 ? 'lieUp' : 'stand2'; o.gait = null; o.look = st.pt > 0.4 ? camLook() : null;
        if (st.pt > 1.6) { if (st.left <= 0) { setState(k, 'idle', { pose: 'sitUp', dur: 2 }); break; } const d = sledDir(k, f2); if (!d) { setState(k, 'idle'); break; } st.dir = d; st.ph = 'run'; st.pt = 0; }
      }
      break;
    }
    case 'curious': {
      o.look = st.to.clone().setY(world.groundAt(st.to.x, st.to.z) + 0.03);
      if (st.t < dt * 1.5) { setFace(k, 'sparkle', 0.9); say(k, ['なになに？👀', 'なにかある？✨', 'ん？', 'みにいく！'], true); }
      if (st.t > 0.45) {
        const s0 = size(k), dist = Math.hypot(st.to.x - k.pos.x, st.to.z - k.pos.z);
        if (world.poolOn && k.d.day >= 50 && world.inPool(st.to.x, st.to.z)) { goSwim(k); break; }
        let goal;
        if (k.d.day < 46) {   // 赤ちゃんはねどこの中で、押した方向のはしまで
          const d2 = st.to.clone().sub(BED).setY(0); const r = Math.min(d2.length(), BED_R * 0.55); goal = BED.clone().addScaledVector(d2.normalize(), r);
        } else {
          const dir = st.to.clone().sub(k.pos).setY(0); const L = dir.length();
          goal = L > s0 * 0.5 ? k.pos.clone().addScaledVector(dir.normalize(), L - s0 * 0.42) : k.pos.clone();
          pushOut(k, goal); inRoom(goal);
        }
        if (Math.hypot(goal.x - k.pos.x, goal.z - k.pos.z) < s0 * 0.15) setState(k, 'act', { act: 'sniff' });
        else walkTo(k, goal, 'act', { act: 'sniff' }, dist > 1.3 ? 2.2 : 1.15);
      }
      break;
    }
    case 'enter':
      // ふちに前足をかけて登る → 体のどこかがふちの上にある間はふちより高く → しっぽまで越えたら水へ
      if (rimCross(k, st, dt, true)) {
        const shallow = k.d.day < 63;
        k.yOverride = null; k.swimming = true; k.ry = st.y1;
        world.splash(o.centerWorld(new THREE.Vector3()), shallow ? 8 : 14); world.ripple(k.pos.x, k.pos.z); A.splash(shallow ? 0.6 : 1);
        setState(k, 'swim');
      }
      break;
    case 'tunnel': {
      const ax = st.to.clone().sub(st.from).setY(0), L = ax.length(); ax.normalize();
      faceDir(k, ax, dt, 12);
      st.u = Math.min(1, (st.u || 0) + size(k) * 0.4 * dt / L);
      k.pos.lerpVectors(st.from, st.to, st.u);
      o.want = 'crawl'; o.gait = 'walk'; o.moveV = size(k) * 0.4; k.yOverride = 0;
      if (st.u >= 1) { unlock('tonneru', k); say(k, ['ばぁ！✨', 'ひょっこり😊', 'もういっかい！'], true); setState(k, 'act', { act: 'tilt' }); }
      break;
    }
    case 'slideClimb': {
      // はしごを登って台の上へ
      const H = SLIDE.h, dur = 2.2;
      if (!st.from) st.from = k.pos.clone();
      faceDir(k, SLIDE_DIR.clone().negate(), dt, 12);
      const u = clamp(st.t / dur, 0, 1);
      k.pos.lerpVectors(st.from, SLIDE.top, u);
      // はしごの坂の高さ（はしごの下=0、台のふち=H、台の上は平ら）
      const edge = SLIDE.top.clone().addScaledVector(SLIDE_DIR, 0.18), run = Math.hypot(SLIDE.ladder.x - edge.x, SLIDE.ladder.z - edge.z);
      const up = clamp(Math.hypot(k.pos.x - SLIDE.ladder.x, k.pos.z - SLIDE.ladder.z) / run, 0, 1) * (((k.pos.x - SLIDE.ladder.x) * -SLIDE_DIR.x + (k.pos.z - SLIDE.ladder.z) * -SLIDE_DIR.z) > 0 ? 1 : 0);
      k.yOverride = H * up;
      o.want = up > 0.02 && up < 0.98 ? 'climb' : 'stand'; o.gait = 'walk'; o.moveV = size(k) * 0.3;
      if (u >= 1) { say(k, ['いくよー！', 'わくわく✨'], true); setState(k, 'slideDown'); }
      break;
    }
    case 'slideDown': {
      // おなかでつーっとすべってプールへ
      const H = SLIDE.h, dur = 0.95, shallow = k.d.day < 63;
      const endY = world.waterY + (-o.S.chest.ry * 0.55 - (o.groundY ?? 0)) * o.scale;
      faceDir(k, SLIDE_DIR.clone().negate(), dt, 20);
      const u = clamp(st.t / dur, 0, 1), e = u * u;
      k.pos.lerpVectors(SLIDE.top, SLIDE.bottom, e);
      const chuteY = H + (world.slideEndY - H) * e;
      k.yOverride = e < 0.85 ? chuteY : chuteY + (endY - chuteY) * (e - 0.85) / 0.15;
      o.want = 'dive';
      if (Math.random() < dt * 8) world.splash(o.centerWorld(new THREE.Vector3()), 1);
      if (u >= 1) {
        k.yOverride = null; k.swimming = true; k.ry = endY;
        world.splash(o.centerWorld(new THREE.Vector3()), 16); world.ripple(k.pos.x, k.pos.z); A.splash(1.1);
        unlock('suberidai', k);
        setState(k, 'swim', { dur: rnd(6, 9) });
      }
      break;
    }
    case 'rampUp': {
      // 丸太の坂を登って切り株の上へ
      const H = STUMP.h, dur = 1.8, top = world.stumpRampTop;
      if (!st.from) st.from = k.pos.clone();
      const u = clamp(st.t / dur, 0, 1);
      if (u < 0.72) { const e = u / 0.72; k.pos.lerpVectors(st.from, top.clone().setY(0), e); k.yOverride = H * e; faceDir(k, top.clone().sub(st.from), dt); const sl = Math.atan2(H, Math.hypot(top.x - st.from.x, top.z - st.from.z)) * Math.min(1, e * 4); o.over = { bP: sl }; o.groundSlope = sl; }
      else { const e = (u - 0.72) / 0.28; k.pos.lerpVectors(top.clone().setY(0), STUMP.c.clone(), e); k.yOverride = H; o.over = null; o.groundSlope = 0; }
      o.want = 'stand'; o.gait = 'walk'; o.speed = 0.6;
      if (u >= 1) setState(k, 'onTop');
      break;
    }
    case 'onTop':
      k.yOverride = STUMP.h; o.want = 'stand2'; o.look = camLook();
      if (st.t > 0.8 && !st.said) { st.said = true; say(k, ['たかーい！✨', 'みはらし最高！', 'やっほー！'], true); unlock('takai', k); o.startAct('tilt'); }
      if (st.t > 4) setState(k, 'hopDown');
      break;
    case 'hopDown': {
      const H = STUMP.h, dur = 0.7;
      if (!st.to) { const d = new THREE.Vector3(0, 0, 0.5).sub(STUMP.c).setY(0).normalize(); st.to = STUMP.c.clone().addScaledVector(d, STUMP.r * 1.12 + size(k) * 0.55); st.from = k.pos.clone(); }
      faceDir(k, st.to.clone().sub(st.from), dt, 12);
      const u = clamp(st.t / dur, 0, 1), e = u * u * (3 - 2 * u);
      k.pos.lerpVectors(st.from, st.to, e); k.yOverride = arcY(e, H, H + 0.06, 0);
      o.want = e < 0.5 ? 'dive' : 'stand';
      if (u >= 1) { k.yOverride = null; setState(k, 'idle', { pose: 'sit', dur: 2 }); }
      break;
    }
    case 'hamUp': {
      // スロープを歩いて登り → 布の上を歩いて真ん中へ → 丸まって寝る（浮かない）
      const s0 = size(k), B = HAMMOCK.rampBase, Tp = HAMMOCK.rampTop, C = HAMMOCK.c, topY = HAMMOCK.top - 0.012;
      if (st.d == null) { st.from = k.pos.clone(); st.d = 0; st.L1 = st.from.distanceTo(B); st.L2 = B.distanceTo(Tp); st.L3 = Tp.distanceTo(C); }
      st.d += s0 * 0.3 * dt;
      const L = st.L1 + st.L2 + st.L3;
      let y;
      if (st.d < st.L1) { k.pos.lerpVectors(st.from, B, st.d / st.L1); y = 0; }
      else if (st.d < st.L1 + st.L2) { const e = (st.d - st.L1) / st.L2; k.pos.lerpVectors(B, Tp, e); y = 0.021 + (topY + 0.01 - 0.021) * e; }   // 板の上面
      else { const e = Math.min(1, (st.d - st.L1 - st.L2) / st.L3); k.pos.lerpVectors(Tp, C, e); y = Math.max(world.hammockSurface(k.pos.x, k.pos.z) ?? topY, (st.yPrev ?? topY) - 0.06 * dt); }
      st.yPrev = y;
      faceDir(k, new THREE.Vector3(0, 0, -1), dt, 6);
      // 坂の上では体を坂の傾きに合わせて前上がりに（頭が布の端にぶつからない）
      const slope = Math.atan2(topY, st.L2), onRamp = clamp((st.d - st.L1 + s0 * 0.35) / (s0 * 0.5), 0, 1) * clamp((st.L1 + st.L2 + s0 * 0.1 - st.d) / (s0 * 0.4), 0, 1);
      o.over = { bP: slope * onRamp }; o.groundSlope = slope * onRamp;
      k.yOverride = y; o.want = 'stand'; o.gait = 'walk'; o.moveV = s0 * 0.3;
      if (st.d >= L) { setState(k, 'sleep', { hammock: true, pose: 'sleepLie' }); say(k, ['ゆらゆら〜☺️', 'おひるね…💤'], true); }
      break;
    }
    case 'hopOut': {
      // 布の上で横を向く → ふちから少しはねて、重さで落ちて着地（下りのジャンプ）
      const s0 = size(k), C = HAMMOCK.c;
      if (!st.to) { st.to = C.clone().add(new THREE.Vector3(HAMMOCK.w / 2 + s0 * 0.55 + 0.08, 0, 0)); st.from = k.pos.clone(); st.y0 = k.ry; }
      const turnDur = 0.7, jumpDur = 0.6;
      if (st.t < turnDur) {
        faceDir(k, new THREE.Vector3(1, 0, 0), dt, 5); o.want = 'stand'; k.yOverride = st.y0;
      } else {
        faceDir(k, new THREE.Vector3(1, 0, 0), dt, 12);
        const u = clamp((st.t - turnDur) / jumpDur, 0, 1);
        k.pos.lerpVectors(st.from, st.to, u);
        k.yOverride = Math.max(0, st.y0 * (1 - u) + 0.07 * 4 * u * (1 - u) - 0.0 * u);   // 放物線（少しはねて落ちる）
        o.want = u < 0.15 ? 'stand' : u < 0.8 ? 'dive' : 'stand';
        if (u >= 1) { k.yOverride = null; A.tap(); setState(k, 'act', { act: 'stretch' }); }
      }
      break;
    }
    case 'exitPool':
      // ふちをよじ登る → しっぽの先までふちを越えてから床に降りる
      if (Math.random() < dt * 6) world.splash(o.centerWorld(new THREE.Vector3()), 2);
      if (rimCross(k, st, dt, false)) { k.yOverride = null; k.ry = 0; setState(k, 'act', { act: 'shake', then: 'groom', thenData: { afterSwim: true } }); }
      break;
    case 'call':
      if (st.t < dt * 1.5) say(k, 'call', true);
      o.look = camLook();
      k.nextChirp -= dt;
      if (k.nextChirp < 0) { A.chirp(3, k.d.day < 100 ? 1.15 : 0.95); k.nextChirp = 1.3; unlock('voice', k); }
      if (st.t > st.dur) setState(k, 'idle', { pose: 'sit', dur: 3 });
      break;
    case 'stand2':
      o.look = camLook();
      if (st.t > 1.2) unlock('tachi', k);
      if (st.t > st.dur) setState(k, 'idle', { pose: 'sit' });
      break;
    case 'groom':
      o.look = null;
      k.d.clean = Math.min(100, k.d.clean + dt * 4);
      if (st.t > 1.2 && st.afterSwim) unlock('kezukuroi', k);
      if (st.t > st.dur) setState(k, 'idle');
      break;
    case 'milk': {
      if (Math.random() < dt * 0.4) say(k, 'milk');
      o.look = null;
      if (st.t > 0.6 && Math.floor(st.t * 2) !== Math.floor((st.t - dt) * 2)) A.sip();
      world.milk.scale.y = Math.max(0.05, 1 - st.t / st.dur);
      k.d.hunger = Math.min(100, k.d.hunger + dt * st.fill / st.dur);
      if (st.t > 1) unlock('milk', k);
      if (st.t > st.dur) { endProps(k); setState(k, 'idle', { pose: k.d.day < 38 ? 'curl' : 'lieUp', dur: 3 }); if (k.d.day >= 38 && Math.random() < 0.6) { o.mouthMode = 'bero'; setTimeout(() => { if (o.mouthMode === 'bero') o.mouthMode = null; }, 1300); } }
      break;
    }
    case 'eat': {
      if (st.t > 0.8 && Math.random() < dt * 0.5) say(k, 'eat');
      const f = st.food, cyc = 2.3, c = st.t % cyc, n = Math.floor(st.t / cyc), right = n % 2 === 0;
      faceDir(k, BOWL.clone().sub(k.pos), dt, 6);
      { const m = o.mouthWorld(new THREE.Vector3()), gap = Math.hypot(m.x - BOWL.x, m.z - BOWL.z) - 0.05;
        if (gap > 0.01 && st.t < 3) { const d2 = BOWL.clone().sub(k.pos).setY(0).normalize(); k.pos.addScaledVector(d2, Math.min(gap, size(k) * 0.4 * dt)); o.gait = 'walk'; o.moveV = size(k) * 0.4; } else o.gait = null; }
      if (!k.bite) { k.bite = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#f0905e', roughness: 0.5 })); scene.add(k.bite); }
      const bs = size(k) * 0.035; k.bite.scale.set(bs, bs * 0.7, bs * 1.2);
      const sh = right ? 'shR' : 'shL', el = right ? 'elR' : 'elL', paw = o.j.el[right ? 1 : 0];
      const ov = {};
      if (c < 0.6) {          // ① 皿に片方の前足を突っこむ
        const e = Math.sin(Math.min(1, c / 0.45) * Math.PI / 2);
        ov[sh] = 0.55 * e; ov[el] = 0.45 * e; ov.nkP = -0.15 * e; ov.hdP = -0.2 * e; ov.shS = (right ? 1 : -1) * 0;
        o.look = BOWL.clone().setY(0.03); o.mouthMode = null; k.bite.visible = false;
      } else if (c < 1.0) {   // ② ひと切れつかんで口へ運ぶ
        const e = (c - 0.6) / 0.4;
        ov[sh] = 0.55 * (1 - e) + 0.25 * e; ov[el] = 0.45 * (1 - e) - 1.25 * e; ov.nkP = -0.15; ov.hdP = -0.25;
        k.bite.visible = true; paw.localToWorld(k.bite.position.set(0, -o.S.paw * 0.2, o.S.paw * 1.0));
        o.look = null;
      } else {                // ③ 頭を上げて少しかたむけ、もぐもぐ
        const e = Math.min(1, (c - 1.0) / 0.25);
        ov.nkP = 0.35 * e; ov.hdP = 0.25 * e; ov.hdR = (right ? 0.25 : -0.25) * e; ov[sh] = 0.15; ov[el] = -0.6;
        o.mouthMode = 'chew'; o.look = null;
        k.bite.visible = c < 1.35; if (k.bite.visible) o.mouthWorld(k.bite.position);
        if (c - dt < 1.0) A.munch();
      }
      o.over = ov;
      if (f) f.scale.setScalar(Math.max(0.25, 1 - st.t / st.dur));
      k.d.hunger = Math.min(100, k.d.hunger + dt * st.fill / st.dur);
      if (st.t > 1.2 && (st.id === 'fish' || st.id === 'shrimp' || st.id === 'crayfish')) unlock('fish', k);
      if (st.t > 1.2 && st.id === 'crab') unlock('kani', k);
      if (st.t > st.dur) { if (f) { scene.remove(f); world.foods = world.foods.filter(x => x !== f); } k.bite.visible = false; k.d.aff = Math.min(100, k.d.aff + 3); setState(k, Math.random() < 0.4 && k.d.day >= 60 ? 'groom' : 'idle'); }
      break;
    }
    case 'feel': {
      const f = st.food; if (f) f.position.copy(BOWL).setY(0.02);
      o.want = Math.sin(st.t * 6) > 0 ? 'feel' : 'stand';
      if (st.t > st.dur) setState(k, 'eat', { food: f, fill: st.fill, id: st.id });
      break;
    }
    case 'hug': {
      if (Math.random() < dt * 0.4) say(k, 'hug');
      placeFish(k, st.t);
      o.mouthMode = Math.sin(st.t * 0.9) > 0.3 ? 'bite' : null;
      o.cur.hpL += Math.sin(st.t * 9) * 0.02; o.cur.hpR -= Math.sin(st.t * 9) * 0.02;
      if (st.t > 1.5) unlock('fishtoy', k);
      k.d.aff = Math.min(100, k.d.aff + dt * 0.5);
      if (st.t > st.dur) { const fsh = world.fishToy, p = k.pos.clone().add(fwd(k).multiplyScalar(size(k) * 0.55)); fsh.position.set(p.x, world.bedHeight(p.x, p.z) + fsh.userData.half * fsh.scale.y, p.z); fsh.rotation.set(0, rnd(0, 6), 0); setState(k, 'idle', { pose: 'lie' }); }
      break;
    }
    case 'juggle': {
      if (Math.random() < dt * 0.3) say(k, 'juggle');
      o.look = null;
      const p = o.pawsWorld(new THREE.Vector3());
      const right = new THREE.Vector3(Math.cos(k.yaw), 0, -Math.sin(k.yaw));
      world.stones.forEach((s, i) => {
        const ph = st.t * 7 + i * 2.1;
        s.position.copy(p).addScaledVector(right, Math.cos(ph) * size(k) * 0.05).add(new THREE.Vector3(0, Math.abs(Math.sin(ph)) * size(k) * 0.08, 0));
        s.rotation.x += dt * 5;
      });
      o.cur.elL = -0.9 + Math.sin(st.t * 14) * 0.25; o.cur.elR = -0.9 + Math.sin(st.t * 14 + 2) * 0.25;
      if (Math.floor(st.t / 0.5) !== Math.floor((st.t - dt) / 0.5)) A.clack();
      if (st.t > 1.5) unlock('ishi', k);
      if (st.t > st.dur) { world.stones.forEach((s, i) => s.position.copy(k.pos).add(new THREE.Vector3(rnd(-0.08, 0.08), 0.012, rnd(-0.08, 0.08)))); setState(k, 'idle', { pose: 'lie' }); }
      break;
    }
    case 'ball': {
      const b = world.ball;
      o.look = b.position.clone();
      const d = Math.hypot(b.position.x - k.pos.x, b.position.z - k.pos.z);
      if (d < size(k) * 0.45) { world.ballV.copy(fwd(k)).multiplyScalar(0.5 + Math.random() * 0.4); world.ballV.x += rnd(-0.2, 0.2); A.tap(); }
      else moveTo(k, b.position, dt, 2.4);
      if (st.t > st.dur) setState(k, 'idle', { pose: 'sit' });
      break;
    }
    case 'swim': {
      if (Math.random() < dt * 0.35) say(k, 'swim');
      k.swimming = true;
      if (st.exit) { if (moveTo(k, st.exitPt, dt, 0.8)) { setState(k, 'exitPool', { dir: st.exitDir }); break; } }
      else if (!st.to || moveTo(k, st.to, dt, 0.8)) { const a = Math.atan2(POOL.z - k.pos.z, POOL.x - k.pos.x) + rnd(-0.7, 0.7), r = world.poolR * rnd(0.3, 0.62); st.to = new THREE.Vector3(POOL.x + Math.cos(a) * r, 0, POOL.z + Math.sin(a) * r); }
      k.wet = 1;
      if (k.d.day < 63 && !st.exit) { o.gait = null; o.want = 'stand'; o.cur.shL = Math.sin(st.t * 9) * 0.6; o.cur.shR = Math.sin(st.t * 9 + 1) * 0.6; if (Math.random() < dt * 2) { world.splash(o.pawsWorld(new THREE.Vector3()), 6); A.splash(0.5); } st.to = k.pos.clone(); }
      else { o.want = 'swim'; o.gait = 'swim'; if (Math.random() < dt * 1.5) A.paddle(); }
      if (Math.random() < dt * 2) world.ripple(k.pos.x, k.pos.z);
      k.d.clean = Math.min(100, k.d.clean + dt * 5);
      if (st.t > 1.5) unlock('tarai', k);
      if (st.t > 2 && k.d.day >= 63) unlock('swim', k);
      if (st.t > st.dur && !st.exit) {
        // 部屋の中央側のふちから上がる
        const d = new THREE.Vector3(0.2, 0, 0.5).sub(POOL).setY(0).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), rnd(-0.6, 0.6));
        st.exit = true; st.exitDir = d;
        st.exitPt = POOL.clone().addScaledVector(d, Math.max(0.04, world.poolR - 0.14 - size(k) * 0.4)).setY(0);
      }
      break;
    }
    case 'finger': {
      o.look = world.fingerTip.getWorldPosition(new THREE.Vector3());
      if (st.t > 1.5) unlock(st.hold ? 'nigi' : (k.d.day >= 38 ? 'yubi' : null), k);
      k.d.aff = Math.min(100, k.d.aff + dt * 0.4);
      if (st.t > st.dur) { endProps(k); setState(k, 'idle'); }
      break;
    }
    case 'wrap':
      o.look = camLook(); o.happy = 0.5;
      k.d.energy = Math.min(100, k.d.energy + dt * 1.2); k.d.aff = Math.min(100, k.d.aff + dt * 0.3);
      if (st.t > 1.5) unlock('blanket', k);
      if (st.t > st.dur) { world.wrap.visible = false; setState(k, 'idle', { pose: 'lie' }); }
      break;
    case 'act':
      if (['tilt', 'wave', 'pray', 'clap'].includes(st.act)) o.look = camLook();
      if (st.act === 'chase') { o.gait = 'walk'; o.speed = 0.6; }
      if (st.act === 'shake' && Math.random() < dt * 6) world.splash(o.centerWorld(new THREE.Vector3()), 3);
      if (st.act === 'dig') { if (Math.random() < dt * 10) world.splash(o.pawsWorld(new THREE.Vector3()), 2, '#dcc596'); if (st.t > 0.5 && !st.said) { st.said = true; say(k, ['ほりほり…', 'なにかあるかな？🦀'], true); } }
      if (st.t > 1 && ACT_Z[st.act]) unlock(ACT_Z[st.act], k);
      if (st.t > st.dur) setState(k, st.then || 'idle', st.thenData || {});
      break;
    case 'stroke': {
      if (!st.asleep) o.look = camLook();
      k.d.aff = Math.min(100, k.d.aff + dt * 1.2); k.d.energy = Math.min(100, k.d.energy + dt * 0.3);
      if (Math.floor(st.t / 0.7) !== Math.floor((st.t - dt) / 0.7) && st.t > 0.4) {
        const p = o.headWorld(new THREE.Vector3()).project(camera);
        if (p.z < 1) heart((p.x + 1) / 2 * innerWidth + rnd(-20, 20), (1 - p.y) / 2 * innerHeight - 30);
        if (Math.random() < 0.35) Math.random() < 0.6 ? A.purr() : A.chirp(1, 1.25);
      }
      if (st.t > 1.5) unlock('nade', k);
      if (!st.asleep && !st.rolled && st.t > 3 && k.d.aff >= 60 && k.d.day >= 20) { st.rolled = true; o.want = 'back'; talk(k, 'ごろん…おなかもなでて'); }
      if (st.rolled && st.t > 4.8) unlock('uttori', k);
      if (st.t > st.dur) { endProps(k); if (st.asleep) setState(k, 'sleep', { pose: o.want }); else setState(k, 'idle', { pose: o.want === 'back' ? 'back' : 'lieUp', dur: 3 }); }
      break;
    }
    case 'pet':
      if (o.want === 'back' && !o.act && st.t > 1.5 && k.d.aff >= 40 && Math.random() < dt * 0.6) { o.startAct('kick'); setTimeout(() => unlock('batabata', k), 900); }
      o.look = camLook(); o.happy = Math.min(1, o.happy + dt * 3);
      if (st.t - k.petT > 3) setState(k, k.d.energy < 30 ? 'sleep' : 'idle', { pose: o.want, dur: 2.5 });
      break;
  }
  if (k.pingT > 0) { k.pingT -= dt; if (k.st.name !== 'sleep') o.look = k.pingP; }
  const cs = k.st;   // このフレームで状態が変わっていても、今の状態で判定する
  if (cs.name !== 'swim' && cs.name !== 'walk') k.swimming = false;
  if (!climbing(k)) k.yOverride = null;
  if (cs.name === 'walk' && !world.inPool(k.pos.x, k.pos.z)) k.swimming = false;

}

// おさかなぬいぐるみ：腹ばいの子のあごの下に横向きで置く。頭・胸・前足にめり込まない所まで前へずらす
function placeFish(k, t) {
  const o = k.o, fsh = world.fishToy, U = fsh.userData, sc = fsh.scale.y, f = fwd(k), S = o.S, os = o.scale;
  const floor = world.bedHeight(k.pos.x, k.pos.z), half = U.half * sc, thick = U.thick * sc, top = floor + half * 2;
  const fdist = c => (c.x - k.pos.x) * f.x + (c.z - k.pos.z) * f.z;
  const cols = [
    [o.headWorld(new THREE.Vector3()), S.head.rx * os * 1.12],
    [o.j.chest.localToWorld(new THREE.Vector3(0, 0, S.gap / 2 + S.chest.rz * 0.6)), S.chest.rx * os * 1.08],
    [o.j.el[0].localToWorld(new THREE.Vector3(0, -S.paw * 0.3, S.paw * 0.6)), S.paw * os * 1.6],
    [o.j.el[1].localToWorld(new THREE.Vector3(0, -S.paw * 0.3, S.paw * 0.6)), S.paw * os * 1.6],
  ];
  let along = fdist(o.pawsWorld(new THREE.Vector3()));
  for (const [c, r] of cols) {
    const dy = Math.max(0, c.y - top);
    if (dy >= r) continue;
    along = Math.max(along, fdist(c) + Math.sqrt(r * r - dy * dy) + thick * 0.95);
  }
  const want = new THREE.Vector3(k.pos.x + f.x * along, floor + half, k.pos.z + f.z * along);
  if (t < 0.05 || fsh.position.distanceTo(want) > 0.2) fsh.position.copy(want); else fsh.position.lerp(want, 0.25);
  fsh.rotation.set(0, k.yaw + Math.PI / 2, 0.08 * Math.sin(t * 3));
}

// 表情（気分で目と口が変わる）
function setFace(k, f, sec) { k.faceX = f; k.faceT = sec; }
function say(k, key, force) {
  const now = performance.now();
  if (!force && now - (k.sayAt || 0) < 3500) return;
  const arr = Array.isArray(key) ? key : SAY[key]; if (!arr) return;
  k.sayAt = now; k.sayUntil = now + 2300;
  k.sayEl.textContent = pick(arr);
  k.sayEl.classList.remove('pop'); void k.sayEl.offsetWidth; k.sayEl.classList.add('pop');
}
// 頭のまわりに絵文字をふわっと出す
function burst(k, list, n = 2) {
  const p = k.o.headWorld(new THREE.Vector3()).project(camera);
  if (p.z > 1) return;
  const x = (p.x + 1) / 2 * innerWidth, y = (1 - p.y) / 2 * innerHeight;
  for (let i = 0; i < n; i++) setTimeout(() => heart(x + rnd(-50, 50), y + rnd(-40, 10), pick(list)), i * 120);
}
// ふきだしを頭の上に置く
function placeSay(k) {
  const el = k.sayEl, now = performance.now();
  if (!el) return;
  if (now > (k.sayUntil || 0) || $('#zukan').hidden === false) { el.hidden = true; return; }
  const h = k.o.headWorld(new THREE.Vector3());
  h.y += k.o.S.head.ry * k.o.scale * 1.6;
  const p = h.project(camera);
  if (p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) { el.hidden = true; return; }
  el.hidden = false;
  el.style.left = clamp((p.x + 1) / 2 * innerWidth, 70, innerWidth - 70) + 'px';
  el.style.top = Math.max(60, (1 - p.y) / 2 * innerHeight) + 'px';
  el.style.opacity = now > k.sayUntil - 350 ? 0 : 1;
}

function expr(k, dt) {
  const o = k.o, st = k.st.name, act = k.st.act;
  k.winkT = Math.max(0, (k.winkT || 0) - dt); k.surpT = Math.max(0, (k.surpT || 0) - dt);
  let f = 'normal', smile = false;
  if (k.d.energy < 25 && st !== 'sleep') f = 'half';
  if (st === 'pet' || st === 'wrap' || st === 'stroke') { f = 'happy'; smile = true; }
  if (st === 'eat') { f = Math.sin(k.st.t * 2.2) > 0.2 ? 'happy' : 'normal'; }
  if (st === 'milk') f = 'half';
  if (st === 'hug' || st === 'juggle' || st === 'ball') smile = true;
  if (st === 'act' && ['hop', 'pray', 'wave', 'kick', 'roll', 'clap', 'chase'].includes(act)) { f = 'happy'; smile = true; }
  if (st === 'act' && act === 'tilt') smile = k.d.aff > 50;
  if (o.act?.id === 'kick') { f = 'happy'; smile = true; }
  if (st === 'sled' && k.st.ph !== 'look') { f = 'happy'; smile = true; }
  if (st === 'call') f = 'sad';
  if (st === 'idle' && k.d.hunger < 20) f = 'sad';
  if (st === 'finger' && k.st.hold) f = 'happy';
  if (k.surpT > 0) f = 'wide';
  k.faceT = Math.max(0, (k.faceT || 0) - dt);
  if (k.faceT > 0 && st !== 'sleep') { f = k.faceX; if (['happy', 'laugh', 'love', 'sparkle'].includes(f)) smile = true; }
  if (k.winkT > 0) f = 'wink';
  k.smileT = Math.max(0, (k.smileT || 0) - dt); if (k.smileT > 0) smile = true;
  o.face = f; o.smile = smile;
}

// 位置・高さ・影
function place(k, dt) {
  const o = k.o;
  // プールに入っていない時は押し出す
  const crossing = k.st.name === 'enter' || k.st.name === 'exitPool';
  if (!k.swimming && world.poolOn && !crossing) {
    const dx = k.pos.x - POOL.x, dz = k.pos.z - POOL.z, d = Math.hypot(dx, dz), R0 = world.poolR + 0.05 + size(k) * 0.42;
    if (d < R0) { k.pos.x = POOL.x + dx / (d || 1) * R0; k.pos.z = POOL.z + dz / (d || 1) * R0; }
  }
  // きょうだい同士は重ならない（かさなりねんね以外）
  for (const j of kids) if (j !== k && !k.stack && !j.stack) {
    const dx = k.pos.x - j.pos.x, dz = k.pos.z - j.pos.z, d = Math.hypot(dx, dz), m = (size(k) + size(j)) * 0.22;
    if (d < m && d > 1e-4) { k.pos.x += dx / d * (m - d) * 0.5; k.pos.z += dz / d * (m - d) * 0.5; }
  }
  inRoom(k.pos);
  if (!climbing(k)) for (const c of blockers(k)) {
    if (world.poolOn && c.x === POOL.x && c.z === POOL.z) continue;   // プールは上でやっている
    const dx = k.pos.x - c.x, dz = k.pos.z - c.z, d = Math.hypot(dx, dz);
    if (d < c.r * 0.92) { const R1 = c.r * 0.92; k.pos.x = c.x + dx / (d || 1) * R1; k.pos.z = c.z + dz / (d || 1) * R1; }
  }
  let y = world.groundAt(k.pos.x, k.pos.z);
  if (k.swimming && world.inPool(k.pos.x, k.pos.z)) {
    y = world.waterY - (k.d.day < 63 ? world.waterY - 0.005 : 0);
    o.floatY = k.d.day < 63 ? null : -(o.groundY ?? 0) - o.S.chest.ry * 0.55;
  } else o.floatY = null;
  if (k.stack) y += k.stack.o.backTop();
  // 体が道をなぞる：頭（胸）が通った道を、腰があとからたどる → 曲がる時に体が自然にカーブする
  {
    const tr = k.trail || (k.trail = []), last = tr[tr.length - 1];
    if (last && Math.hypot(k.pos.x - last.x, k.pos.z - last.z) > 0.35) tr.length = 0;
    if (!last || Math.hypot(k.pos.x - last.x, k.pos.z - last.z) > 0.006) { tr.push({ x: k.pos.x, z: k.pos.z }); if (tr.length > 260) tr.shift(); }
    let bendT = 0;
    if (o.gait && tr.length > 2) {
      const D = o.S.gap * o.scale * 1.15;
      let acc = 0, px = k.pos.x, pz = k.pos.z, hx = px, hz = pz;
      for (let i = tr.length - 1; i >= 0; i--) {
        const dx = tr[i].x - px, dz = tr[i].z - pz, L = Math.hypot(dx, dz);
        if (acc + L >= D) { const f = (D - acc) / L; hx = px + dx * f; hz = pz + dz * f; acc = D; break; }
        acc += L; px = hx = tr[i].x; pz = hz = tr[i].z;
      }
      if (acc > D * 0.5) { let b = k.yaw - Math.atan2(k.pos.x - hx, k.pos.z - hz); b = Math.atan2(Math.sin(b), Math.cos(b)); bendT = clamp(b, -0.9, 0.9); }
    }
    k.bend = (k.bend || 0) + (bendT - (k.bend || 0)) * Math.min(1, dt * (o.gait ? 7 : 1.0));
    o.bend = k.bend;
  }
  // ハンモックの上：体のどの部分も布にめり込まない高さまで持ち上げる（前のコマの体の形で計算）
  if (k.st.name === 'hamUp' || k.st.name === 'hopOut' || (k.st.name === 'sleep' && k.st.hammock)) {
    let pen = -1;
    const v = new THREE.Vector3();
    for (const m of o.j.mk) { m.getWorldPosition(v); const yf = world.hammockSurface(v.x, v.z); if (yf != null) pen = Math.max(pen, yf + 0.012 - v.y); }
    k.hamLift = clamp((k.hamLift || 0) + (pen > -1 ? (pen > 0 ? pen : pen * 0.3) : -0.02), 0, 0.3);
    if (k.yOverride != null) k.yOverride += k.hamLift;
  } else k.hamLift = 0;
  if (k.yOverride != null) k.ry = k.yOverride;
  else k.ry = k.ry == null ? y : k.ry + (y - k.ry) * Math.min(1, dt * 5);
  o.root.position.set(k.pos.x, k.ry, k.pos.z);
  o.mat.uniforms.uFloor.value = k.swimming || climbing(k) ? -10 : world.groundAt(k.pos.x, k.pos.z) + 0.006;
  if (o.spinV) k.yaw += o.spinV * dt;
  o.root.rotation.y = k.yaw;
  k.wet = Math.max(0, k.wet - dt * (k.swimming ? 0 : 0.03));
  o.wet = k.wet;
  const s = size(k);
  const inP = world.inPool(k.pos.x, k.pos.z);
  k.shadow.position.set(k.pos.x, (inP ? world.waterY : world.groundAt(k.pos.x, k.pos.z)) + 0.007, k.pos.z);
  k.shadow.scale.set(s * 0.7, s * 0.9, 1);
  k.shadow.rotation.z = k.yaw;
  k.shadow.visible = !k.stack;
}

// ---------- 小道具（指・哺乳びん・ブランケット）----------
let propOwner = null;
function endProps(k) {
  if (k && propOwner !== k) return;
  world.hand.visible = false; world.bottle.visible = false; propOwner = null;
}
function updateProps(dt) {
  const k = propOwner;
  if (k && (k.st.name === 'milk' || k.st.name === 'finger' || k.st.name === 'stroke')) {
    const o = k.o, s = size(k);
    const f = fwd(k), right = new THREE.Vector3(f.z, 0, -f.x), up = new THREE.Vector3(0, 1, 0);
    const aim = (obj, pos, dir, rate) => {
      const q = new THREE.Object3D(); q.position.copy(pos); q.lookAt(pos.clone().add(dir));
      if (rate >= 1 || !obj.visible) { obj.position.copy(pos); obj.quaternion.copy(q.quaternion); }
      else { obj.position.lerp(pos, rate); obj.quaternion.slerp(q.quaternion, rate); }
    };
    if (k.st.name === 'stroke') {
      // 頭のてっぺん→首のうしろへ、指先でやさしくなでる（へそ天ならお腹）
      const S = o.S, sc = o.scale, u = (1 - Math.cos(k.st.t * 2.6)) / 2;
      let a, b;
      if (o.cur.bR > 2) {
        const c = o.centerWorld(new THREE.Vector3());
        a = c.clone().addScaledVector(up, (S.chest.ry + 0.1) * sc).addScaledVector(f, S.gap * 0.45 * sc);
        b = c.clone().addScaledVector(up, (S.chest.ry + 0.1) * sc).addScaledVector(f, -S.gap * 0.25 * sc);
      } else {
        const h = o.headWorld(new THREE.Vector3());
        a = h.clone().addScaledVector(up, S.head.ry * sc * 1.02).addScaledVector(f, S.head.rz * sc * 0.15);
        b = h.clone().addScaledVector(up, S.head.ry * sc * 0.75).addScaledVector(f, -S.head.rz * sc * 1.0);
      }
      const tip = a.lerp(b, u).addScaledVector(up, 0.001 + o.S.fur * sc * 0.6);
      const d = f.clone().multiplyScalar(0.97).addScaledVector(up, -0.16 - 0.1 * u).normalize();
      aim(world.hand, tip, d, k.st.t < 0.1 ? 1 : Math.min(1, dt * 10));
    } else if (k.st.name === 'milk') {
      // 哺乳びんは前から少し上から。手は上からびんを持つ
      const m = o.mouthWorld(new THREE.Vector3());
      const A = f.clone().multiplyScalar(0.8).addScaledVector(up, 0.6).normalize();
      const d = A.clone().negate();
      const r = k.st.t < 0.1 ? 1 : Math.min(1, dt * 8);
      aim(world.bottle, m.clone().addScaledVector(d, -0.074), d, r);
      const bl = new THREE.Vector3(0, 0.03, -0.035).applyQuaternion(world.bottle.quaternion);
      aim(world.hand, world.bottle.position.clone().add(bl), d, r);
    } else {
      // 指はカメラと反対側の斜め前・少し上から、指先だけを口（または両手の間）へ
      const side = k.st.side || 1;
      const tgt = k.st.hold ? o.pawsWorld(new THREE.Vector3()) : o.mouthWorld(new THREE.Vector3());
      const A = k.st.hold
        ? f.clone().multiplyScalar(0.55).addScaledVector(right, side * 0.35).addScaledVector(up, 0.75).normalize()
        : f.clone().multiplyScalar(0.9).addScaledVector(right, side * 0.4).addScaledVector(up, 0.3).normalize();
      const d = A.clone().negate();
      const wig = Math.sin(k.st.t * 2.3) * 0.002;
      const pos = tgt.clone().addScaledVector(d, k.st.hold ? 0.006 : 0.003 + wig);
      aim(world.hand, pos, d, Math.min(1, dt * 6));
    }
  }
  // ブランケット
  const w = kids.find(x => x.st.name === 'wrap');
  if (w) {
    const o = w.o, S = o.S;
    world.wrap.visible = true;
    o.j.body.updateWorldMatrix(true, false);
    world.wrap.position.copy(o.j.body.localToWorld(new THREE.Vector3(0, S.chest.ry * 0.15, -S.gap * 0.15)));
    o.j.body.getWorldQuaternion(world.wrap.quaternion);
    const sc = o.scale;
    world.wrap.scale.set(S.chest.rx * 1.5 * sc, S.chest.ry * 1.55 * sc, (S.gap / 2 + S.chest.rz) * 1.2 * sc);
  }
  // ボール
  const b = world.ball;
  if (b.visible) {
    b.position.addScaledVector(world.ballV, dt);
    world.ballV.multiplyScalar(Math.pow(0.35, dt));
    if (b.position.x < ROOM.x0 || b.position.x > ROOM.x1) world.ballV.x *= -1;
    if (b.position.z < ROOM.z0 || b.position.z > ROOM.z1) world.ballV.z *= -1;
    inRoom(b.position);
    if (world.inPool(b.position.x, b.position.z, -0.05)) { const d = b.position.clone().sub(POOL).setY(0).normalize(); world.ballV.reflect(d); b.position.copy(POOL).addScaledVector(d, world.poolR + 0.06); }
    b.position.y = 0.035;
    b.rotation.x += world.ballV.z * dt / 0.035; b.rotation.z -= world.ballV.x * dt / 0.035;
  }
}

// ---------- お世話 ----------
function busy(k) { return ['milk', 'eat', 'feel', 'finger', 'stroke', 'wrap', 'hug', 'juggle'].includes(k.st.name) || (climbing(k) && k.st.name !== 'sleep'); }
const waitPlay = k => {
  if (k.st.name === 'sleep' && k.st.hammock) { setState(k, 'hopOut'); toast('ハンモックから降りるね。もう一度押してね'); return true; }
  if (climbing(k) && k.st.name !== 'sleep') { toast('いま遊んでいるところ。少し待ってね'); return true; }
  return false;
};
function wakeIfNeeded(k) { if (k.st.name === 'sleep' && R.night) { setNight(false); } }

function feed(id) {
  const k = K(), f = FOODS.find(x => x.id === id);
  closeSheets(); faceCam(k);
  if (waitPlay(k)) return;
  if (!f) return;
  wakeIfNeeded(k);
  if (busy(k)) endProps(k);
  k.touchAt = performance.now(); setFace(k, 'sparkle', 1.2); say(k, 'food', true);
  for (const fd of world.foods) scene.remove(fd);
  world.foods = [];
  if (id === 'milk') {
    propOwner = k;
    world.bottle.visible = true; world.hand.visible = true; world.milk.scale.y = 1; world.setHandOpen(0);
    setState(k, 'milk', { fill: f.fill });
    talk(k, 'ミルクだ！んくんく…');
    return;
  }
  const food = world.makeFood(id);
  food.position.copy(BOWL).setY(0.02);
  world.foods.push(food);
  A.tap();
  const next = id === 'crab' ? 'feel' : 'eat';
  const to = BOWL.clone().sub(fwd(k).multiplyScalar(0)).add(new THREE.Vector3(0, 0, 0));
  const dir = k.pos.clone().sub(BOWL).setY(0); if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1);
  to.add(dir.normalize().multiplyScalar(size(k) * 0.42 + 0.08));
  walkTo(k, to, next, { food, fill: f.fill, id }, k.persona.id === 'kuishin' ? 1.4 : 1.15);
  talk(k, f.icon + ' ' + f.name + '！');
}

function play(id) {
  const k = K(), s = size(k);
  closeSheets(); faceCam(k);
  if (waitPlay(k)) return;
  wakeIfNeeded(k);
  if (busy(k)) { endProps(k); world.wrap.visible = false; }
  k.touchAt = performance.now(); setFace(k, 'sparkle', 1.2); say(k, id === 'ball' ? 'ball' : 'toy', true);
  const front = k.pos.clone().add(fwd(k).multiplyScalar(s * 0.6));
  inRoom(front);
  if (TOYS.find(t => t.id === id)?.room) return goRoom(k, id);
  if (id === 'sled') { setState(k, 'sled'); return; }
  if (id === 'furi') { setState(k, 'act', { act: 'furi' }); return; }
  if (id === 'fishtoy') {
    const fsh = world.fishToy; fsh.visible = true;
    fsh.scale.setScalar(clamp(s * 0.34 / fsh.userData.len, 0.5, 1.1));
    fsh.position.copy(front).setY(world.bedHeight(front.x, front.z) + fsh.userData.half * fsh.scale.y);
    fsh.rotation.set(0, k.yaw + Math.PI / 2, 0);
    walkTo(k, front.clone().sub(fwd(k).multiplyScalar(s * 0.25)), 'hug', {}, 1);
  } else if (id === 'stone') {
    world.stones.forEach((st, i) => { st.visible = true; st.position.copy(front).add(new THREE.Vector3(rnd(-0.04, 0.04), 0.012, rnd(-0.04, 0.04))); });
    walkTo(k, front.clone().sub(fwd(k).multiplyScalar(s * 0.3)), 'juggle');
  } else if (id === 'ball') {
    world.ball.visible = true; world.ball.position.copy(front); world.ballV.set(rnd(-0.3, 0.3), 0, rnd(-0.3, 0.3));
    setState(k, 'ball');
  } else if (id === 'water') {
    if (!world.poolOn) return toast('まだ水あそびは早いみたい（生後50日から）');
    goSwim(k);
    talk(k, k.d.day < 63 ? 'おみず…ちょっとこわい' : 'およぐ！');
  }
  k.d.aff = Math.min(100, k.d.aff + 4);
}

function stroke() {
  const k = K();
  if (k.st.name === 'stroke') { endProps(k); setState(k, 'idle', { pose: k.o.want === 'back' ? 'back' : 'lieUp', dur: 3 }); return; }
  if (busy(k)) endProps(k);
  world.wrap.visible = false;
  propOwner = k;
  world.hand.visible = true; world.bottle.visible = false; world.setHandOpen(1);
  const asleep = k.st.name === 'sleep';
  setState(k, 'stroke', { asleep, pose: asleep ? k.o.want : (k.d.day < 46 ? 'lieUp' : pick(['lie', 'lieUp', 'sit'])) });
  faceCam(k, 0.7);
  talk(k, asleep ? 'すやすや…（なでられてうれしそう）' : 'きもちいい〜');
}

function finger() {
  const k = K();
  if (k.st.name === 'finger') { endProps(k); setState(k, 'idle'); return; }
  wakeIfNeeded(k); faceCam(k, 1.0);
  if (busy(k)) endProps(k);
  world.wrap.visible = false;
  const hold = k.d.aff >= 70 && k.d.day >= 46;
  propOwner = k;
  world.hand.visible = true; world.bottle.visible = false;
  const m = k.o.mouthWorld(new THREE.Vector3());
  world.hand.position.copy(m).add(fwd(k).multiplyScalar(size(k) * 0.8)).add(new THREE.Vector3(0, size(k) * 0.4, 0));
  { const f = fwd(k), right = new THREE.Vector3(f.z, 0, -f.x); const toCam = camera.position.clone().sub(k.pos); setState(k, 'finger', { hold, side: right.dot(toCam) > 0 ? -1 : 1 }); }
  talk(k, hold ? 'ぎゅっ（はなさない）' : k.d.day < 38 ? 'ちゅぱちゅぱ…' : 'かみかみ…');
}

function wrapUp() {
  const k = K();
  if (waitPlay(k)) return;
  if (k.st.name === 'wrap') { world.wrap.visible = false; setState(k, 'idle', { pose: 'lie' }); return; }
  wakeIfNeeded(k);
  if (busy(k)) endProps(k);
  setState(k, 'wrap'); faceCam(k, 0.3); say(k, 'wrap', true); k.touchAt = performance.now();
  talk(k, 'ぬくぬく…');
}

function setNight(on) {
  R.night = on;
  $('#btn-night').innerHTML = on ? '<b>☀️</b>おきる' : '<b>🌙</b>ねんね';
  for (const k of kids) {
    if (busy(k)) { endProps(k); world.wrap.visible = false; }
    if (on) goSleep(k);
    else if (k.st.name === 'sleep' && k.st.hammock) setState(k, 'hopOut');
    else if (k.st.name === 'sleep') { setState(k, 'idle', { pose: 'sit', dur: 3 }); k.o.mouthMode = 'yawn'; k.o.mt = 0; k.stack = null; }
  }
  if (!on) for (const k of kids) k.stack = null;
}

// ---------- なでる ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function hitKid(x, y) {
  ptr.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  let best = null, bd = 1e9;
  for (const k of kids) {
    const hits = ray.intersectObject(k.o.root, true);
    if (hits.length && hits[0].distance < bd) { bd = hits[0].distance; best = k; }
  }
  if (best) return best;
  let near = 46;
  for (const k of kids) for (const p of [k.o.headWorld(new THREE.Vector3()), k.o.centerWorld(new THREE.Vector3())]) {
    p.project(camera);
    const d = Math.hypot((p.x + 1) / 2 * innerWidth - x, (1 - p.y) / 2 * innerHeight - y);
    if (p.z < 1 && d < near) { near = d; best = k; }
  }
  return best;
}
function heart(x, y, ch = '💗') {
  const h = document.createElement('div'); h.className = 'heart'; h.textContent = ch;
  h.style.left = x + 'px'; h.style.top = y + 'px'; h.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
  document.body.appendChild(h); setTimeout(() => h.remove(), 1300);
}
let petAcc = 0, lastPurr = 0;
function petMove(k, x, y, dist) {
  petAcc += dist;
  if (k.st.name !== 'pet' && !busy(k) && k.st.name !== 'swim') {
    const pose = k.st.name === 'sleep' ? k.o.want : (k.d.aff >= 40 && k.d.day >= 20 && Math.random() < 0.5 ? 'back' : (k.d.day < 46 ? 'lieUp' : pick(['lie', 'sit', 'lieUp'])));
    setState(k, 'pet'); k.o.want = pose;
  }
  if (k.st.name === 'pet') k.petT = k.st.t;
  if (petAcc > 70) {
    petAcc = 0;
    heart(x, y);
    k.d.aff = Math.min(100, k.d.aff + 1.2);
    k.d.energy = Math.min(100, k.d.energy + 0.3);
    const now = performance.now();
    if (now - lastPurr > 1500) { lastPurr = now; Math.random() < 0.5 ? A.purr() : A.chirp(1, 1.2); }
  }
}

// タップでなでる（手は出さない）。続けてタップすると、なかよしの子はへそ天になる
function tapPet(k, x, y) {
  const o = k.o, now = performance.now();
  k.tapN = now - (k.tapAt || 0) < 2500 ? (k.tapN || 0) + 1 : 1; k.tapAt = now;
  k.touchAt = now;
  heart(x, y, pick(['💗', '💕', '💖']));
  burst(k, k.tapN >= 5 ? ['💖', '💕', '❤️', '✨'] : ['✨', '🎵', '💕'], k.tapN >= 5 ? 3 : 1);
  k.d.aff = Math.min(100, k.d.aff + 2); k.d.energy = Math.min(100, k.d.energy + 0.5);
  if (now - lastPurr > 900) { lastPurr = now; Math.random() < 0.55 ? A.purr() : A.chirp(1, 1.25); }
  if (k.st.name === 'sleep') { k.smileT = 1.5; say(k, 'sleepTap', true); if (k.tapN >= 3) unlock('nade', k); return; }   // 寝ている子は起こさない
  if (busy(k) || k.st.name === 'swim') return;
  if (k.st.name !== 'pet') { setState(k, 'pet'); o.want = k.d.day < 46 ? 'lieUp' : pick(['lie', 'lieUp', 'sit']); faceCam(k, 0.6); }
  k.petT = k.st.t;
  if (o.want !== 'back' && !o.act && k.tapN % 4 === 2) o.startAct('tilt');
  if (k.tapN >= 3) unlock('nade', k);
  // タップを続けるほど：にっこり → 大笑い → ハートの目（ときどきキラキラ）
  const n = k.tapN;
  setFace(k, n <= 2 ? (Math.random() < 0.2 ? 'sparkle' : 'happy') : n <= 4 ? 'laugh' : 'love', 1.8);
  if (n >= 6 && o.want !== 'back' && k.d.aff >= 60 && k.d.day >= 20) { o.act = null; o.want = 'back'; say(k, 'roll', true); setTimeout(() => unlock('uttori', k), 1500); }
  else say(k, n <= 2 ? 'tap1' : n <= 4 ? 'tap2' : 'tap3', true);
}

// まっすぐ空いている長さ（部屋のはし・よける物まで）
function clearAhead(k, dir) {
  const s0 = size(k); let L = 0;
  for (; L < 4; L += 0.05) {
    const x = k.pos.x + dir.x * (L + s0 * 0.5), z = k.pos.z + dir.z * (L + s0 * 0.5);
    if (x < ROOM.x0 || x > ROOM.x1 || z < ROOM.z0 || z > ROOM.z1) break;
    if (blockers(k).some(c => Math.hypot(x - c.x, z - c.z) < c.r + 0.04)) break;
  }
  return L;
}
// すべるのに向いた方向（空いた長さが長く、いまの向きに近いほどよい）
function sledDir(k, prefer) {
  let best = null, bs = -1;
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const L = clearAhead(k, d); if (L < size(k) * 2.5) continue;
    const sc = L + (prefer ? d.dot(prefer) * 0.8 : 0) + Math.random() * 0.3;
    if (sc > bs) { bs = sc; best = d; }
  }
  return best;
}

// 床をタップ：そっちに興味を持って見に来る
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function callTo(x, y) {
  ptr.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(floorPlane, p)) return;
  if (p.x < ROOM.x0 - 0.3 || p.x > ROOM.x1 + 0.3 || p.z < ROOM.z0 - 0.3 || p.z > ROOM.z1 + 0.4) return;
  inRoom(p);
  world.ping(p);
  heart(x, y, pick(['✨', '👀', '❓']));
  A.tap();
  kids.forEach((k, i) => {
    if (k.st.name === 'sleep' || k.d.day < 38) return;           // 寝ている子・目が開く前の子は気づかない
    k.pingP = p.clone().setY(world.groundAt(p.x, p.z) + 0.03); k.pingT = 1.6;
    k.touchAt = performance.now();
    if (busy(k) || climbing(k) || ['swim', 'eat', 'feel', 'milk'].includes(k.st.name)) return;   // 手がはなせない時は顔だけ向ける
    setTimeout(() => { if (k.st.name !== 'sleep') setState(k, 'curious', { to: p.clone() }); }, i * 250);
  });
}

// ---------- カメラ ----------
const cam = { yaw: 0.5, pitch: 0.32, zoom: 1, tgt: new THREE.Vector3(), dist: 1, goal: null };
function faceCam(k = K(), side = 0.6) { if (k) cam.goal = k.yaw + side; }
const pointers = new Map();
let mode = null, pinch0 = 0, zoom0 = 1, downAt = 0, moved = 0;
canvas.addEventListener('pointerdown', e => {
  A.unlock();
  try { canvas.setPointerCapture(e.pointerId); } catch { }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  downAt = performance.now(); moved = 0;
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = cam.zoom; mode = 'pinch'; return; }
  const k = hitKid(e.clientX, e.clientY);
  if (k) { mode = 'pet'; petKid = k; if (k !== K()) switchTo(kids.indexOf(k)); }
  else mode = 'orbit';
});
let petKid = null;
canvas.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.hypot(dx, dy);
  if (mode === 'pinch' && pointers.size === 2) { const [a, b] = [...pointers.values()]; cam.zoom = clamp(zoom0 * pinch0 / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), 0.35, 4); }
  else if (mode === 'orbit') { cam.goal = null; cam.yaw -= dx * 0.008; cam.pitch = clamp(cam.pitch + dy * 0.006, -0.05, 1.35); }
  else if (mode === 'pet' && petKid) petMove(petKid, e.clientX, e.clientY, Math.hypot(dx, dy));
});
const up = e => {
  pointers.delete(e.pointerId);
  if (mode === 'pet' && petKid && moved < 12 && performance.now() - downAt < 500) tapPet(petKid, e.clientX, e.clientY);
  else if (mode === 'orbit' && moved < 10 && performance.now() - downAt < 450) callTo(e.clientX, e.clientY);
  if (pointers.size === 0) { mode = null; petKid = null; }
};
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = clamp(cam.zoom * Math.exp(e.deltaY * 0.0012), 0.35, 4); }, { passive: false });

function updateCamera(dt) {
  const k = K(); if (!k) return;
  const c = k.o.centerWorld(new THREE.Vector3());
  if (['finger', 'milk', 'eat', 'call', 'wrap', 'stroke'].includes(k.st.name)) c.lerp(k.o.headWorld(new THREE.Vector3()), 0.7);
  cam.tgt.lerp(c, cam.init ? Math.min(1, dt * 3) : 1);
  if (cam.goal != null) { let da = cam.goal - cam.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); cam.yaw += da * Math.min(1, dt * 2.5); if (Math.abs(da) < 0.01) cam.goal = null; }
  const portrait = camera.aspect < 1 ? 1 / Math.max(0.55, camera.aspect) : 1;
  const want = clamp(size(k) * (k.st.name === 'stroke' ? 3 : 2.4) * cam.zoom * Math.min(1.3, portrait), 0.3, 4);
  cam.dist += (want - cam.dist) * (cam.init ? Math.min(1, dt * 3) : 1);
  cam.init = true;
  const p = new THREE.Vector3(
    cam.tgt.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist,
    cam.tgt.y + Math.sin(cam.pitch) * cam.dist + size(k) * 0.05,
    cam.tgt.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
  p.x = clamp(p.x, -3.25, 3.25); p.z = clamp(p.z, -2.65, 4.5); p.y = clamp(p.y, 0.03, 2.8);
  camera.position.copy(p);
  camera.lookAt(cam.tgt);
}

// ---------- 図鑑と写真 ----------
const photoQ = [];
function unlock(id, k) {
  if (!id || !R || R.zukan[id]) return;
  const z = ZUKAN.find(x => x.id === id); if (!z) return;
  R.zukan[id] = { t: Date.now(), day: Math.floor(k.d.day), name: k.d.name };
  toast(`📖 図鑑に登録：${z.icon} ${z.name}`, true);
  A.fanfare();
  photoQ.push({ id, k, at: performance.now() + 900, cam: z.cam });
  updateZukanBadge();
  save();
  checkComplete();
}
function takePhoto(job) {
  const k = job.k, o = k.o, s = size(k);
  const head = o.headWorld(new THREE.Vector3()), c = o.centerWorld(new THREE.Vector3());
  const f = fwd(k), right = new THREE.Vector3(f.z, 0, -f.x);
  let pos, look;
  const U = new THREE.Vector3(0, 1, 0);
  // 寝ころんで頭の向きが体とちがう時もあるので、頭→体の向きも使う
  const hf = head.clone().sub(c).setY(0); if (hf.lengthSq() > 1e-6) { const f2 = f.clone().lerp(hf.normalize(), 0.5); if (f2.lengthSq() > 0.09) f.copy(f2.normalize()); }
  const rt = new THREE.Vector3(f.z, 0, -f.x);
  if (job.cam === 'face') { look = head.clone().lerp(c, 0.25); pos = look.clone().addScaledVector(f, s * 1.0).addScaledVector(rt, s * 0.32).addScaledVector(U, s * 0.2); }
  else if (job.cam === 'top') { look = c.clone().lerp(head, 0.3); pos = look.clone().addScaledVector(f, -s * 0.55).addScaledVector(U, s * 1.6).addScaledVector(rt, s * 0.2); }
  else if (job.cam === 'side' || k.swimming) { look = c.clone().lerp(head, 0.3); pos = look.clone().addScaledVector(rt, s * 1.5).addScaledVector(f, s * 0.7).addScaledVector(U, s * (k.swimming ? 1.25 : 0.5)); }
  else { look = c.clone().lerp(head, 0.45); pos = look.clone().addScaledVector(f, s * 1.35).addScaledVector(rt, s * 0.6).addScaledVector(U, s * 0.4); }
  pos.y = Math.max(pos.y, 0.02);
  if (pos.distanceTo(look) < s * 0.55) pos.copy(look).add(pos.clone().sub(look).normalize().multiplyScalar(s * 0.55));
  photoCam.position.copy(pos); photoCam.lookAt(look);
  // 画面が縦長でも横長でも、同じ横長（3:2）で撮る
  const W = 540, H = 360, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const pr = renderer.getPixelRatio(), sz = renderer.getSize(new THREE.Vector2());
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  photoCam.aspect = W / H; photoCam.updateProjectionMatrix();
  renderer.render(scene, photoCam);
  cv.getContext('2d').drawImage(renderer.domElement, 0, 0, W, H);
  renderer.setPixelRatio(pr); renderer.setSize(sz.x, sz.y, false);
  PHOTOS[job.id] = cv.toDataURL('image/jpeg', 0.82);
  savePhotos();
}

// ---------- 時間と成長 ----------
const thresholds = [[38, 'eyes'], [46, 'yochi'], [365, 'otona']];
function grow(k, dt) {
  const d0 = k.d.day;
  const ok = k.d.hunger > 12 ? 1 : 0.3;
  k.d.day += dt / secPerDay() * ok;
  const d = k.d.day;
  // メーター（実時間で減る。はやい設定ほど少し早く）
  const f = { real: 0.5, slow: 0.8, normal: 1, fast: 1.6, turbo: 2, super: 2.2, dev1: 2.2, dev2: 2.2 }[R.speed] || 1;
  const sleeping = k.st.name === 'sleep' || k.st.name === 'wrap';
  k.d.hunger = Math.max(0, k.d.hunger - dt * f * (d < 38 ? 100 / 360 : 100 / 480));
  if (!sleeping) k.d.energy = Math.max(0, k.d.energy - dt * f * (d < 46 ? 100 / 300 : 100 / 600));
  k.d.clean = Math.max(0, k.d.clean - dt * f * 100 / 1500);
  k.d.aff = Math.max(0, k.d.aff - dt * f * 100 / 5400);
  for (const [th, id] of thresholds) if (d0 < th && d >= th) unlock(id, k);
  const s0 = stageAt(d0), s1 = stageAt(d);
  if (s0 !== s1) { toast(`${k.d.name}が「${s1.name}」になりました`, true); A.fanfare(); }
  if (d0 < 50 && d >= 50 && kids[0] === k) toast('💧 たらいを用意しました（水あそびができます）');
  if (d0 < 100 && d >= 100 && kids[0] === k) toast('🏊 大きなプールに引っこしました');
  for (const it of ROOM_ITEMS) if (d0 < it.day && d >= it.day && kids[0] === k) { setTimeout(() => { toast(`🏠 お部屋に「${it.icon} ${it.name}」が来ました！`, true); A.fanfare(); }, 1200); }
  k.ageT -= dt;
  if (k.ageT < 0) { k.ageT = 0.5; k.o.setAge(d); }
}
function updatePool() {
  const d = Math.max(...kids.map(k => k.d.day));
  const on = d >= 50, big = d >= 100;
  if (on !== world.poolOn || big !== world.poolBig) world.setPool(on, big);
  const rd = Math.floor(d); if (rd !== world.roomDay) { world.roomDay = rd; world.setRoom(d); }
}

// かさなりねんね
function updateStack(dt) {
  if (kids.length < 2) return;
  const [a, b] = kids;
  const both = a.st.name === 'sleep' && b.st.name === 'sleep' && inBed(a) && inBed(b);
  if (both && !b.stack && !a.stack && a.st.t > 1.5 && b.st.t > 1.5 && a.d.day >= 30) {
    b.stack = a; b.o.want = 'sleepLie'; a.o.want = 'sleepLie';
    b.stackT = 0;
  }
  if (b.stack) {
    if (!both) { b.stack = null; return; }
    b.stackT += dt;
    const target = a.pos.clone().add(fwd(a).multiplyScalar(size(a) * 0.12));
    b.pos.lerp(target, Math.min(1, dt * 2));
    let da = a.yaw + 0.25 - b.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); b.yaw += da * Math.min(1, dt * 2);
    if (b.stackT > 3) unlock('kasanari', b);
  }
}

// ---------- 画面 ----------
let toastN = 0;
function toast(msg, big) {
  const t = document.createElement('div'); t.className = 'toast' + (big ? ' big' : ''); t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), big ? 3000 : 2200);
  setTimeout(() => t.remove(), big ? 3500 : 2700);
}
let talkT = 0;
function talk(k, s) { if (k !== K()) return; $('#bubble').textContent = s; talkT = 3; }
function mood(k) {
  const d = k.d, st = k.st.name;
  if (st === 'sleep') return R.night ? 'すぴー…（夜はぐっすり）' : 'すやすや…';
  if (st === 'swim') return d.day < 63 ? 'ぱしゃぱしゃ！' : 'スイスイ〜';
  if (st === 'call') return 'ピィピィ！（おなかすいたよ）';
  if (d.hunger < 25) return 'おなかがすいてるみたい';
  if (d.energy < 25) return 'ねむそう…';
  if (d.clean < 25) return '毛がぼさぼさ。水あそびしたいかも';
  if (st === 'pet') return 'もっとなでて〜';
  if (d.day < 38) return '目はまだ閉じている。ほとんど寝ています';
  if (d.aff > 80) return 'あなたのことが大好き';
  return k.persona.line;
}
function fmtAge(d) {
  if (d < 60) return `生後 ${Math.floor(d)}日`;
  if (d < 365) return `生後 ${Math.floor(d / 30.4)}か月（${Math.floor(d)}日）`;
  const y = Math.floor(d / 365), m = Math.floor((d - y * 365) / 30.4);
  return `${y}歳${m ? m + 'か月' : ''}`;
}
function hud() {
  const k = K(); if (!k) return;
  const d = k.d.day, st = stageAt(d);
  $('#name').textContent = k.d.name;
  $('#sex').textContent = k.d.sex === 'オス' ? '♂' : '♀';
  $('#stage').textContent = st.name;
  $('#age').textContent = fmtAge(d);
  $('#len').textContent = lengthAt(d).toFixed(0) + 'cm';
  const w = weightAt(d); $('#wt').textContent = w < 1000 ? Math.round(w) + 'g' : (w / 1000).toFixed(2) + 'kg';
  $('#trait').textContent = `毛色：${k.o.tr.coat.name}・顔：${FACES.find(f => f.id === k.o.tr.face)?.name}・性格：${k.persona.name}`;
  for (const [id, v] of [['hunger', k.d.hunger], ['energy', k.d.energy], ['clean', k.d.clean], ['aff', k.d.aff]]) {
    const el = $('#m-' + id); el.style.width = v.toFixed(0) + '%';
    el.style.background = id === 'aff' ? '#ff8fb1' : v < 25 ? '#ff9f5a' : v < 50 ? '#ffd166' : '#7bd88f';
    const mb = $('#mb-' + id); mb.style.background = el.style.background; mb.style.opacity = 0.35 + v / 154;
  }
  if (talkT <= 0) $('#bubble').textContent = mood(k);
  $('#switch').hidden = kids.length < 2;
  if (kids.length > 1) $('#switch').textContent = '⇄ ' + kids[(active + 1) % kids.length].d.name;
  $('#pace').textContent = SPEEDS[R.speed].name;
  // ボタンの出し入れ
  $('#spd').textContent = SPEEDS[R.speed].s;
  $('#btn-wrap').classList.toggle('on', k.st.name === 'wrap');
}

function closeSheets() { document.querySelectorAll('.sheet').forEach(s => s.classList.remove('open')); }
function openSheet(id) { const s = $(id), was = s.classList.contains('open'); closeSheets(); if (!was) s.classList.add('open'); }

function buildFoodSheet() {
  const k = K(), d = k.d.day, list = $('#food-list'); list.innerHTML = '';
  for (const f of FOODS) {
    const okAge = d >= f.from && (f.to == null || d <= f.to);
    const b = document.createElement('button'); b.className = 'item' + (okAge ? ' good' : '');
    b.innerHTML = `<span class="ic">${f.icon}</span><span><b>${f.name}</b><small>${okAge ? f.note : (d < f.from ? `生後${f.from}日から` : 'もう卒業')}</small></span>`;
    b.onclick = () => okAge ? feed(f.id) : toast(d < f.from ? `${f.name}は生後${f.from}日から` : `${f.name}はもう卒業しました`);
    list.appendChild(b);
  }
}
function buildToySheet() {
  const k = K(), d = k.d.day, list = $('#toy-list'); list.innerHTML = '';
  for (const t of TOYS) {
    const okAge = d >= t.from;
    const b = document.createElement('button'); b.className = 'item' + (okAge ? ' good' : '');
    b.innerHTML = `<span class="ic">${t.icon}</span><span><b>${t.name}</b><small>${okAge ? t.note : `生後${t.from}日から`}</small></span>`;
    b.onclick = () => okAge ? play(t.id) : toast(`${t.name}は生後${t.from}日から`);
    list.appendChild(b);
  }
}

function updateZukanBadge() {
  const n = ZUKAN.filter(z => R.zukan[z.id]).length;
  $('#zk-count').textContent = `${n}/${ZUKAN.length}`;
}
let zTab = 'list';
function openZukan(tab = zTab) {
  zTab = tab;
  closeSheets();
  $('#zukan').hidden = false;
  document.querySelectorAll('#zukan .tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const body = $('#zk-body'); body.innerHTML = '';
  if (tab === 'list') {
    const n = ZUKAN.filter(z => R.zukan[z.id]).length;
    body.insertAdjacentHTML('beforeend', R.complete ? `<div class="zk-done">🎉 図鑑コンプリート！ <button id="zk-album">📸 思い出アルバムを見る</button></div>` : `<p class="zk-sum">見つけたできごと <b>${n}</b> / ${ZUKAN.length}</p>`);
    $('#zk-album')?.addEventListener('click', () => { $('#zukan').hidden = true; playAlbum(); });
    const grid = document.createElement('div'); grid.className = 'zk-grid'; body.appendChild(grid);
    ZUKAN.forEach((z, i) => {
      const got = R.zukan[z.id];
      const c = document.createElement('button'); c.className = 'zk-card' + (got ? ' got' : '');
      c.innerHTML = got
        ? `${PHOTOS[z.id] ? `<img src="${PHOTOS[z.id]}" alt="">` : `<div class="ph">${z.icon}</div>`}<div class="nm">No.${i + 1} ${z.name}</div>`
        : `<div class="ph q">？</div><div class="nm">No.${i + 1} ？？？</div><div class="hint">ヒント：${z.hint}</div>`;
      c.onclick = () => got && showCard(z, i);
      grid.appendChild(c);
    });
  } else if (tab === 'grow') {
    const k = K(), d = k.d.day;
    let h = `<div class="grow-now"><b>${k.d.name}</b>　${fmtAge(d)}　全長 ${lengthAt(d).toFixed(0)}cm・体重 ${(weightAt(d) / 1000).toFixed(2)}kg</div><canvas id="gchart" width="640" height="260"></canvas><ol class="stages">`;
    for (const s of STAGES) h += `<li class="${d >= s.from ? 'done' : ''}"><b>${s.name}</b>（${s.from}日〜）<br><small>${s.note}</small></li>`;
    body.innerHTML = h + '</ol>';
    drawChart($('#gchart'), d);
  } else {
    body.innerHTML = `<p class="law">${LAW_NOTE}</p><h4>参考にした資料</h4><ul class="src">${SOURCES.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${t}</a></li>`).join('')}</ul>
      <p class="small">成長の数字は、動物園・水族館の記録や図鑑の値の「だいたい真ん中」です。カワウソの見た目は、いただいた赤ちゃんカワウソの動画（大きな黒い目・ピンクの鼻・白い口まわり・頭のアホ毛）を参考に作りました。</p>`;
  }
}
function drawChart(cv, now) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, maxD = 400, maxW = 3500;
  g.fillStyle = '#fff8ef'; g.fillRect(0, 0, W, H);
  const X = d => 40 + d / maxD * (W - 60), Y = w => H - 30 - w / maxW * (H - 50);
  g.strokeStyle = '#e5d6c4'; g.fillStyle = '#9b8672'; g.font = '12px sans-serif';
  for (let w = 0; w <= 3000; w += 1000) { g.beginPath(); g.moveTo(40, Y(w)); g.lineTo(W - 20, Y(w)); g.stroke(); g.fillText(w / 1000 + 'kg', 4, Y(w) + 4); }
  for (let d = 0; d <= 360; d += 60) g.fillText(d + '日', X(d) - 10, H - 10);
  g.strokeStyle = '#c98b5a'; g.lineWidth = 3; g.beginPath();
  for (let d = 0; d <= maxD; d += 4) { const p = [X(d), Y(weightAt(d))]; d ? g.lineTo(...p) : g.moveTo(...p); }
  g.stroke();
  const dd = Math.min(now, maxD);
  g.fillStyle = '#e8577a'; g.beginPath(); g.arc(X(dd), Y(weightAt(dd)), 7, 0, 7); g.fill();
}
function showCard(z, i) {
  const got = R.zukan[z.id];
  $('#card').hidden = false;
  $('#card-body').innerHTML = `${PHOTOS[z.id] ? `<img src="${PHOTOS[z.id]}" alt="">` : `<div class="ph big">${z.icon}</div>`}
    <h3>No.${i + 1} ${z.icon} ${z.name}</h3><p class="meta">${got.name}・生後${got.day}日・${new Date(got.t).toLocaleDateString('ja-JP')}</p><p>${z.desc}</p>`;
}

function switchTo(i) {
  if (i === active || !kids[i]) return;
  active = i; cam.init = false; hud();
}

// ---------- はじめる ----------
let pickedCoat = '';
function startScreen() {
  $('#intro').hidden = false;
  const inp = $('#in-name'); inp.value = pick(NAMES);
  $('#in-name2').value = pick(NAMES.filter(n => n !== inp.value));
  $('#in-two').onchange = () => { $('#row2').hidden = !$('#in-two').checked; };
  const sw = $('#coats'); sw.innerHTML = '';
  for (const c of [{ id: '', name: 'おまかせ', main: '' }, ...COATS]) {
    const b = document.createElement('button'); b.className = 'coat' + (c.id === pickedCoat ? ' on' : '');
    b.innerHTML = `<i style="background:${c.main ? `linear-gradient(135deg, ${c.main} 55%, ${c.cream} 55%)` : 'conic-gradient(#a38c79 0 25%, #6c5142 0 50%, #857b74 0 75%, #8f6649 0)'}"></i>${c.name}`;
    b.onclick = () => { pickedCoat = c.id; sw.querySelectorAll('.coat').forEach(x => x.classList.toggle('on', x === b)); };
    sw.appendChild(b);
  }
  $('#btn-start').onclick = () => {
    A.unlock();
    const n1 = inp.value.trim() || 'こつめ';
    R = { v: 1, speed: 'normal', sound: true, kids: [newKid(n1, 0, pickedCoat ? { coat: pickedCoat } : {})], zukan: {}, night: false, last: Date.now(), made: Date.now() };
    if ($('#in-two').checked) { const n2 = $('#in-name2').value.trim() || 'もなか'; const b = newKid(n2); b.born = R.kids[0].born; R.kids.push(b); }
    $('#intro').hidden = true;
    boot();
    setTimeout(() => unlock('birth', kids[0]), 1500);
    toast('生まれたての赤ちゃんがやってきました。まずはミルクから。', true);
  };
}

function offline() {
  const gone = (Date.now() - (R.last || Date.now())) / 1000;
  if (gone < 30) return;
  const days = Math.min(gone / secPerDay(), 2) * 0.7;
  for (const d of R.kids) {
    d.day += days;
    d.hunger = Math.max(25, d.hunger - gone / 60);
    d.energy = Math.min(100, d.energy + 30);
    d.clean = Math.max(30, d.clean - gone / 120);
    d.aff = Math.max(10, d.aff - gone / 600);
  }
  if (days > 0.05) setTimeout(() => toast(`おかえりなさい。留守のあいだに ${days < 1 ? Math.round(days * 24) + '時間' : days.toFixed(1) + '日'} すすみました`), 800);
}

let booted = false;
function boot() {
  offline();
  for (const d of R.kids) spawnKid(d);
  active = 0;
  booted = true;
  $('#hud').hidden = $('#bottom').hidden = $('#topbtns').hidden = false;
  if (innerWidth < 520) $('#hud').classList.add('mini');
  A.setOn(R.sound !== false);
  $('#btn-snd').textContent = R.sound !== false ? '🔊' : '🔈';
  updatePool();
  updateZukanBadge();
  if (R.night) setNight(true);
  // 画面のボタン
  $('#btn-food').onclick = () => { buildFoodSheet(); openSheet('#food-sheet'); };
  $('#btn-play').onclick = () => { buildToySheet(); openSheet('#toy-sheet'); };
  $('#btn-speed').onclick = () => {
    const ids = Object.keys(SPEEDS); R.speed = ids[(ids.indexOf(R.speed) + 1) % ids.length];
    toast('時間の速さ：' + SPEEDS[R.speed].name); save(); hud();
  };
  $('#btn-wrap').onclick = () => { closeSheets(); wrapUp(); };
  $('#btn-night').onclick = () => { closeSheets(); setNight(!R.night); };
  $('#btn-zukan').onclick = () => openZukan('list');
  $('#btn-set').onclick = () => { buildSettings(); openSheet('#set-sheet'); };
  $('#btn-snd').onclick = () => { R.sound = !(R.sound !== false); A.setOn(R.sound); $('#btn-snd').textContent = R.sound ? '🔊' : '🔈'; };
  $('#switch').onclick = () => switchTo((active + 1) % kids.length);
  $('#hud .top').onclick = e => { if (e.target.closest('#switch')) return; $('#hud').classList.toggle('mini'); };
  document.querySelectorAll('.sheet .x').forEach(b => b.onclick = closeSheets);
  document.querySelectorAll('#zukan .tabs button').forEach(b => b.onclick = () => openZukan(b.dataset.tab));
  $('#zk-close').onclick = () => { $('#zukan').hidden = true; };
  $('#card').onclick = () => { $('#card').hidden = true; };
  $('#al-close').onclick = closeAlbum;
}

function buildSettings() {
  const box = $('#set-body'); box.innerHTML = '';
  const sp = document.createElement('div'); sp.className = 'row';
  sp.innerHTML = '<b>時間の速さ</b>';
  for (const [id, s] of Object.entries(SPEEDS)) {
    const b = document.createElement('button'); b.textContent = s.name; b.className = R.speed === id ? 'on' : '';
    b.onclick = () => { R.speed = id; buildSettings(); save(); };
    sp.appendChild(b);
  }
  box.appendChild(sp);
  const nm = document.createElement('div'); nm.className = 'row';
  nm.innerHTML = `<b>名前</b><input id="rename" value="${K().d.name}" maxlength="10"><button id="rename-ok">変える</button>`;
  box.appendChild(nm);
  nm.querySelector('#rename-ok').onclick = () => { const v = $('#rename').value.trim(); if (v) { K().d.name = v; save(); hud(); toast('名前を変えました'); } };
  // 毛色をかえる（いま見ている子）
  {
    const k = K(), cur = k.o.tr.coat.id;
    const cr = document.createElement('div'); cr.className = 'row';
    cr.innerHTML = '<b>毛色をかえる</b>';
    for (const c of COATS) {
      const b = document.createElement('button'); b.className = 'coat' + (c.id === cur ? ' on' : '');
      b.innerHTML = `<i style="background:linear-gradient(135deg, ${c.main} 55%, ${c.cream} 55%)"></i>${c.name}`;
      b.onclick = () => {
        k.d.look = { ...(k.d.look || { face: 'mask', nose: 'rose', iris: 'choco', tuft: 'tuft' }), coat: c.id };
        k.o.tr = makeTraits(k.d.seed, k.d.look); k.o.setCrown(!!R.crown); k.o.setAge(k.d.day, true);
        save(); hud(); buildSettings(); toast(`毛色を「${c.name}」にしました`);
      };
      cr.appendChild(b);
    }
    box.appendChild(cr);
  }
  if (kids.length < 2) {
    const sb = document.createElement('div'); sb.className = 'row';
    sb.innerHTML = `<b>きょうだい</b><small>コツメカワウソは家族でくらす動物。同じ日に生まれたきょうだいを迎えられます。</small><input id="sib" value="${pick(NAMES.filter(n => n !== K().d.name))}" maxlength="10"><button id="sib-ok">迎える</button>`;
    box.appendChild(sb);
    sb.querySelector('#sib-ok').onclick = () => {
      const d = newKid($('#sib').value.trim() || 'もなか', K().d.day);
      d.born = K().d.born; d.x = K().pos.x + 0.1; d.z = K().pos.z + 0.05;
      R.kids.push(d); spawnKid(d); save(); closeSheets(); toast(`${d.name}がやってきました`, true);
    };
  }
  if (R.complete) {
    const cr = document.createElement('div'); cr.className = 'row';
    cr.innerHTML = `<b>🌸 花かんむり（コンプリートのごほうび）</b><button id="crown">${R.crown ? 'はずす' : 'つける'}</button><button id="album2">📸 思い出アルバム</button>`;
    box.appendChild(cr);
    cr.querySelector('#crown').onclick = () => { R.crown = !R.crown; kids.forEach(k => k.o.setCrown(R.crown)); save(); buildSettings(); };
    cr.querySelector('#album2').onclick = () => { closeSheets(); playAlbum(); };
  }
  const dv = document.createElement('div'); dv.className = 'row dev';
  dv.innerHTML = '<b>🛠 開発用（確認のため）</b><small>成長や図鑑の完成を早く確かめる時に使います。ふつうに遊ぶ時は使わなくて大丈夫です。</small>';
  const devBtn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = () => fn(b); dv.appendChild(b); };
  devBtn('1日＝2秒', () => { R.speed = 'dev1'; save(); hud(); buildSettings(); toast('時間の速さ：' + SPEEDS.dev1.name); });
  devBtn('1日＝0.5秒', () => { R.speed = 'dev2'; save(); hud(); buildSettings(); toast('時間の速さ：' + SPEEDS.dev2.name); });
  devBtn('＋10日', () => jumpDays(10));
  devBtn('＋100日', () => jumpDays(100));
  devBtn('1歳にする', () => jumpDays(Math.max(0, 365 - K().d.day)));
  devBtn('メーター満タン', () => { for (const k of kids) Object.assign(k.d, { hunger: 100, energy: 100, clean: 100 }); hud(); toast('おなか・げんき・きれいを満タンにしました'); });
  devBtn('なかよしMAX', () => { for (const k of kids) k.d.aff = 100; hud(); toast('なかよし度をMAXにしました'); });
  let armedAll = false;
  devBtn('図鑑を全部ひらく', b => {
    if (!armedAll) { armedAll = true; b.textContent = 'もう一度押すと全部ひらきます'; return; }
    closeSheets(); unlockAll();
  });
  box.appendChild(dv);
  const rs = document.createElement('div'); rs.className = 'row';
  rs.innerHTML = '<b>はじめから</b><button id="reset">記録を消して最初から</button>';
  box.appendChild(rs);
  let armed = false;
  rs.querySelector('#reset').onclick = e => {
    if (!armed) { armed = true; e.target.textContent = 'もう一度押すと本当に消えます'; return; }
    resetting = true; localStorage.removeItem(KEY); localStorage.removeItem(PHOTO_KEY); location.reload();
  };
}

// ---------- 開発用 ----------
function jumpDays(n) {
  for (const k of kids) {
    const d0 = k.d.day; k.d.day += n; k.o.setAge(k.d.day, true);
    for (const [th, id] of thresholds) if (d0 < th && k.d.day >= th) unlock(id, k);
  }
  updatePool(); hud(); save();
  toast(`${n.toFixed(0)}日すすめました（${fmtAge(K().d.day)}）`);
}
function unlockAll() {
  const k = K(); let i = 0;
  for (const z of ZUKAN) {
    if (R.zukan[z.id]) continue;
    R.zukan[z.id] = { t: Date.now(), day: Math.floor(k.d.day), name: k.d.name };
    photoQ.push({ id: z.id, k, at: performance.now() + 300 + i * 120, cam: z.cam }); i++;
  }
  updateZukanBadge(); save();
  toast(`図鑑を${i}こ ひらきました（確認用）`, true);
  checkComplete();
}

// ---------- 図鑑コンプリート ----------
function checkComplete() {
  if (!R || R.complete || ZUKAN.some(z => !R.zukan[z.id])) return;
  R.complete = Date.now(); R.crown = true;
  kids.forEach(k => k.o.setCrown(true));
  save();
  setTimeout(showComplete, 2600);
}
function showComplete() {
  A.fanfare();
  const names = kids.map(k => k.d.name).join('と');
  const days = Math.floor(Math.max(...kids.map(k => k.d.day)));
  $('#complete-body').innerHTML = `<div class="cp-crown">🌸👑🌸</div><h2>図鑑コンプリート！</h2>
    <p>${names}といっしょに見つけた ${ZUKAN.length}このできごとが、ぜんぶそろいました。<br>生後${days}日。ここまでたくさんお世話してくれて、ありがとう。</p>
    <p class="cp-gift">🎁 ごほうび：<b>花かんむり</b>をつけてあげました（設定ではずせます）</p>
    <div class="cp-grid">${ZUKAN.map(z => PHOTOS[z.id] ? `<img src="${PHOTOS[z.id]}" alt="">` : `<div class="ph">${z.icon}</div>`).join('')}</div>
    <div class="cp-btns"><button id="cp-album">📸 思い出アルバムを見る</button><button id="cp-close">とじる</button></div>`;
  $('#complete').hidden = false;
  $('#cp-album').onclick = () => { $('#complete').hidden = true; playAlbum(); };
  $('#cp-close').onclick = () => { $('#complete').hidden = true; };
  confetti();
}
function confetti() {
  const cv = $('#confetti'), g = cv.getContext('2d');
  cv.width = innerWidth; cv.height = innerHeight; cv.hidden = false;
  const cols = ['#ff8fb1', '#ffd166', '#8ec9e8', '#7bd88f', '#f2b48a', '#ffffff'];
  const P = Array.from({ length: 160 }, () => ({ x: Math.random() * cv.width, y: -Math.random() * cv.height, vx: rnd(-40, 40), vy: rnd(80, 200), r: rnd(0, 6), vr: rnd(-6, 6), w: rnd(6, 12), h: rnd(8, 16), c: pick(cols) }));
  let t0 = performance.now(), last = t0;
  const step = now => {
    const dt = (now - last) / 1000; last = now;
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of P) { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
    if (now - t0 < 6000) requestAnimationFrame(step); else { g.clearRect(0, 0, cv.width, cv.height); cv.hidden = true; }
  };
  requestAnimationFrame(step);
}
// 思い出アルバム：図鑑の写真をゆっくりズームしながら順に見せ、最後にメッセージ
let albumRun = 0;
function playAlbum() {
  const list = ZUKAN.filter(z => R.zukan[z.id]);
  const box = $('#album'), img = $('#al-img'), cap = $('#al-cap');
  const run = ++albumRun;
  box.hidden = false; box.classList.remove('end');
  A.albumMusic(true);
  const name = kids.map(k => k.d.name).join('、');
  let i = 0;
  const next = () => {
    if (run !== albumRun) return;
    if (i >= list.length) {
      box.classList.add('end');
      cap.innerHTML = `<div class="al-end">よくここまで育ったね。<br>ありがとう、${name}。<br><button id="al-again">もう一度見る</button></div>`;
      img.style.opacity = 0;
      $('#al-again').onclick = () => playAlbum();
      return;
    }
    const z = list[i], got = R.zukan[z.id], idx = ZUKAN.indexOf(z) + 1;
    img.style.opacity = 0;
    setTimeout(() => {
      if (run !== albumRun) return;
      img.src = PHOTOS[z.id] || '';
      img.classList.remove('kb'); void img.offsetWidth; img.classList.add('kb');
      img.style.setProperty('--kx', (i % 2 ? -3 : 3) + '%');
      img.style.opacity = PHOTOS[z.id] ? 1 : 0;
      cap.innerHTML = `<div class="al-no">No.${idx}</div><div class="al-name">${z.icon} ${z.name}</div><div class="al-day">${got.name}・生後${got.day}日</div>`;
    }, 450);
    i++;
    setTimeout(next, 3200);
  };
  next();
}
function closeAlbum() { albumRun++; $('#album').hidden = true; A.albumMusic(false); }

// ---------- ループ ----------
let last = performance.now(), T = 0, hudT = 0, saveT = 0;
function frame(dtIn) {
  const dt = Math.min(0.05, dtIn);
  T += dt;
  if (booted) {
    for (const k of kids) grow(k, dt);
    updatePool();
    for (const k of kids) think(k, dt);
    updateStack(dt);
    for (const k of kids) { expr(k, dt); place(k, dt); k.o.update(dt); placeSay(k); }
    updateProps(dt);
    world.night += ((R.night ? 1 : 0) - world.night) * Math.min(1, dt * 1.5);
    for (const k of kids) k.o.mat.uniforms.uDim.value = 1;
    updateCamera(dt);
    talkT -= dt;
    hudT -= dt; if (hudT < 0) { hudT = 0.25; hud(); }
    saveT -= dt; if (saveT < 0) { saveT = 5; save(); }
  } else {
    cam.yaw += dt * 0.1;
  }
  world.update(dt, T);
  if (photoQ.length && performance.now() > photoQ[0].at) takePhoto(photoQ.shift());
  renderer.render(scene, camera);
}
function loop(now) {
  if (window.__pause) renderer.render(scene, camera); else frame((now - last) / 1000);
  last = now;
  requestAnimationFrame(loop);
}

addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('beforeunload', save);

load();
if (R && R.kids?.length) boot(); else { camera.position.set(0.3, 0.5, 1.2); camera.lookAt(BED); startScreen(); }
requestAnimationFrame(loop);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

// 確認用
window.__k = {
  get R() { return R; }, kids, world, camera, cam,
  frame: (dt = 1 / 30, n = 1) => { for (let i = 0; i < n; i++) frame(dt); },
  setDay(d) { for (const k of kids) { k.d.day = d; k.o.setAge(d, true); } updatePool(); },
  set: (k, name, data) => setState(kids[k], name, data), unlock: id => unlock(id, K()), feed, play, finger, wrapUp, setNight,
  unlockAll, jumpDays, showComplete, playAlbum, callTo,
  reset() { resetting = true; localStorage.removeItem(KEY); localStorage.removeItem(PHOTO_KEY); },
};
