import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── ASL POSE LIBRARY (per-joint, matched to standard ASL chart) ─────────────
//
// finger: [MCP_curl, PIP_curl, DIP_curl, MCP_spread_z]  (radians, X = curl in, Z = spread)
// thumb:  [base_curl_x, tip_curl_x, base_z_rotation]
//   base_z_rotation: -0.55 = natural resting; -1.4 = fully sideways (L/Y); +0.8 = across palm (B)
//
const DEFAULT_HAND_ROT = [-0.05, 0.08, 0];

const POSES = {
  // A – Tight fist with thumb resting vertically along the side of index finger
  a: {
    index:  [1.5, 1.6, 1.2, 0],
    middle: [1.5, 1.6, 1.2, 0],
    ring:   [1.5, 1.6, 1.2, 0],
    pinky:  [1.5, 1.6, 1.2, 0],
    thumb:  [0.05, 0.1, -0.3],   // thumb straight up alongside index
    handRot: [-0.05, 0.08, 0],
  },
  // B – Flat palm facing forward, 4 fingers straight together, thumb folded across lower palm
  b: {
    index:  [0, 0, 0, 0],
    middle: [0, 0, 0, 0],
    ring:   [0, 0, 0, 0],
    pinky:  [0, 0, 0, 0],
    thumb:  [0.45, 0.35, 0.85],   // folded across palm
    handRot: [-0.05, 0.08, 0],
  },
  // C – Wide C shape, fingers and thumb curved to face each other
  c: {
    index:  [0.55, 0.75, 0.55, 0],
    middle: [0.55, 0.75, 0.55, 0],
    ring:   [0.55, 0.75, 0.55, 0],
    pinky:  [0.55, 0.75, 0.55, 0],
    thumb:  [0.35, 0.40, -0.45],  // curves to meet fingers
    handRot: [-0.05, 0.25, 0],    // slightly angled to show C opening clearly
  },
  // D – Index straight UP; middle, ring, pinky tips touch thumb tip
  d: {
    index:  [0, 0, 0, 0],
    middle: [0.70, 0.95, 0.80, 0],
    ring:   [0.70, 0.95, 0.80, 0],
    pinky:  [0.70, 0.95, 0.80, 0],
    thumb:  [0.45, 0.45, -0.25],   // touches curled finger tips
    handRot: [-0.05, 0.08, 0],
  },
  // E – Clawed fingers bent down, tips resting on thumb tucked underneath
  e: {
    index:  [0.35, 1.55, 1.50, 0],
    middle: [0.35, 1.55, 1.50, 0],
    ring:   [0.35, 1.55, 1.50, 0],
    pinky:  [0.35, 1.55, 1.50, 0],
    thumb:  [0.55, 0.25, 0.65],   // tucked under fingertips
    handRot: [-0.05, 0.08, 0],
  },
  // F – Index and thumb tips touch (OK circle); middle, ring, pinky straight UP and spread
  f: {
    index:  [0.85, 0.95, 0.55, 0],
    middle: [0, 0, 0,  0.08],
    ring:   [0, 0, 0, -0.08],
    pinky:  [0, 0, 0, -0.22],
    thumb:  [0.55, 0.55, -0.25],
    handRot: [-0.05, 0.08, 0],
  },
  // G – Hand rotated sideways; index extended horizontally left; thumb parallel
  g: {
    index:  [0, 0, 0, 0],
    middle: [1.5, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.05, 0.05, -0.55], // parallel to index
    handRot: [-0.1, 1.45, -0.2], // 90° sideways orientation
  },
  // H – Hand rotated sideways; index and middle extended horizontally left together
  h: {
    index:  [0, 0, 0,  0.04],
    middle: [0, 0, 0, -0.04],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.6, 0.4, -0.1],
    handRot: [-0.1, 1.45, -0.2], // 90° sideways orientation
  },
  // I – Pinky extended straight UP; index, middle, ring curled into fist; thumb across
  i: {
    index:  [1.5, 1.5, 1.1, 0],
    middle: [1.5, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [0, 0, 0, 0],
    thumb:  [0.65, 0.45, 0.25],
    handRot: [-0.05, 0.08, 0],
  },
  // J – Static pose identical to I
  j: {
    index:  [1.5, 1.5, 1.1, 0],
    middle: [1.5, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [0, 0, 0, 0],
    thumb:  [0.65, 0.45, 0.25],
    handRot: [-0.05, 0.08, 0],
  },
  // K – Index straight UP; middle forward at 45°; thumb touching middle joint
  k: {
    index:  [0, 0, 0, 0],
    middle: [0.45, 0.55, 0.35, -0.05],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.20, 0.25, -0.40],
    handRot: [-0.05, 0.08, 0],
  },
  // L – Index straight UP; thumb fully horizontal at 90°
  l: {
    index:  [0, 0, 0, 0],
    middle: [1.5, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.02, 0.05, -1.45],  // 90° angle L shape
    handRot: [-0.05, 0.08, 0],
  },
  // M – Thumb tucked under index, middle, ring; 3 fingers folded over top
  m: {
    index:  [1.45, 1.5, 1.1, 0],
    middle: [1.45, 1.5, 1.1, 0],
    ring:   [1.45, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.55, 0.35, 0.15],   // under 3 fingers
    handRot: [-0.05, 0.08, 0],
  },
  // N – Thumb tucked under index and middle; 2 fingers folded over top
  n: {
    index:  [1.45, 1.5, 1.1, 0],
    middle: [1.45, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.55, 0.35, -0.05],  // under 2 fingers
    handRot: [-0.05, 0.08, 0],
  },
  // O – All 4 fingertips and thumb tip curve to meet in an O circle
  o: {
    index:  [0.70, 1.05, 0.90, 0],
    middle: [0.70, 1.05, 0.90, 0],
    ring:   [0.70, 1.05, 0.90, 0],
    pinky:  [0.70, 1.05, 0.90, 0],
    thumb:  [0.55, 0.65, -0.20],
    handRot: [-0.05, 0.25, 0],    // angled to show O opening
  },
  // P – Hand tilted DOWN; index pointing down; middle forward/down
  p: {
    index:  [0, 0, 0, 0],
    middle: [0.45, 0.55, 0.35, -0.05],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.20, 0.25, -0.40],
    handRot: [1.35, 0.3, -0.4],   // tilted down 90°
  },
  // Q – Hand tilted DOWN; index and thumb pointing down parallel
  q: {
    index:  [0, 0, 0, 0],
    middle: [1.5, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.05, 0.05, -0.55],
    handRot: [1.40, 0.2, -0.4],   // tilted down 90°
  },
  // R – Index and middle straight UP and crossed over each other
  r: {
    index:  [0, 0, 0,  0.25],
    middle: [0, 0, 0, -0.38],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.65, 0.45, 0.30],
    handRot: [-0.05, 0.08, 0],
  },
  // S – Tight fist, thumb folded horizontally across front of all 4 fingers
  s: {
    index:  [1.55, 1.6, 1.25, 0],
    middle: [1.55, 1.6, 1.25, 0],
    ring:   [1.55, 1.6, 1.25, 0],
    pinky:  [1.55, 1.6, 1.25, 0],
    thumb:  [0.65, 0.45, 0.65],   // over front of fingers
    handRot: [-0.05, 0.08, 0],
  },
  // T – Thumb tucked under index, tip sticking up between index and middle
  t: {
    index:  [1.25, 1.45, 0.85, 0],
    middle: [1.5, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.35, 0.25, -0.10],  // under index
    handRot: [-0.05, 0.08, 0],
  },
  // U – Index and middle extended straight UP together touching
  u: {
    index:  [0, 0, 0,  0.06],
    middle: [0, 0, 0, -0.06],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.65, 0.45, 0.30],
    handRot: [-0.05, 0.08, 0],
  },
  // V – Victory / peace sign: index and middle straight UP and spread wide
  v: {
    index:  [0, 0, 0,  0.38],
    middle: [0, 0, 0, -0.38],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.65, 0.45, 0.30],
    handRot: [-0.05, 0.08, 0],
  },
  // W – Index, middle, ring extended straight UP and spread apart (3 up)
  w: {
    index:  [0, 0, 0,  0.42],
    middle: [0, 0, 0,  0.02],
    ring:   [0, 0, 0, -0.42],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.65, 0.45, 0.40],
    handRot: [-0.05, 0.08, 0],
  },
  // X – Index finger hooked/bent 90° at PIP joint
  x: {
    index:  [0.85, 1.45, 0.75, 0],
    middle: [1.5, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.65, 0.45, 0.30],
    handRot: [-0.05, 0.08, 0],
  },
  // Y – Hang loose sign: thumb and pinky extended wide; middle 3 curled
  y: {
    index:  [1.55, 1.6, 1.25, 0],
    middle: [1.55, 1.6, 1.25, 0],
    ring:   [1.55, 1.6, 1.25, 0],
    pinky:  [0, 0, 0, -0.35],
    thumb:  [0.02, 0.05, -1.45],  // extended wide
    handRot: [-0.05, 0.08, 0],
  },
  // Z – Index finger pointing straight UP/forward
  z: {
    index:  [0, 0, 0, 0],
    middle: [1.5, 1.5, 1.1, 0],
    ring:   [1.5, 1.5, 1.1, 0],
    pinky:  [1.5, 1.5, 1.1, 0],
    thumb:  [0.65, 0.45, 0.30],
    handRot: [-0.05, 0.08, 0],
  },
};

