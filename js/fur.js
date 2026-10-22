// ふわふわの毛：同じ形を少しずつ外側にずらして何層も重ね、毛先ほど細くなるように穴をあける（シェル法）
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/BufferGeometryUtils.js';

const COARSE = matchMedia('(pointer: coarse)').matches;
export const SHELLS = COARSE ? 14 : 22;

// だ円体をもとにした部品。deform(v) で形を変え、paint(v) で [クリーム色の量(-1〜1), 毛の長さ(0〜1)] を返す
export function blob(rx, ry, rz, { deform, paint, ws = 36, hs = 24, axisZ = false } = {}) {
  let g = new THREE.SphereGeometry(1, ws, hs);
  if (axisZ) g.rotateX(Math.PI / 2);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const u = v.clone();            // 単位球の上の向き
    v.set(v.x * rx, v.y * ry, v.z * rz);
    if (deform) deform(v, u);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return paintGeo(g, paint);
}

export function paintGeo(g, paint) {
  const p = g.attributes.position, n = p.count, v = new THREE.Vector3();
  const cream = new Float32Array(n), fur = new Float32Array(n), blush = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(p, i);
    const r = paint ? paint(v) : [0, 1];
    cream[i] = r[0]; fur[i] = r[1] ?? 1; blush[i] = r[2] ?? 0;
  }
  g.setAttribute('aBlush', new THREE.BufferAttribute(blush, 1));
  g.setAttribute('aCream', new THREE.BufferAttribute(cream, 1));
  g.setAttribute('aFur', new THREE.BufferAttribute(fur, 1));
  return g;
}

// 何層も重ねて描くための形にする
const layerAttr = (() => {
  const a = new Float32Array(SHELLS);
  for (let i = 0; i < SHELLS; i++) a[i] = i / (SHELLS - 1);
  return new THREE.InstancedBufferAttribute(a, 1);
})();
export function furMesh(geo, mat) {
  const ig = new THREE.InstancedBufferGeometry();
  ig.index = geo.index;
  for (const k in geo.attributes) ig.setAttribute(k, geo.attributes[k]);
  ig.setAttribute('aLayer', layerAttr);
  ig.instanceCount = SHELLS;
  const m = new THREE.Mesh(ig, mat);
  m.frustumCulled = false;
  m.userData.base = geo;
  return m;
}

// 部屋の光（main から毎フレーム入れる）
export const LIGHT = {
  dir: new THREE.Vector3(0.4, 0.8, 0.45).normalize(),
  col: new THREE.Color(1.0, 0.93, 0.84),
  top: new THREE.Color(0.55, 0.58, 0.64),
  bot: new THREE.Color(0.3, 0.25, 0.22),
};

const VERT = /* glsl */`
attribute float aLayer;
attribute float aCream;
attribute float aFur;
attribute float aBlush;
varying float vBlush;
uniform float uLen;
uniform float uWet;
uniform vec3 uGrav;
uniform vec3 uComb;
varying vec3 vBase;
varying vec3 vON;
varying vec3 vN;
varying vec3 vW;
varying float vL;
varying float vCream;
varying float vFur;
void main() {
  float L = aLayer;
  vON = normal;
  vec3 wn = normalize(mat3(modelMatrix) * normal);
  float s = length(modelMatrix[0].xyz);
  float len = uLen * aFur * mix(1.0, 0.4, uWet) * s;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 comb = mat3(modelMatrix) * uComb;
  wp.xyz += wn * len * L + (uGrav + comb) * len * L * L;
  vW = wp.xyz;
  vBase = position;
  vN = wn;
  vL = L;
  vCream = aCream;
  vBlush = aBlush;
  vFur = aFur;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */`
uniform float uDensity;
uniform float uWet;
uniform float uDim;
uniform float uFloor;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColD;
uniform vec3 uBlush;
uniform float uBlushK;
varying float vBlush;
uniform vec3 uLightDir;
uniform vec3 uLightCol;
uniform vec3 uAmbTop;
uniform vec3 uAmbBot;
varying vec3 vBase;
varying vec3 vON;
varying vec3 vN;
varying vec3 vW;
varying float vL;
varying float vCream;
varying float vFur;
float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
void main() {
  // 格子の向きをずらして、毛の切り口が輪っか模様にならないようにする
  vec3 q = mat3(0.8, 0.36, -0.48, -0.48, 0.8, -0.36, 0.36, 0.48, 0.8) * vBase * uDensity;
  vec3 c = floor(q);
  vec3 jit = vec3(hash(c + 1.7), hash(c + 3.1), hash(c + 5.3)) * 0.5 + 0.25;
  vec3 f = fract(q) - jit;
  vec3 on = normalize(mat3(0.8, 0.36, -0.48, -0.48, 0.8, -0.36, 0.36, 0.48, 0.8) * vON);
  f -= on * dot(f, on);
  float h = hash(c);
  float L = vL;
  if (L > 0.001 && vW.y < uFloor) discard;   // 床まで垂れた毛は描かない（床のつぶつぶ防止）
  if (L > 0.001) {
    float thick = (1.0 - L) * 0.42 + 0.06;
    if (h < L * 0.75 || length(f) > thick) discard;
    if (vFur < 0.05) discard;
  }
  float cr = clamp(vCream, 0.0, 1.0);
  vec3 base = mix(uColA, uColB, cr);
  base = mix(base, uColD, clamp(-vCream, 0.0, 1.0));
  base = mix(base, uBlush, clamp(vBlush * uBlushK, 0.0, 0.9));
  base *= 0.93 + 0.14 * hash(c + 7.31);
  // 毛先は少し明るく、根元は少し暗く（イラストのようにやわらかく）
  base *= mix(0.78, 1.06, pow(L, 0.8));
  base = mix(base, base * 0.55, uWet * 0.6);
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float dif = clamp(dot(N, uLightDir) * 0.55 + 0.45, 0.0, 1.0);
  dif = mix(dif, dif * dif, 0.35);
  vec3 amb = mix(uAmbBot, uAmbTop, N.y * 0.5 + 0.5);
  float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  vec3 H = normalize(uLightDir + V);
  float spec = pow(clamp(dot(N, H), 0.0, 1.0), 24.0) * (0.06 + uWet * 0.5) * L;
  vec3 col = base * (amb + uLightCol * dif * 0.95) + rim * 0.3 * uLightCol * (base + 0.12) + spec * uLightCol;
  gl_FragColor = vec4(col * uDim, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function makeFurMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLen: { value: 0.1 },
      uWet: { value: 0 },
      uDim: { value: 1 },
      uFloor: { value: -10 },
      uDensity: { value: 34 },
      uGrav: { value: new THREE.Vector3(0, -0.35, 0) },
      uComb: { value: new THREE.Vector3(0, -0.15, -0.35) },
      uColA: { value: new THREE.Color('#7b6556') },
      uColB: { value: new THREE.Color('#e9ddcc') },
      uColD: { value: new THREE.Color('#3b2c24') },
      uBlush: { value: new THREE.Color('#f39a9a') },
      uBlushK: { value: 0.6 },
      uLightDir: { value: LIGHT.dir },
      uLightCol: { value: LIGHT.col },
      uAmbTop: { value: LIGHT.top },
      uAmbBot: { value: LIGHT.bot },
    },
  });
}
