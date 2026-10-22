// お部屋：床・窓・ねどこ（かご＋白い毛布）・たらい／プール・ごはん皿・おもちゃ・手と指・哺乳びん・ブランケット
import * as THREE from 'three';
import { LIGHT } from './fur.js';

const rnd = (a, b) => a + Math.random() * (b - a);

function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 4;
  return t;
}

// 部屋の広さ（カワウソが歩ける範囲）
export const ROOM = { x0: -3.05, x1: 3.05, z0: -2.45, z1: 2.3 };
export const PLANT = new THREE.Vector3(3.0, 0, -2.5);
export const BED = new THREE.Vector3(-1.75, 0, -1.55);
export const BED_R = 0.36;
export const POOL = new THREE.Vector3(1.55, 0, -1.3);
export const BOWL = new THREE.Vector3(0.35, 0, 0.6);
// 遊び場の位置
export const TUNNEL = { a: new THREE.Vector3(-2.7, 0, 1.75), b: new THREE.Vector3(-1.55, 0, 1.75), r: 0.23 };
export const SLIDE_DIR = new THREE.Vector3(0.24, 0, 1).normalize();
export const SLIDE = {
  top: POOL.clone().addScaledVector(SLIDE_DIR, 1.15), h: 0.62,
  bottom: POOL.clone().addScaledVector(SLIDE_DIR, 0.42),
  ladder: null,
};
SLIDE.ladder = SLIDE.top.clone().addScaledVector(SLIDE_DIR, 0.6);   // 台のうしろ（プールと反対側）に一直線
export const SAND = { c: new THREE.Vector3(-0.35, 0, 1.75), w: 0.7, d: 0.5, h: 0.035 };
export const HAMMOCK = { c: new THREE.Vector3(-2.35, 0, -0.55), len: 0.86, w: 0.4, top: 0.34, sag: 0.11 };
// ハンモックへ登るスロープ（部屋の手前側の端から、布の端へ）
HAMMOCK.rampTop = HAMMOCK.c.clone().add(new THREE.Vector3(0, 0, HAMMOCK.len / 2 - 0.04));
HAMMOCK.rampBase = HAMMOCK.c.clone().add(new THREE.Vector3(0, 0, HAMMOCK.len / 2 + 0.62));
export const STUMP = { c: new THREE.Vector3(-0.1, 0, -2.15), r: 0.22, h: 0.32, ramp: new THREE.Vector3(-0.72, 0, -1.8) };