// Neutral open hand
const NEUTRAL = {
  index:  [0.1, 0.1, 0.1, 0.05],
  middle: [0.1, 0.1, 0.1, 0],
  ring:   [0.1, 0.1, 0.1, -0.05],
  pinky:  [0.1, 0.1, 0.1, -0.1],
  thumb:  [0.2, 0.2, -0.55],
  handRot: [-0.05, 0.08, 0],
};

const FINGERS   = ['index', 'middle', 'ring', 'pinky'];
const LERP_MS   = 380;

function poseToState(pose) {
  const s = {};
  FINGERS.forEach(f => {
    const p = pose[f] || [0, 0, 0, 0];
    s[f] = [
      [p[0] || 0, 0, p[3] || 0],
      [p[1] || 0, 0, 0],
      [p[2] || 0, 0, 0],
    ];
  });
  const tp = pose.thumb || [0, 0, -0.55];
  s.thumb = [
    [tp[0] || 0, 0, tp[2] || -0.55],
    [tp[1] || 0, 0, 0],
  ];
  s.handRot = pose.handRot ? [...pose.handRot] : [...DEFAULT_HAND_ROT];
  return s;
}

function lerpState(s, t, k) {
  const r = {};
  FINGERS.forEach(f => {
    r[f] = s[f].map((sj, ji) => sj.map((sv, ax) => THREE.MathUtils.lerp(sv, t[f][ji][ax], k)));
  });
  r.thumb = s.thumb.map((sj, ji) => sj.map((sv, ax) => THREE.MathUtils.lerp(sv, t.thumb[ji][ax], k)));
  r.handRot = (s.handRot || DEFAULT_HAND_ROT).map((sv, idx) =>
    THREE.MathUtils.lerp(sv, (t.handRot || DEFAULT_HAND_ROT)[idx], k)
  );
  return r;
}

// ── Pure display component — ALL sequencing is owned by App.jsx ──────────────
// Props:
//   currentLetter : string | null   – letter to show (e.g. "a", "b", …)
//   speed         : number           – playback speed multiplier (default 1)
export default function Hand3D({ currentLetter, speed = 1 }) {
  const containerRef    = useRef(null);
  const handGroupRef    = useRef(null);
  const jointsRef       = useRef({});
  const lerpRef         = useRef({ progress: 1 });
  const curRef          = useRef(poseToState(NEUTRAL));
  const startRef        = useRef(poseToState(NEUTRAL));
  const targetRef       = useRef(poseToState(NEUTRAL));
  const lerpDurationRef = useRef(LERP_MS);

  // Keep lerp duration in sync with speed prop
  useEffect(() => {
    lerpDurationRef.current = Math.max(60, Math.round(LERP_MS / speed));
  }, [speed]);

  function applyState(state) {
    FINGERS.forEach(f => {
      state[f]?.forEach((rot, ji) => {
        const m = jointsRef.current[f]?.[ji];
        if (m) { m.rotation.x = rot[0]; m.rotation.y = rot[1]; m.rotation.z = rot[2]; }
      });
    });
    state.thumb?.forEach((rot, ji) => {
      const m = jointsRef.current.thumb?.[ji];
      if (m) { m.rotation.x = rot[0]; m.rotation.y = rot[1]; m.rotation.z = rot[2]; }
    });
    if (handGroupRef.current && state.handRot) {
      handGroupRef.current.rotation.x = state.handRot[0];
      handGroupRef.current.rotation.y = state.handRot[1];
      handGroupRef.current.rotation.z = state.handRot[2];
    }
  }

  function createSkinNormalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    // Palmar & Joint Creases
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 3.5;

    // Major Palmar Crease Curves (Life Line & Head Line)
    ctx.beginPath();
    ctx.arc(380, 256, 180, 0.7 * Math.PI, 1.3 * Math.PI);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(140, 180, 220, 0.1 * Math.PI, 0.6 * Math.PI);
    ctx.stroke();

    // Horizontal finger joint flexion creases
    for (let y = 40; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(20, y + (Math.random() - 0.5) * 6);
      ctx.bezierCurveTo(
        170, y - 8,
        340, y + 8,
        492, y + (Math.random() - 0.5) * 6
      );
      ctx.stroke();
    }

    // Fine Skin Pore & Grain Stippling
    const imgData = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 32;
      const v = Math.min(255, Math.max(0, imgData.data[i] + noise));
      imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    return tex;
  }

  function initScene(el) {
    const W = el.clientWidth;
    const H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 16, 32);

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0.8, 11.5);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.10;
    el.appendChild(renderer.domElement);

    // ── Studio Lighting System (4K Shadow Maps & Subsurface Translucency Rim) ────
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.9);
    keyLight.position.set(-3.5, 7.5, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = keyLight.shadow.mapSize.height = 4096;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.00005;
    keyLight.shadow.radius = 1.8;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffedd5, 0.7);
    fillLight.position.set(6, 2.5, 5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(0, 1.2, -8);
    scene.add(rimLight);

    const leftRim = new THREE.DirectionalLight(0xf472b6, 0.45);
    leftRim.position.set(-6, -1, -6);
    scene.add(leftRim);

    const ambientLight = new THREE.HemisphereLight(0xffedd5, 0x0f172a, 0.55);
    scene.add(ambientLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(25, 25),
      new THREE.ShadowMaterial({ opacity: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5.5;
    controls.maxDistance = 18;
    controls.target.set(0, 0.4, 0);

    // ── Human Skin Shader (Subsurface Translucency & Sheen) ──────────────────
    const skinBumpTex = createSkinNormalTexture();

    const SKIN_COLOR   = 0xE5A07B; // Natural warm human skin tone
    const CREASE_COLOR = 0xBE6E52; // Palmar crease shade accent
    const NAIL_BED     = 0xE59B93; // Translucent pinkish nail bed
    const NAIL_TIP     = 0xF8F4F0; // Natural white nail tip free edge

    const skinMat = new THREE.MeshPhysicalMaterial({
      color: SKIN_COLOR,
      roughness: 0.44,
      metalness: 0.01,
      clearcoat: 0.22,
      clearcoatRoughness: 0.32,
      sheen: 0.65,
      sheenRoughness: 0.38,
      sheenColor: new THREE.Color(0xffcbb5),
      transmission: 0.04,  // Subsurface light penetration
      thickness: 0.45,
      ior: 1.42,
      attenuationColor: new THREE.Color(0xff5533),
      bumpMap: skinBumpTex,
      bumpScale: 0.007,
    });

    const creaseMat = new THREE.MeshPhysicalMaterial({
      color: CREASE_COLOR,
      roughness: 0.65,
      metalness: 0.01,
    });

    const nailBedMat = new THREE.MeshPhysicalMaterial({
      color: NAIL_BED,
      roughness: 0.08,
      metalness: 0.02,
      clearcoat: 0.98,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95,
    });

    const nailTipMat = new THREE.MeshStandardMaterial({
      color: NAIL_TIP,
      roughness: 0.28,
    });

    const hand = new THREE.Group();
    handGroupRef.current = hand;
    scene.add(hand);

    // ── Anatomical Organic Palm Mass (Extruded & Beveled Contour) ────────────
    const shape = new THREE.Shape();
    shape.moveTo(0.68, -1.6);
    shape.quadraticCurveTo(1.12, -0.95, 1.05, -0.30);
    shape.lineTo(0.85, 0.58);
    shape.quadraticCurveTo(0.0, 0.72, -0.85, 0.50);
    shape.quadraticCurveTo(-1.02, -0.80, -0.68, -1.6);
    shape.closePath();

    const extrudeSettings = {
      steps: 2,
      depth: 0.44,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.10,
      bevelOffset: 0,
      bevelSegments: 6
    };

    const palmGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    palmGeo.center();
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.position.set(0, -0.50, 0);
    palm.castShadow = true;
    palm.receiveShadow = true;
    hand.add(palm);

    // Subtle Palmar Cushion Mass
    const centerPad = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 20), skinMat);
    centerPad.scale.set(1.1, 1.3, 0.35);
    centerPad.position.set(0.2, -0.55, 0.18);
    centerPad.castShadow = true;
    hand.add(centerPad);

    // Forearm / Wrist Anchor
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.48, 1.6, 24), skinMat);
    wrist.position.set(0, -2.4, -0.05);
    wrist.castShadow = true;
    hand.add(wrist);

    // Anatomical Ulnar Styloid Process (Wrist bone bump on pinky side)
    const styloid = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), skinMat);
    styloid.position.set(-0.42, -1.8, -0.05);
    styloid.castShadow = true;
    hand.add(styloid);

    // ── Articulated Finger Construction (Anatomical Knuckles & Creases) ──────
    const buildFinger = (name, xOff, yStart, segs, thick) => {
      const joints = [];
      let parent = hand;

      segs.forEach((segLen, ji) => {
        const jNode = new THREE.Mesh(
          new THREE.SphereGeometry(thick * (ji === 0 ? 0.98 : ji === 1 ? 0.92 : 0.86), 20, 20),
          skinMat
        );
        jNode.position.set(ji === 0 ? xOff : 0, ji === 0 ? yStart : segs[ji - 1], 0);
        jNode.castShadow = true;
        parent.add(jNode);

        // Dorsal Knuckle Cap
        const dorsalKnuckle = new THREE.Mesh(
          new THREE.SphereGeometry(thick * (ji === 0 ? 1.05 : 0.98), 16, 16),
          skinMat
        );
        dorsalKnuckle.scale.set(0.95, 0.75, 1.18);
        dorsalKnuckle.position.set(0, 0, -thick * 0.12);
        dorsalKnuckle.castShadow = true;
        jNode.add(dorsalKnuckle);

        // Palmar Flexion Crease Ring
        const creaseRing = new THREE.Mesh(
          new THREE.TorusGeometry(thick * (ji === 0 ? 0.92 : 0.86), thick * 0.08, 8, 20),
          creaseMat
        );
        creaseRing.rotation.x = Math.PI / 2;
        creaseRing.position.set(0, 0, 0);
        jNode.add(creaseRing);

        // Tapered Phalange Segment
        const topRadius = thick * (ji === 2 ? 0.62 : ji === 1 ? 0.70 : 0.78);
        const botRadius = thick * (ji === 0 ? 0.92 : ji === 1 ? 0.85 : 0.76);
        const bone = new THREE.Mesh(
          new THREE.CylinderGeometry(topRadius, botRadius, segLen * 1.06, 20),
          skinMat
        );
        bone.position.set(0, segLen / 2, 0);
        bone.castShadow = true;
        jNode.add(bone);

        // Soft Round Fingertip Pad
        if (ji === 2) {
          const tipCap = new THREE.Mesh(new THREE.SphereGeometry(topRadius * 1.02, 16, 16), skinMat);
          tipCap.position.set(0, segLen, 0);
          tipCap.scale.set(1.0, 0.85, 0.8);
          jNode.add(tipCap);
        }

        joints.push(jNode);
        parent = jNode;
      });

      // Detailed 2-Tone Fingernail
      const nailGroup = new THREE.Group();
      const nailBed = new THREE.Mesh(new THREE.BoxGeometry(thick * 1.05, thick * 0.52, 0.07), nailBedMat);
      nailBed.castShadow = true;
      nailGroup.add(nailBed);

      const nailTip = new THREE.Mesh(new THREE.BoxGeometry(thick * 1.05, thick * 0.14, 0.08), nailTipMat);
      nailTip.position.set(0, thick * 0.32, 0.005);
      nailGroup.add(nailTip);

      nailGroup.position.set(0, segs[2] * 0.65, thick * 0.52);
      nailGroup.rotation.x = -0.15;
      joints[2].add(nailGroup);

      jointsRef.current[name] = joints;
    };

    buildFinger('pinky',  -0.78, 0.52, [0.42, 0.34, 0.26], 0.115);
    buildFinger('ring',   -0.26, 0.62, [0.52, 0.43, 0.33], 0.125);
    buildFinger('middle',  0.24, 0.66, [0.58, 0.48, 0.37], 0.130);
    buildFinger('index',   0.72, 0.60, [0.52, 0.43, 0.33], 0.122);

    // ── Thumb Construction ──────────────────────────────────────────────────
    const tThick = 0.150, tSeg0 = 0.48, tSeg1 = 0.40;

    const tBase = new THREE.Mesh(new THREE.SphereGeometry(tThick * 1.04, 20, 20), skinMat);
    tBase.position.set(1.02, -0.32, 0.14);
    tBase.castShadow = true;
    hand.add(tBase);

    const tb1 = new THREE.Mesh(
      new THREE.CylinderGeometry(tThick * 0.78, tThick * 0.98, tSeg0 * 1.08, 20),
      skinMat
    );
    tb1.position.set(0, tSeg0 / 2, 0);
    tb1.castShadow = true;
    tBase.add(tb1);

    const tTip = new THREE.Mesh(new THREE.SphereGeometry(tThick * 0.92, 20, 20), skinMat);
    tTip.position.set(0, tSeg0, 0);
    tTip.castShadow = true;
    tBase.add(tTip);

    const tb2 = new THREE.Mesh(
      new THREE.CylinderGeometry(tThick * 0.65, tThick * 0.88, tSeg1 * 1.08, 20),
      skinMat
    );
    tb2.position.set(0, tSeg1 / 2, 0);
    tb2.castShadow = true;
    tTip.add(tb2);

    const tCap = new THREE.Mesh(new THREE.SphereGeometry(tThick * 0.68, 16, 16), skinMat);
    tCap.position.set(0, tSeg1, 0);
    tCap.scale.set(1.0, 0.85, 0.8);
    tTip.add(tCap);

    const tNailGroup = new THREE.Group();
    const tNailBed = new THREE.Mesh(new THREE.BoxGeometry(tThick * 1.05, tThick * 0.52, 0.07), nailBedMat);
    tNailBed.castShadow = true;
    tNailGroup.add(tNailBed);

    const tNailTip = new THREE.Mesh(new THREE.BoxGeometry(tThick * 1.05, tThick * 0.14, 0.08), nailTipMat);
    tNailTip.position.set(0, tThick * 0.32, 0.005);
    tNailGroup.add(tNailTip);

    tNailGroup.position.set(0, tSeg1 * 0.65, tThick * 0.55);
    tNailGroup.rotation.x = -0.15;
    tTip.add(tNailGroup);

    jointsRef.current['thumb'] = [tBase, tTip];

    applyState(curRef.current);

    let raf, last = performance.now();
    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const dt = now - last; last = now;
      if (lerpRef.current.progress < 1) {
        lerpRef.current.progress = Math.min(lerpRef.current.progress + dt / lerpDurationRef.current, 1);
        const p = lerpRef.current.progress;
        const t = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        curRef.current = lerpState(startRef.current, targetRef.current, t);
        applyState(curRef.current);
      }

      // Organic lifelike idle micro-movement (subtle natural breathing sway)
      const baseRotX = curRef.current.handRot?.[0] ?? -0.05;
      const baseRotY = curRef.current.handRot?.[1] ?? 0.08;
      const baseRotZ = curRef.current.handRot?.[2] ?? 0;
      const idleSwayX = Math.sin(now * 0.0012) * 0.008;
      const idleSwayY = Math.cos(now * 0.0015) * 0.010;
      if (handGroupRef.current) {
        handGroupRef.current.rotation.x = baseRotX + idleSwayX;
        handGroupRef.current.rotation.y = baseRotY + idleSwayY;
        handGroupRef.current.rotation.z = baseRotZ;

        // Dynamic motion stroke tracing for J (curved hook) and Z (3-stroke zigzag)
        const p = lerpRef.current.progress;
        const key = activeLetterRef.current;
        if (key === 'j') {
          const jX = Math.sin(p * Math.PI) * 0.40;
          const jY = -Math.sin(p * Math.PI * 0.85) * 0.55;
          const jZ = Math.sin(p * Math.PI) * 0.25;
          handGroupRef.current.position.set(jX, jY, jZ);
        } else if (key === 'z') {
          let zX = 0, zY = 0;
          if (p < 0.33) {
            zX = THREE.MathUtils.lerp(-0.45, 0.45, p / 0.33);
            zY = 0.35;
          } else if (p < 0.66) {
            const t2 = (p - 0.33) / 0.33;
            zX = THREE.MathUtils.lerp(0.45, -0.45, t2);
            zY = THREE.MathUtils.lerp(0.35, -0.35, t2);
          } else {
            const t3 = (p - 0.66) / 0.34;
            zX = THREE.MathUtils.lerp(-0.45, 0.45, t3);
            zY = -0.35;
          }
          handGroupRef.current.position.set(zX, zY, 0);
        } else {
          handGroupRef.current.position.set(0, 0, 0);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate(performance.now());

    return { renderer, camera, controls, cancelAnim: () => cancelAnimationFrame(raf) };
  }

  const activeLetterRef = useRef(null);

  // Scene setup with ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let sceneObj = null;

    const tryInit = () => {
      if (sceneObj) return;
      if (el.clientWidth > 0 && el.clientHeight > 0) sceneObj = initScene(el);
    };
    tryInit();

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!sceneObj && width > 0 && height > 0) tryInit();
        else if (sceneObj && width > 0 && height > 0) {
          sceneObj.camera.aspect = width / height;
          sceneObj.camera.updateProjectionMatrix();
          sceneObj.renderer.setSize(width, height);
        }
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (sceneObj) {
        sceneObj.cancelAnim(); sceneObj.controls.dispose();
        if (el && sceneObj.renderer.domElement.parentNode === el)
          el.removeChild(sceneObj.renderer.domElement);
        sceneObj.renderer.dispose();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pose trigger — ONLY starts the lerp transition; no timers, no callbacks
  useEffect(() => {
    const key = currentLetter?.trim().toLowerCase();
    activeLetterRef.current = key;
    const pose = (key && POSES[key]) ? POSES[key] : NEUTRAL;
    startRef.current  = JSON.parse(JSON.stringify(curRef.current));
    targetRef.current = poseToState(pose);
    lerpRef.current.progress = 0;
  }, [currentLetter]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
}