export class World {
  constructor(renderer) {
    this.scene = new THREE.Scene();
    const sc = this.scene;
    sc.background = new THREE.Color('#d9cfc4');
    sc.fog = new THREE.Fog('#d9cfc4', 7, 14);
    // 目に映り込む部屋の明かり
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: '#8d857c', side: THREE.BackSide })));
    const w = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.5), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    w.position.set(-2, 4, 7); w.lookAt(0, 0, 0); env.add(w);
    const w2 = w.clone(); w2.scale.setScalar(0.5); w2.position.set(5, 3, 3); w2.lookAt(0, 0, 0); env.add(w2);
    sc.environment = new THREE.PMREMGenerator(renderer).fromScene(env, 0.02).texture;
    sc.environmentIntensity = 0.8;

    this.hemi = new THREE.HemisphereLight('#fff6ea', '#8a7060', 1.25); sc.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1dc', 2.0); this.sun.position.set(-1.2, 3, 2.2); sc.add(this.sun);
    this.lamp = new THREE.PointLight('#ffb36b', 0, 4, 1.5); this.lamp.position.set(-1.6, 1.0, 0.6); sc.add(this.lamp);
    LIGHT.dir.copy(this.sun.position).normalize();

    this.buildRoom();
    this.buildBed();
    this.buildPool();
    this.buildBowl();
    this.buildToys();
    this.buildHand();
    this.buildPlay();
    this.foods = [];
    this.splashes = [];
    this.pings = [];
    this.night = 0;
    this.poolBig = false;
    this.setPool(false, false);
  }

  buildRoom() {
    const sc = this.scene;
    const wood = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#c9a77f'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) {
        const y = i * h / 8;
        g.fillStyle = `hsl(30, ${30 + Math.random() * 10}%, ${58 + Math.random() * 8}%)`;
        g.fillRect(0, y + 1, w, h / 8 - 2);
        for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(110,70,40,${Math.random() * 0.12})`; g.beginPath(); const yy = y + Math.random() * h / 8; g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + rnd(-3, 3), w * 0.6, yy + rnd(-3, 3), w, yy + rnd(-2, 2)); g.stroke(); }
        g.fillStyle = 'rgba(80,50,30,.35)'; g.fillRect(0, y, w, 1.5);
        g.fillRect(((i * 0.37) % 1) * w, y, 1.5, h / 8);
      }
    }, [5, 5]);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75 }));
    floor.rotation.x = -Math.PI / 2; sc.add(floor);
    // ラグ
    const rug = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = '#efe7dc'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${200 + Math.random() * 40},${190 + Math.random() * 30},${175 + Math.random() * 30},.5)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.strokeStyle = 'rgba(230,170,170,.6)'; g.lineWidth = 10;
      for (let r = 60; r < 256; r += 50) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, Math.PI * 2); g.stroke(); }
    });
    const rg = new THREE.Mesh(new THREE.CircleGeometry(1.5, 64), new THREE.MeshStandardMaterial({ map: rug, roughness: 1 }));
    rg.rotation.x = -Math.PI / 2; rg.position.set(0.2, 0.002, 0.45); sc.add(rg);
    // かべ
    const wallMat = new THREE.MeshStandardMaterial({ color: '#efe6da', roughness: 0.95 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 3), wallMat); back.position.set(0, 1.5, -2.8); sc.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), wallMat); left.position.set(-3.4, 1.5, 0.5); left.rotation.y = Math.PI / 2; sc.add(left);
    const right = left.clone(); right.position.x = 3.4; right.rotation.y = -Math.PI / 2; sc.add(right);
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: '#b08a66' })); base.position.set(0, 0.04, -2.79); sc.add(base);
    // まど（明るい光）
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), new THREE.MeshBasicMaterial({ color: '#fffaf0' }));
    win.position.set(-0.5, 1.3, -2.785); sc.add(win); this.win = win;
    const fr = new THREE.MeshStandardMaterial({ color: '#f7f3ee' });
    for (const [x, y, ww, hh] of [[-0.5, 1.8, 1.4, 0.05], [-0.5, 0.8, 1.4, 0.05], [-1.17, 1.3, 0.05, 1.05], [0.17, 1.3, 0.05, 1.05], [-0.5, 1.3, 0.04, 1.0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, 0.04), fr); b.position.set(x, y, -2.77); sc.add(b);
    }
    // カーテン
    const cur = new THREE.MeshStandardMaterial({ color: '#f1d9d6', roughness: 1, side: THREE.DoubleSide });
    for (const x of [-1.35, 0.35]) {
      const g = new THREE.PlaneGeometry(0.35, 1.4, 20, 1); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 50) * 0.025);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, cur); m.position.set(x, 1.25, -2.73); sc.add(m);
    }
    // 植木とぬいぐるみ（にぎやかし）
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.2, 24), new THREE.MeshStandardMaterial({ color: '#d9b28c' }));
    pot.position.set(PLANT.x, 0.1, PLANT.z); sc.add(pot);
    for (let i = 0; i < 9; i++) {
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: '#6c9a62', roughness: 0.8 }));
      lf.scale.set(0.5, 1.4, 0.2); const a = i / 9 * Math.PI * 2;
      lf.position.set(PLANT.x + Math.cos(a) * 0.08, 0.35 + (i % 3) * 0.06, PLANT.z + Math.sin(a) * 0.08); lf.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5); sc.add(lf);
    }
    // 影（丸いぼかし）
    this.shadowTex = canvasTex(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(40,25,15,.55)'); gr.addColorStop(1, 'rgba(40,25,15,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    this.shadowTex.colorSpace = THREE.NoColorSpace;
  }

  makeShadow(r) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(r * 2, r * 2, 1); m.renderOrder = 1;
    this.scene.add(m);
    return m;
  }

  buildBed() {
    const g = new THREE.Group(); g.position.copy(BED); this.scene.add(g);
    const weave = canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#b98d5e'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 16) {
        c.fillStyle = ((x / 16 + y / 8) % 2) ? '#a77a4c' : '#cfa274'; c.fillRect(x, y, 16, 7);
      }
    }, [6, 1]);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(BED_R, BED_R * 0.92, 0.075, 48, 1, true), new THREE.MeshStandardMaterial({ map: weave, roughness: 0.9, side: THREE.DoubleSide }));
    wall.position.y = 0.0375; g.add(wall);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(BED_R, 0.018, 10, 48), new THREE.MeshStandardMaterial({ color: '#a57a4f', roughness: 0.9 }));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.075; g.add(rim);
    // もこもこの白い毛布
    const bg = new THREE.CircleGeometry(BED_R * 0.97, 64, 0, Math.PI * 2);
    const sg = new THREE.PlaneGeometry(BED_R * 2, BED_R * 2, 60, 60);
    const p = sg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y) / BED_R;
      const fold = Math.sin(x * 22 + Math.sin(y * 9) * 2) * 0.012 + Math.sin(y * 17 - x * 5) * 0.01;
      const h = r < 1 ? 0.045 + fold + Math.pow(r, 4) * 0.06 : 0.0;
      p.setZ(i, r < 1.02 ? h : -0.05);
    }
    sg.computeVertexNormals();
    const fluffy = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#f6f2ea'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = 225 + Math.random() * 30; c.fillStyle = `rgba(${v},${v - 4},${v - 10},.6)`; c.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    }, [3, 3]);
    const blanket = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: fluffy, roughness: 1, color: '#ffffff' }));
    blanket.rotation.x = -Math.PI / 2; g.add(blanket);
    bg.dispose();
    this.bedShadow = this.makeShadow(BED_R * 1.25); this.bedShadow.position.set(BED.x, 0.003, BED.z);
  }

  // ---------- 月齢で増える遊び場 ----------
  buildPlay() {
    const sc = this.scene, std = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
    this.play = {};
    // トンネル（ポップアップ式の布トンネル）
    {
      const g = new THREE.Group(), L = TUNNEL.b.x - TUNNEL.a.x;
      const stripe = canvasTex(256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#8fd0c8' : '#f6e7a8'; c.fillRect(i * w / 8, 0, w / 8, h); } });
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(TUNNEL.r, TUNNEL.r, L, 36, 1, true), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.9, side: THREE.DoubleSide }));
      tube.rotation.z = Math.PI / 2; g.add(tube);
      for (let i = 0; i <= 4; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(TUNNEL.r, 0.008, 6, 36), std('#e9d9a0')); ring.rotation.y = Math.PI / 2; ring.position.x = -L / 2 + i * L / 4; g.add(ring); }
      g.position.set((TUNNEL.a.x + TUNNEL.b.x) / 2, TUNNEL.r * 0.97, TUNNEL.a.z);
      sc.add(g); this.play.tunnel = g;
    }
    // すべり台（はしご＋台＋すべる面）
    {
      const g = new THREE.Group(); sc.add(g); this.play.slide = g;
      const wood = std('#d9b48a', 0.7), blue = std('#8fd3f0', 0.35), T = SLIDE.top, H = SLIDE.h;
      // 台（広め）と4本の柱。向きはすべる方向にそろえる
      const yaw = Math.atan2(SLIDE_DIR.x, SLIDE_DIR.z), PW = 0.36;
      const deck = new THREE.Group(); deck.position.set(T.x, 0, T.z); deck.rotation.y = yaw; g.add(deck);
      const plat = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.04, PW), wood); plat.position.y = H - 0.02; deck.add(plat);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, H, 10), wood); post.position.set(dx * (PW / 2 - 0.02), H / 2, dz * (PW / 2 - 0.02)); deck.add(post); }
      // はしご：台のうしろから一直線に登る坂（段つき）。両わきに手すり
      const L0 = SLIDE.ladder, lad = new THREE.Group(); g.add(lad);
      const a0 = L0.clone(), b0 = T.clone().addScaledVector(SLIDE_DIR, PW / 2); b0.y = H;
      lad.position.copy(a0).lerp(b0, 0.5); lad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b0.clone().sub(a0).normalize());
      const LL = a0.distanceTo(b0);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, LL), wood); lad.add(board);
      for (let i = 0; i < 7; i++) { const st2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.02), std('#c99c6c')); st2.position.set(0, 0.02, -LL / 2 + (i + 0.5) * LL / 7); lad.add(st2); }
      for (const s2 of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, LL), wood); rail.position.set(s2 * 0.14, 0.045, 0); lad.add(rail); }
      // すべる面（両側にふち）
      const B = SLIDE.bottom.clone(); B.y = this.slideEndY = 0.29;
      const A = T.clone(); A.y = H;
      const len = A.distanceTo(B), mid = A.clone().lerp(B, 0.5), dir = B.clone().sub(A).normalize();
      const chute = new THREE.Group(); chute.position.copy(mid); chute.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir); g.add(chute);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, len), blue); chute.add(bed);
      for (const s2 of [-1, 1]) { const side2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, len), blue); side2.position.set(s2 * 0.14, 0.03, 0); chute.add(side2); }
    }
    // 砂場
    {
      const g = new THREE.Group(); g.position.copy(SAND.c); sc.add(g); this.play.sandbox = g;
      const sand = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#e8d3a6'; c.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = Math.random() * 40; c.fillStyle = `rgba(${170 + v},${145 + v},${100 + v},.5)`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } });
      const top = new THREE.Mesh(new THREE.PlaneGeometry(SAND.w, SAND.d, 12, 12), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
      { const p = top.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.random() * 0.008); top.geometry.computeVertexNormals(); }
      top.rotation.x = -Math.PI / 2; top.position.y = SAND.h - 0.005; g.add(top);
      const wood = std('#c49a6c', 0.8);
      for (const [w, d, x, z] of [[SAND.w + 0.06, 0.03, 0, SAND.d / 2 + 0.015], [SAND.w + 0.06, 0.03, 0, -SAND.d / 2 - 0.015], [0.03, SAND.d, SAND.w / 2 + 0.015, 0], [0.03, SAND.d, -SAND.w / 2 - 0.015, 0]]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), wood); b.position.set(x, 0.025, z); g.add(b);
      }
      for (let i = 0; i < 14; i++) { const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012 + Math.random() * 0.012, 1), std(['#9a958d', '#b8b0a2', '#7e7b78', '#c8bfae'][i % 4], 0.6)); st.scale.y = 0.6; st.position.set((Math.random() - 0.5) * SAND.w * 0.85, SAND.h + 0.003, (Math.random() - 0.5) * SAND.d * 0.85); g.add(st); }
      const shovel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.01, 0.12), std('#ef7b7b', 0.5)); shovel.position.set(SAND.w * 0.3, SAND.h + 0.01, -SAND.d * 0.25); shovel.rotation.y = 0.6; g.add(shovel);
    }
    // ハンモック（2本の柱のあいだ）
    {
      const g = new THREE.Group(); g.position.copy(HAMMOCK.c); sc.add(g); this.play.hammock = g;
      const cloth = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#f3c9c0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff3ee'; c.lineWidth = 6; for (let x = 0; x < w; x += 22) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } }, [2, 1]);
      const sw = new THREE.Group(); g.add(sw); this.hammockSwing = sw;
      const geo = new THREE.PlaneGeometry(HAMMOCK.w, HAMMOCK.len, 10, 24), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (HAMMOCK.w / 2), z = p.getY(i) / (HAMMOCK.len / 2); p.setXYZ(i, p.getX(i) * (0.75 + 0.25 * Math.abs(z)), -HAMMOCK.sag * (1 - z * z) - 0.035 * (1 - x * x), p.getY(i)); }
      geo.computeVertexNormals();
      const fab = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.95, side: THREE.DoubleSide })); fab.position.y = HAMMOCK.top; sw.add(fab);
      const wood = std('#b88a5c', 0.8), ropeM = std('#e8dcc8');
      // 柱は四すみ（端の真ん中はスロープの通り道）
      const PX = HAMMOCK.w / 2 + 0.07, PZ = HAMMOCK.len / 2 + 0.08, PH = HAMMOCK.top + 0.14;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, PH, 12), wood); post.position.set(sx * PX, PH / 2, sz * PZ); g.add(post);
        const a = new THREE.Vector3(sx * PX, PH - 0.02, sz * PZ), b = new THREE.Vector3(sx * HAMMOCK.w / 2, HAMMOCK.top, sz * HAMMOCK.len / 2);
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, a.distanceTo(b), 6), ropeM);
        rope.position.copy(a).lerp(b, 0.5); rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(rope);
      }
      for (const sz of [-1, 1]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(PX * 2, 0.03, 0.04), wood); bar.position.set(0, 0.015, sz * PZ); g.add(bar); }
      // スロープ（滑り止めの横木つき）
      {
        const a = HAMMOCK.rampBase.clone().sub(HAMMOCK.c), b = HAMMOCK.rampTop.clone().sub(HAMMOCK.c); a.y = 0.01; b.y = HAMMOCK.top - 0.012;
        const L = a.distanceTo(b), ramp = new THREE.Group(); ramp.position.copy(a).lerp(b, 0.5); ramp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize()); g.add(ramp);
        ramp.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, L), std('#d4ad80', 0.8)));
        for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.014), wood); c.position.set(0, 0.016, -L / 2 + (i + 0.5) * L / 7); ramp.add(c); }
      }
    }
    // 流木の切り株（坂の丸太つき）
    {
      const g = new THREE.Group(); sc.add(g); this.play.stump = g;
      const bark = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#7b5a3e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(40,25,15,${0.2 + Math.random() * 0.3})`; c.lineWidth = 2 + Math.random() * 3; c.beginPath(); const x = Math.random() * w; c.moveTo(x, 0); c.bezierCurveTo(x + 8, h * 0.3, x - 8, h * 0.6, x + 4, h); c.stroke(); } }, [3, 1]);
      const top = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#d8b88c'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,80,50,.45)'; for (let r = 6; r < 64; r += 7) { c.lineWidth = 1.5; c.beginPath(); c.arc(64, 64, r, 0, 7); c.stroke(); } });
      const st = new THREE.Mesh(new THREE.CylinderGeometry(STUMP.r, STUMP.r * 1.12, STUMP.h, 28), [new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 }), new THREE.MeshStandardMaterial({ map: top, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: top, roughness: 0.9 })]);
      st.position.set(STUMP.c.x, STUMP.h / 2, STUMP.c.z); g.add(st);
      const a = STUMP.ramp.clone(), b = STUMP.c.clone().add(STUMP.ramp.clone().sub(STUMP.c).setY(0).normalize().multiplyScalar(STUMP.r * 0.7)); b.y = STUMP.h;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, a.distanceTo(b) + 0.06, 16), new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 }));
      log.position.copy(a).lerp(b, 0.5); log.position.y += 0.03; log.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(log);
      this.stumpRampTop = b;
    }
    for (const k in this.play) this.play[k].visible = false;
    this.obstacles = [];
    this.roomDay = -1;
  }

  // 月齢に合わせて遊び場を出す。ぶつかる所（丸）を作り直す
  setRoom(day) {
    const has = { tunnel: day >= 60, slide: false, sandbox: day >= 120, hammock: day >= 150, stump: day >= 200 };
    this.has = has;
    for (const k in this.play) this.play[k].visible = !!has[k];
    const ob = [];
    if (has.tunnel) for (let i = 0; i <= 4; i++) ob.push({ x: TUNNEL.a.x + (TUNNEL.b.x - TUNNEL.a.x) * i / 4, z: TUNNEL.a.z, r: TUNNEL.r + 0.02, id: 'tunnel' });
    if (has.slide) { ob.push({ x: SLIDE.top.x, z: SLIDE.top.z, r: 0.24, id: 'slide' }); const m = SLIDE.top.clone().lerp(SLIDE.ladder, 0.55); ob.push({ x: m.x, z: m.z, r: 0.16, id: 'slide' }); }
    if (has.hammock) {
      // ハンモック全体（柱まで）を、軸にそって重なった丸で1つの長い形にする。スロープも同じ
      const n = 6, z0 = -(HAMMOCK.len / 2 + 0.08), z1 = HAMMOCK.len / 2 + 0.08;
      for (let i = 0; i < n; i++) ob.push({ x: HAMMOCK.c.x, z: HAMMOCK.c.z + z0 + (z1 - z0) * i / (n - 1), r: HAMMOCK.w / 2 + 0.09, id: 'hammock' });
      for (const t of [0.25, 0.6]) { const m = HAMMOCK.rampBase.clone().lerp(HAMMOCK.rampTop, t); ob.push({ x: m.x, z: m.z, r: 0.11, id: 'hammock' }); }
    }
    if (has.stump) ob.push({ x: STUMP.c.x, z: STUMP.c.z, r: STUMP.r * 1.12, id: 'stump' });
    this.obstacles = ob;
  }
  // 床の高さ（ねどこ・砂場）
  groundAt(x, z) {
    let y = this.bedHeight(x, z);
    if (this.has?.sandbox && Math.abs(x - SAND.c.x) < SAND.w / 2 && Math.abs(z - SAND.c.z) < SAND.d / 2) y = Math.max(y, SAND.h);
    return y;
  }
  // ハンモックの布の高さ（x,z の真下）。布の外なら null
  hammockSurface(x, z) {
    const dx = x - HAMMOCK.c.x, dz = z - HAMMOCK.c.z, zn = dz / (HAMMOCK.len / 2);
    if (Math.abs(zn) >= 1) return null;
    const hw = HAMMOCK.w / 2 * (0.75 + 0.25 * Math.abs(zn));
    if (Math.abs(dx) >= hw) return null;
    return HAMMOCK.top - HAMMOCK.sag * (1 - zn * zn) - 0.035 * (1 - (dx / hw) ** 2);
  }
  hammockY(t) { return HAMMOCK.top - HAMMOCK.sag + 0.005 + Math.sin(t * 1.3) * 0.004; }

  bedHeight(x, z) {
    const r = Math.hypot(x - BED.x, z - BED.z) / BED_R;
    if (r < 0.92) return 0.05 + Math.pow(r, 4) * 0.035;
    if (r < 1.18) return 0.085 * (1 - Math.abs(r - 1.03) / 0.15) + 0.0;   // ふちをまたぐ
    return 0;
  }

  buildPool() {
    this.poolG = new THREE.Group(); this.poolG.position.copy(POOL); this.scene.add(this.poolG);
    // たらい（ブリキ）
    this.tarai = new THREE.Group(); this.poolG.add(this.tarai);
    const tin = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide });
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.35, 0.15, 48, 1, true), tin); tw.position.y = 0.075; this.tarai.add(tw);
    const tb = new THREE.Mesh(new THREE.CircleGeometry(0.35, 48), tin); tb.rotation.x = -Math.PI / 2; tb.position.y = 0.005; this.tarai.add(tb);
    const tr = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 8, 48), tin); tr.rotation.x = Math.PI / 2; tr.position.y = 0.15; this.tarai.add(tr);
    // ビニールプール
    this.big = new THREE.Group(); this.poolG.add(this.big);
    const vin = new THREE.MeshStandardMaterial({ color: '#7cc3e8', roughness: 0.45 });
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 16, 64), i ? new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 0.45 }) : vin);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.09 + i * 0.17; this.big.add(ring);
    }
    const bot = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), new THREE.MeshStandardMaterial({ color: '#8fd0ef' }));
    bot.rotation.x = -Math.PI / 2; bot.position.y = 0.006; this.big.add(bot);
    // 水面
    this.waterMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 }, uDeep: { value: new THREE.Color('#4aa4c4') }, uShallow: { value: new THREE.Color('#bfe9f2') }, uDim: { value: 1 }, uRip: { value: new THREE.Vector4(0, 0, -9, 0) } },
      vertexShader: `varying vec2 vP; varying vec3 vW; void main(){ vP = position.xy; vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uT; uniform vec3 uDeep; uniform vec3 uShallow; uniform float uDim; uniform vec4 uRip; varying vec2 vP; varying vec3 vW;
        void main(){
          float r = length(vP);
          float w = sin(vP.x*40.+uT*1.7)*sin(vP.y*37.-uT*1.3) + sin((vP.x+vP.y)*61.+uT*2.3)*.5;
          float d = length(vW.xz - uRip.xy); float age = uT - uRip.z;
          float rip = age > 0. && age < 2.5 ? sin(d*90. - age*14.) * exp(-d*8.) * (1.-age/2.5) : 0.;
          vec3 V = normalize(cameraPosition - vW);
          float fr = pow(1.-abs(V.y), 3.);
          vec3 c = mix(uShallow, uDeep, .55 + .2*w*.3) + vec3(.9)*smoothstep(.75,1.,w*.6+rip*.8+.3)*.5;
          c = mix(c, vec3(.95,.97,1.), fr*.6);
          gl_FragColor = vec4(c*uDim, .55 + fr*.35);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.water = new THREE.Mesh(new THREE.CircleGeometry(1, 64), this.waterMat);
    this.water.rotation.x = -Math.PI / 2; this.water.renderOrder = 2; this.poolG.add(this.water);
    this.poolShadow = this.makeShadow(0.5);
  }

  setPool(on, big) {
    this.poolOn = on; this.poolBig = big;
    this.poolG.visible = on;
    this.poolShadow.visible = on;
    this.tarai.visible = !big; this.big.visible = big;
    this.poolR = big ? 0.6 : 0.38;
    this.waterY = big ? 0.24 : 0.11;
    this.rimH = big ? 0.36 : 0.16;   // ふちの高さ（ここを越えて出入りする）
    this.water.scale.setScalar(this.poolR + (big ? 0 : 0.03));
    this.water.position.y = this.waterY;
    this.poolShadow.scale.set((this.poolR + 0.12) * 2.4, (this.poolR + 0.12) * 2.4, 1);
    this.poolShadow.position.set(POOL.x, 0.003, POOL.z);
  }
  inPool(x, z, margin = 0) { return this.poolOn && Math.hypot(x - POOL.x, z - POOL.z) < this.poolR - margin; }
  ripple(x, z) { this.waterMat.uniforms.uRip.value.set(x, z, this.waterMat.uniforms.uT.value, 0); }

  buildBowl() {
    const g = new THREE.Group(); g.position.copy(BOWL); this.scene.add(g);
    const pts = [[0.0, 0.0], [0.07, 0.0], [0.09, 0.01], [0.1, 0.045], [0.095, 0.05], [0.085, 0.015], [0.0, 0.012]].map(([x, y]) => new THREE.Vector2(x, y));
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: '#f2c9b8', roughness: 0.3, side: THREE.DoubleSide }));
    g.add(bowl);
    this.makeShadow(0.12).position.set(BOWL.x, 0.003, BOWL.z);
  }

  buildToys() {
    // 黄色いおさかなぬいぐるみ（動画の子が抱えていたもの）：流線形の胴＋ジグザグもよう＋尾びれ・背びれ・ボタンの目
    const FL = 0.15, FH = 0.08, FW = 0.058;
    const zig = canvasTex(512, 256, (c, w, h) => {
      c.fillStyle = '#f6cd3a'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#fff6d2'; c.lineWidth = 11; c.lineJoin = 'round'; c.lineCap = 'round';
      for (let x = 32; x < w; x += 64) { c.beginPath(); for (let y = -16; y <= h + 16; y += 16) c.lineTo(x + ((y / 16) % 2 ? 13 : -13), y); c.stroke(); }
    });
    const plush = new THREE.MeshPhysicalMaterial({ map: zig, roughness: 1, sheen: 0.6, sheenColor: new THREE.Color('#fff2b0'), sheenRoughness: 0.8 });
    const finMat = new THREE.MeshPhysicalMaterial({ color: '#f2c22c', roughness: 1, sheen: 0.5, sheenColor: new THREE.Color('#fff0a0') });
    const fishR = t => 0.32 + 0.68 * Math.min(1, Math.max(0, t) / 0.5) ** 0.7;  // 尾(0)→頭(1)の太さ（ふっくら）
    const fg = new THREE.SphereGeometry(1, 40, 28);
    { const a = fg.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i), y = a.getY(i), z = a.getZ(i), t = (y + 1) / 2, rr = Math.hypot(x, z) || 1e-6, k = fishR(t) * Math.pow(Math.max(0, 1 - y * y), y > 0 ? 0.3 : 0.42) / rr;
        a.setXYZ(i, x * k * FW / 2, y * FL / 2, z * k * FH / 2 * (z > 0 ? 1 : 0.9));
      }
      fg.rotateX(Math.PI / 2); fg.computeVertexNormals(); }
    const fish = new THREE.Group();
    fish.add(new THREE.Mesh(fg, plush));
    // 尾びれ（ふっくらした切れこみのある形）
    const tail = new THREE.Shape();
    tail.moveTo(0, 0.013); tail.bezierCurveTo(0.012, 0.02, 0.03, 0.036, 0.038, 0.03); tail.quadraticCurveTo(0.026, 0, 0.038, -0.03); tail.bezierCurveTo(0.03, -0.036, 0.012, -0.02, 0, -0.013); tail.lineTo(0, 0.013);
    const tg = new THREE.ExtrudeGeometry(tail, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.006, bevelSegments: 5, curveSegments: 14 });
    tg.translate(0, 0, -0.004); tg.rotateY(Math.PI / 2);
    const tm = new THREE.Mesh(tg, finMat); tm.position.z = -FL / 2 + 0.016; fish.add(tm);
    // 背びれ
    const dorsal = new THREE.Shape();
    dorsal.moveTo(-0.02, 0); dorsal.bezierCurveTo(-0.014, 0.02, 0.008, 0.02, 0.018, 0.004); dorsal.lineTo(0.02, 0); dorsal.lineTo(-0.02, 0);
    const dg = new THREE.ExtrudeGeometry(dorsal, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 3 });
    dg.translate(0, 0, -0.002); dg.rotateY(-Math.PI / 2);
    const dm = new THREE.Mesh(dg, finMat); dm.position.set(0, FH / 2 * 0.9, -0.004); fish.add(dm);
    // 胸びれ・ボタンの目・口
    for (const s of [-1, 1]) {
      const pf = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), finMat);
      pf.scale.set(0.004, 0.012, 0.02); pf.position.set(s * FW / 2 * 0.95, -0.012, 0.012); pf.rotation.set(0.4, s * 0.5, 0); fish.add(pf);
      const ez = FL * 0.26, er = fishR(0.5 + ez / FL) * FW / 2 * Math.pow(1 - Math.pow(ez / (FL / 2), 2), 0.3) * 0.97;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, 0.004, 28), new THREE.MeshStandardMaterial({ color: '#d7dbdf', metalness: 0.3, roughness: 0.35 }));
      ring.rotation.z = Math.PI / 2; ring.position.set(s * (er + 0.0005), 0.01, ez); fish.add(ring);
      const pu = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0068, 0.005, 24), new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.25 }));
      pu.rotation.z = Math.PI / 2; pu.position.set(s * (er + 0.0015), 0.01, ez); fish.add(pu);
      const hi = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      hi.position.set(s * (er + 0.004), 0.013, ez + 0.002); fish.add(hi);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0013, 6, 16, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: '#7a5418' }));
    mouth.position.set(0, -0.006, FL / 2 + 0.0005); mouth.rotation.set(0, 0, Math.PI * 1.1); fish.add(mouth);
    fish.userData = { r: FL / 2, half: FH / 2, thick: FW / 2, len: FL };
    this.fishToy = fish; fish.visible = false; this.scene.add(fish);
    // 小石
    this.stones = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.IcosahedronGeometry(0.022, 2); const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const v = new THREE.Vector3().fromBufferAttribute(p, k); v.multiply(new THREE.Vector3(1.2, 0.75, 1)); p.setXYZ(k, v.x, v.y, v.z); }
      g.computeVertexNormals();
      const s = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: ['#9a958d', '#b8b0a2', '#7e7b78'][i], roughness: 0.6 }));
      s.visible = false; this.scene.add(s); this.stones.push(s);
    }
    // ボール
    const bt = canvasTex(128, 64, (c, w, h) => { const cs = ['#ef6b6b', '#ffd25e', '#6bb8ef', '#7ed38a']; for (let i = 0; i < 4; i++) { c.fillStyle = cs[i]; c.fillRect(i * w / 4, 0, w / 4, h); } });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), new THREE.MeshStandardMaterial({ map: bt, roughness: 0.4 }));
    this.ball.visible = false; this.scene.add(this.ball);
    this.ballV = new THREE.Vector3();
    // くるまるブランケット（グレーのニット）
    const knit = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#5d5f63'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 8) for (let y = 0; y < h; y += 6) {
        const v = 80 + Math.random() * 30; c.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
        c.beginPath(); c.ellipse(x + 4, y + 3, 3.2, 2.6, (x / 8) % 2 ? 0.5 : -0.5, 0, Math.PI * 2); c.fill();
      }
    }, [5, 4]);
    const kg = new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, 0.75, Math.PI - 0.75);
    kg.rotateX(Math.PI / 2);
    const p = kg.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const f = 1 + Math.sin(v.x * 9 + v.z * 4) * 0.04 + Math.sin(v.y * 7) * 0.03; p.setXYZ(i, v.x * f, v.y * f, v.z * f); }
    kg.computeVertexNormals();
    this.wrap = new THREE.Group();
    const wm = new THREE.Mesh(kg, new THREE.MeshStandardMaterial({ map: knit, roughness: 1, side: THREE.DoubleSide }));
    this.wrap.add(wm);
    const lipR = Math.sin(0.75);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(lipR, 0.09, 12, 48), new THREE.MeshStandardMaterial({ map: knit, roughness: 1 }));
    lip.position.z = Math.cos(0.75); this.wrap.add(lip);
    this.wrap.visible = false; this.scene.add(this.wrap);
  }

  buildHand() {
    // 人の右手（手のひらを下、人差し指を前に出す）。指先が原点、手は -Z 側へのびる。単位は m（実寸）
    const skin = new THREE.MeshPhysicalMaterial({ color: '#f0c4a8', roughness: 0.62, sheen: 0.4, sheenColor: new THREE.Color('#ffd8c8'), sheenRoughness: 0.6 });
    const nailM = new THREE.MeshPhysicalMaterial({ color: '#f7dcd3', roughness: 0.25, clearcoat: 0.6 });
    const h = new THREE.Group();
    this.curl = [];
    // まるみのある箱（手のひら）
    const roundBox = (w, ht, d, p = 3.2) => {
      const g = new THREE.SphereGeometry(1, 28, 20), a = g.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = a.getX(i), y = a.getY(i), z = a.getZ(i), L = Math.pow(Math.pow(Math.abs(x), p) + Math.pow(Math.abs(y), p) + Math.pow(Math.abs(z), p), 1 / p) || 1;
        a.setXYZ(i, x / L * w / 2, y / L * ht / 2, z / L * d / 2);
      }
      g.computeVertexNormals(); return g;
    };
    // 指1本：関節ごとに少しずつ曲がるカプセルのつながり。segs=[長さ, 太さ, 曲げ角]（先→根元ではなく根元→先）
    const fingerChain = (parent, segs, nail) => {
      let g = parent; const joints = [];
      segs.forEach(([len, r, bend], i) => {
        const j = new THREE.Group(); j.rotation.x = bend; g.add(j); joints.push(j);
        const c = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), skin);
        c.rotation.x = Math.PI / 2; c.position.z = len / 2; j.add(c);
        if (nail && i === segs.length - 1) { const n = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), nailM); n.scale.set(r * 0.85, r * 0.35, len * 0.55); n.position.set(0, r * 0.72, len * 0.62); j.add(n); }
        const nx = new THREE.Group(); nx.position.z = len; j.add(nx); g = nx;
      });
      return joints;
    };
    // 手の甲（指の付け根が z=-0.075）
    const palm = new THREE.Mesh(roundBox(0.082, 0.028, 0.09), skin);
    palm.position.set(0.026, -0.004, -0.12); palm.rotation.x = 0.06; h.add(palm);
    // 人差し指：根元→先で少しだけ下に曲がる。指先が原点になるよう後で全体をずらす
    const idx = new THREE.Group(); h.add(idx);
    fingerChain(idx, [[0.036, 0.0095, 0.0], [0.022, 0.009, 0.1], [0.018, 0.0085, 0.12]], true);
    // ほかの3本はにぎった形（付け根で大きく下へ曲がる）
    [[0.02, 0.0098], [0.038, 0.0092], [0.053, 0.0082]].forEach(([x, r], i) => {
      const base = new THREE.Group(); base.position.set(x, -0.002, -0.078 + i * 0.002); h.add(base);
      const js = fingerChain(base, [[0.032 - i * 0.004, r, 1.35], [0.02, r * 0.95, 1.45], [0.015, r * 0.9, 1.1]], true);
      js.forEach(j => this.curl.push([j, j.rotation.x]));
    });
    // 親指（人差し指の下に添える）
    const th = new THREE.Group(); th.position.set(-0.012, -0.014, -0.115); th.rotation.set(0.15, 0.55, 0.5); h.add(th);
    fingerChain(th, [[0.03, 0.0115, 0], [0.024, 0.0105, 0.25]], true);
    // 手首と袖
    const wrist = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.1, 6, 16), skin);
    wrist.scale.set(1.25, 0.8, 1); wrist.rotation.x = Math.PI / 2; wrist.position.set(0.024, -0.004, -0.2); h.add(wrist);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.052, 0.34, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#c8d3e6', roughness: 0.92, side: THREE.DoubleSide }));
    sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0.024, -0.004, -0.39); h.add(sleeve);
    // 人差し指の先が原点に来るように、手全体をずらす
    idx.updateMatrixWorld(true); h.updateMatrixWorld(true);
    const tip = new THREE.Vector3(); let last = idx; while (last.children.length) last = last.children[last.children.length - 1];
    last.getWorldPosition(tip);
    const inner = new THREE.Group(); for (const c of [...h.children]) inner.add(c);
    inner.position.set(-tip.x, -tip.y, -tip.z - 0.008); h.add(inner);
    this.hand = h; h.visible = false; this.scene.add(h);
    this.fingerTip = new THREE.Object3D(); h.add(this.fingerTip);
    // 哺乳びん（手に持たせる）
    const bottle = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 24), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.1, transmission: 0.0, transparent: true, opacity: 0.55 }));
    glass.rotation.x = Math.PI / 2; bottle.add(glass);
    this.milk = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.08, 24), new THREE.MeshStandardMaterial({ color: '#fbf8f1', roughness: 0.4 }));
    this.milk.rotation.x = Math.PI / 2; bottle.add(this.milk);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.014, 24), new THREE.MeshStandardMaterial({ color: '#9fd3e8', roughness: 0.4 }));
    cap.rotation.x = Math.PI / 2; cap.position.z = 0.05; bottle.add(cap);
    const nip = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.014, 6, 12), new THREE.MeshStandardMaterial({ color: '#e9c48e', roughness: 0.5, transparent: true, opacity: 0.85 }));
    nip.rotation.x = Math.PI / 2; nip.position.z = 0.068; bottle.add(nip);
    this.bottle = bottle; bottle.visible = false; this.scene.add(bottle);
    this.bottleTip = new THREE.Object3D(); this.bottleTip.position.z = 0.075; bottle.add(this.bottleTip);
  }

  // 手をひらく（1）・にぎる（0）
  setHandOpen(a) { for (const [j, r] of this.curl) j.rotation.x = r + (0.12 - r) * a; }

  // ごはんの3D（小さく作って、カワウソの手に持たせる）
  makeFood(id) {
    const g = new THREE.Group();
    const std = (c, r = 0.5, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    if (id === 'fish') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), std('#b9c4cc', 0.25, 0.4)); b.scale.set(0.008, 0.012, 0.04); g.add(b);
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.015, 12), std('#9aa8b2', 0.3, 0.4)); t.rotation.x = Math.PI / 2; t.scale.set(0.4, 1, 1); t.position.z = -0.045; g.add(t);
    } else if (id === 'shrimp') {
      for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.008 - i * 0.0009, 12, 8), std('#f08a5c', 0.4)); const a = i * 0.45; s.position.set(0, Math.sin(a) * 0.016, Math.cos(a) * 0.016 - 0.008); g.add(s); }
    } else if (id === 'crab' || id === 'crayfish') {
      const c = id === 'crab' ? '#d6503c' : '#b8402e';
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), std(c, 0.45)); b.scale.set(0.018, 0.009, id === 'crab' ? 0.014 : 0.03); g.add(b);
      for (const s of [-1, 1]) {
        const cl = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), std(c, 0.45)); cl.scale.set(1, 0.7, 1.4); cl.position.set(s * 0.016, 0.002, 0.02); g.add(cl);
        for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.016, 5), std(c, 0.5)); l.rotation.z = s * 1.1; l.position.set(s * 0.02, -0.003, -0.006 + k * 0.007); g.add(l); }
      }
    } else if (id === 'clam') {
      for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#b9a58c', 0.6)); h.scale.set(1.2, 0.4, 1); h.rotation.x = s > 0 ? 0 : Math.PI; g.add(h); }
    } else if (id === 'paste') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 10), std('#e8c9b4', 0.8)); b.scale.y = 0.6; g.add(b);
    }
    this.scene.add(g);
    return g;
  }

  // 床をタップした所に広がる輪
  ping(p) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 40), new THREE.MeshBasicMaterial({ color: '#fff7e8', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(p.x, this.groundAt(p.x, p.z) + 0.01, p.z); m.renderOrder = 3;
    this.scene.add(m); this.pings.push({ m, t: 0 });
  }

  splash(pos, n = 10, color = '#e6f6fb') {
    for (let i = 0; i < n; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
      d.position.copy(pos); this.scene.add(d);
      this.splashes.push({ m: d, v: new THREE.Vector3(rnd(-0.4, 0.4), rnd(0.5, 1.1), rnd(-0.4, 0.4)), t: 0 });
    }
  }

  update(dt, t) {
    this.waterMat.uniforms.uT.value = t;
    if (this.hammockSwing) this.hammockSwing.rotation.z = Math.sin(t * 1.3) * 0.05;
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const g = this.pings[i]; g.t += dt;
      const e = g.t / 0.9; g.m.scale.setScalar(0.03 + 0.17 * Math.sqrt(Math.min(1, e))); g.m.material.opacity = 0.9 * (1 - e);
      if (e >= 1) { this.scene.remove(g.m); g.m.geometry.dispose(); this.pings.splice(i, 1); }
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i]; s.t += dt;
      s.v.y -= 3.2 * dt; s.m.position.addScaledVector(s.v, dt);
      if (s.t > 0.8 || s.m.position.y < 0) { this.scene.remove(s.m); s.m.geometry.dispose(); this.splashes.splice(i, 1); }
    }
    // 夜は暗く、ランプをつける
    const n = this.night;
    this.hemi.intensity = 1.25 * (1 - n * 0.65);
    this.sun.intensity = 2.0 * (1 - n * 0.85);
    this.lamp.intensity = n * 2.2;
    this.win.material.color.setRGB(1 - n * 0.75, 1 - n * 0.7, 1 - n * 0.5);
    this.scene.background.setRGB(0.85 - n * 0.55, 0.81 - n * 0.53, 0.77 - n * 0.47);
    this.scene.fog.color.copy(this.scene.background);
    LIGHT.col.setRGB(1.0 - n * 0.55, 0.93 - n * 0.55, 0.84 - n * 0.5);
    LIGHT.top.setRGB(0.55 - n * 0.3, 0.58 - n * 0.3, 0.64 - n * 0.28);
    LIGHT.bot.setRGB(0.3 - n * 0.12, 0.25 - n * 0.12, 0.22 - n * 0.1);
    this.waterMat.uniforms.uDim.value = 1 - n * 0.55;
  }
}
