import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── ASL POSE LIBRARY (per-joint, matched to standard ASL chart) ─────────────
//
// finger: [MCP_curl, PIP_curl, DIP_curl, MCP_spread_z]  (radians, X = curl in, Z = spread)
// thumb:  [base_curl_x, tip_curl_x, base_z_rotation]
//   base_z_rotation: -0.55 = natural resting; -1.4 = fully sideways (L/Y); +0.8 = across palm (B)
//
const POSES = {
  // A – Tight fist, thumb rests alongside index
  a: {
    index:  [1.4, 1.5, 1.1, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.4, 0.5, -0.1],   // alongside fist
  },
  // B – All fingers straight up, thumb folded across palm
  b: {
    index:  [0, 0, 0, 0],
    middle: [0, 0, 0, 0],
    ring:   [0, 0, 0, 0],
    pinky:  [0, 0, 0, 0],
    thumb:  [0.3, 0.2, 0.75],   // folded across palm
  },
  // C – Curved C shape, like gripping a ball
  c: {
    index:  [0.5, 0.8, 0.6, 0],
    middle: [0.5, 0.8, 0.6, 0],
    ring:   [0.5, 0.8, 0.6, 0],
    pinky:  [0.5, 0.8, 0.6, 0],
    thumb:  [0.3, 0.3, -0.45],  // curves to meet fingers
  },
  // D – Index up, others curl to touch thumb tip
  d: {
    index:  [0, 0, 0, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.8, 0.7, -0.3],   // touches curled fingers
  },
  // E – All fingers hooked/clawed down, thumb tucked
  e: {
    index:  [0.4, 1.5, 1.5, 0],
    middle: [0.4, 1.5, 1.5, 0],
    ring:   [0.4, 1.5, 1.5, 0],
    pinky:  [0.4, 1.5, 1.5, 0],
    thumb:  [0.8, 0.4, 0.35],   // tucked under
  },
  // F – Index+thumb make OK, other three extended
  f: {
    index:  [0.8, 0.9, 0.5, 0],
    middle: [0, 0, 0, 0],
    ring:   [0, 0, 0, 0],
    pinky:  [0, 0, 0, 0],
    thumb:  [0.5, 0.5, -0.25],
  },
  // G – Index and thumb point sideways (gun shape)
  g: {
    index:  [0, 0, 0,  1.45],  // spread sideways
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.1, 0.1, -0.55], // points sideways with index
  },
  // H – Index and middle extended sideways together
  h: {
    index:  [0, 0, 0, 1.3],
    middle: [0, 0, 0, 1.3],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
  // I – Only pinky extended, others fisted
  i: {
    index:  [1.4, 1.5, 1.1, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [0, 0, 0, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
  // J – Same static pose as I (J is a motion)
  j: {
    index:  [1.4, 1.5, 1.1, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [0, 0, 0, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
  // K – Index up, middle angled forward, thumb between them
  k: {
    index:  [0, 0, 0, 0],
    middle: [0.35, 0.5, 0.4, -0.25],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.25, 0.3, -0.45],
  },
  // L – Index up, thumb fully extended to the side (clear L shape)
  l: {
    index:  [0, 0, 0, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.05, 0.1, -1.4],  // fully horizontal
  },
  // M – Three fingers folded over tucked thumb
  m: {
    index:  [1.4, 1.5, 1.1, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.5, 0.3, 0.15],   // tucked under 3 fingers
  },
  // N – Two fingers folded over thumb
  n: {
    index:  [1.4, 1.5, 1.1, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.5, 0.3, 0.0],    // tucked under 2 fingers
  },
  // O – All fingertips touching thumb forming O
  o: {
    index:  [0.65, 1.0, 0.9, 0],
    middle: [0.65, 1.0, 0.9, 0],
    ring:   [0.65, 1.0, 0.9, 0],
    pinky:  [0.65, 1.0, 0.9, 0],
    thumb:  [0.5, 0.6, -0.2],   // rounds to meet fingers
  },
  // P – Index + middle pointing forward/down (like K inverted)
  p: {
    index:  [0.3, 0.4, 0.3, -0.2],
    middle: [0.4, 0.5, 0.4, -0.2],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.25, 0.3, -0.45],
  },
  // Q – Like G but pointing down
  q: {
    index:  [0.5, 0.6, 0.4, 1.2],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.3, 0.3, -0.4],
  },
  // R – Index and middle fingers crossed over each other
  r: {
    index:  [0, 0, 0,  0.25],
    middle: [0, 0, 0, -0.38],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
  // S – Tight fist, thumb wrapped over top of fingers
  s: {
    index:  [1.4, 1.5, 1.2, 0],
    middle: [1.4, 1.5, 1.2, 0],
    ring:   [1.4, 1.5, 1.2, 0],
    pinky:  [1.4, 1.5, 1.2, 0],
    thumb:  [0.6, 0.4, 0.55],   // over the top of fingers
  },
  // T – Index partially bent, thumb sticks up between index and middle
  t: {
    index:  [1.2, 1.4, 0.8, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.3, 0.2, -0.1],
  },
  // U – Index and middle straight up together (no spread)
  u: {
    index:  [0, 0, 0,  0.07],
    middle: [0, 0, 0, -0.07],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
  // V – Peace sign: index and middle spread apart
  v: {
    index:  [0, 0, 0,  0.35],
    middle: [0, 0, 0, -0.35],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
  // W – Three fingers spread (index, middle, ring)
  w: {
    index:  [0, 0, 0,  0.42],
    middle: [0, 0, 0,  0.02],
    ring:   [0, 0, 0, -0.42],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
  // X – Index finger hooked like a crooked/bent hook
  x: {
    index:  [0.85, 1.4, 0.75, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
  // Y – Thumb and pinky extended; index/middle/ring curled
  y: {
    index:  [1.4, 1.5, 1.1, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [0, 0, 0, -0.3],   // pinky spread outward
    thumb:  [0.1, 0.1, -1.4],  // fully sideways
  },
  // Z – Index points forward, traces Z (static = pointing)
  z: {
    index:  [0, 0, 0, 0],
    middle: [1.4, 1.5, 1.1, 0],
    ring:   [1.4, 1.5, 1.1, 0],
    pinky:  [1.4, 1.5, 1.1, 0],
    thumb:  [0.7, 0.5, -0.2],
  },
};

// Neutral open hand (palm facing camera)
const NEUTRAL = {
  index:  [0.1, 0.1, 0.1, 0.05],
  middle: [0.1, 0.1, 0.1, 0],
  ring:   [0.1, 0.1, 0.1, -0.05],
  pinky:  [0.1, 0.1, 0.1, -0.1],
  thumb:  [0.2, 0.2, -0.55],
};

const FINGERS   = ['index', 'middle', 'ring', 'pinky'];
const LERP_MS   = 380;
const HOLD_MS   = 800;

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
  return s;
}

function lerpState(s, t, k) {
  const r = {};
  FINGERS.forEach(f => {
    r[f] = s[f].map((sj, ji) => sj.map((sv, ax) => THREE.MathUtils.lerp(sv, t[f][ji][ax], k)));
  });
  r.thumb = s.thumb.map((sj, ji) => sj.map((sv, ax) => THREE.MathUtils.lerp(sv, t.thumb[ji][ax], k)));
  return r;
}

export default function Hand3D({ currentLetter, isPlaying, onItemComplete }) {
  const containerRef  = useRef(null);
  const jointsRef     = useRef({});
  const lerpRef       = useRef({ progress: 1 });
  const holdTimerRef  = useRef(null);
  const curRef        = useRef(poseToState(NEUTRAL));
  const startRef      = useRef(poseToState(NEUTRAL));
  const targetRef     = useRef(poseToState(NEUTRAL));
  const onCompleteRef = useRef(onItemComplete);
  const isPlayingRef  = useRef(isPlaying);
  const sceneObjRef   = useRef(null);

  useEffect(() => { onCompleteRef.current = onItemComplete; }, [onItemComplete]);
  useEffect(() => { isPlayingRef.current  = isPlaying; },    [isPlaying]);

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
  }

  function initScene(el) {
    const W = el.clientWidth;
    const H = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    scene.fog = new THREE.Fog(0x111827, 18, 30);

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0.8, 12);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    // ── Lighting ──────────────────────────────────────────────────────────────
    // Main key light (from upper-front left)
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.4);
    keyLight.position.set(-3, 8, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width  = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);
    // Warm fill from right
    const fillLight = new THREE.DirectionalLight(0xffe0b2, 0.6);
    fillLight.position.set(5, 3, 6);
    scene.add(fillLight);
    // Cool rim from behind
    const rimLight = new THREE.DirectionalLight(0xbfdbfe, 0.4);
    rimLight.position.set(0, -2, -8);
    scene.add(rimLight);
    // Soft ambient
    scene.add(new THREE.AmbientLight(0xffd7b5, 0.5));

    // Subtle floor shadow catcher
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance   = 6;
    controls.maxDistance   = 20;
    controls.target.set(0, 0.5, 0);

    // ── Skin Materials ───────────────────────────────────────────────────────
    const SKIN_BASE  = 0xE8A87C;  // warm peach/tan
    const SKIN_DARK  = 0xD08B5B;  // knuckle crease / palm shadow
    const SKIN_TIP   = 0xF2C49B;  // slightly lighter fingertip
    const NAIL_COLOR = 0xF8D7C0;  // pale pink for nail flat

    const palmMat  = new THREE.MeshStandardMaterial({ color: SKIN_DARK, roughness: 0.85, metalness: 0.0 });
    const boneMat  = new THREE.MeshStandardMaterial({ color: SKIN_BASE, roughness: 0.80, metalness: 0.0 });
    const jointMat = new THREE.MeshStandardMaterial({ color: SKIN_DARK, roughness: 0.82, metalness: 0.0 });
    const tipMat   = new THREE.MeshStandardMaterial({ color: SKIN_TIP,  roughness: 0.75, metalness: 0.0 });

    const hand = new THREE.Group();
    scene.add(hand);

    // ── Palm ─────────────────────────────────────────────────────────────────
    // Slightly rounded box for the palm
    const palmGeo = new THREE.BoxGeometry(2.4, 2.8, 0.52, 2, 2, 2);
    const palm = new THREE.Mesh(palmGeo, palmMat);
    palm.position.set(0, -0.7, 0);
    palm.castShadow = true;
    palm.receiveShadow = true;
    hand.add(palm);

    // Knuckle ridge on top of palm
    for (let i = 0; i < 4; i++) {
      const kx = [-0.82, -0.28, 0.24, 0.72][i];
      const knuckle = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 10),
        jointMat
      );
      knuckle.position.set(kx, 0.72, 0.12);
      knuckle.castShadow = true;
      hand.add(knuckle);
    }

    // Wrist
    const wristGeo = new THREE.CylinderGeometry(0.36, 0.42, 0.8, 18);
    const wrist = new THREE.Mesh(wristGeo, palmMat);
    wrist.position.set(0, -2.2, 0);
    wrist.castShadow = true;
    hand.add(wrist);

    // ── Build a finger (3 joints, each with a bone cylinder child) ───────────
    const buildFinger = (name, xOff, yStart, [s0, s1, s2], thick) => {
      const joints = [];
      let parent  = hand;
      const segs  = [s0, s1, s2];
      const mats  = [jointMat, jointMat, tipMat];

      segs.forEach((segLen, ji) => {
        // Joint sphere
        const jNode = new THREE.Mesh(
          new THREE.SphereGeometry(thick * 1.28, 14, 14),
          mats[ji]
        );
        jNode.position.set(ji === 0 ? xOff : 0, ji === 0 ? yStart : segs[ji - 1], 0);
        jNode.castShadow = true;
        parent.add(jNode);

        // Bone cylinder
        const bone = new THREE.Mesh(
          new THREE.CylinderGeometry(thick * 0.62, thick * 0.88, segLen, 14),
          boneMat
        );
        bone.position.set(0, segLen / 2, 0);
        bone.castShadow = true;
        jNode.add(bone);

        joints.push(jNode);
        parent = jNode;
      });

      // Tiny nail on fingertip
      const nailGeo = new THREE.BoxGeometry(thick * 1.5, thick * 0.6, 0.06);
      const nail = new THREE.Mesh(nailGeo, new THREE.MeshStandardMaterial({ color: NAIL_COLOR, roughness: 0.4 }));
      nail.position.set(0, segs[2] * 0.55, thick * 0.7);
      joints[2].add(nail);

      jointsRef.current[name] = joints;
    };

    // Finger layout: name, xOffset, yStart, [seg0, seg1, seg2], thickness
    buildFinger('pinky',  -0.82, 0.72, [0.42, 0.34, 0.26], 0.105);
    buildFinger('ring',   -0.28, 0.84, [0.52, 0.43, 0.33], 0.120);
    buildFinger('middle',  0.24, 0.88, [0.58, 0.48, 0.37], 0.125);
    buildFinger('index',   0.72, 0.82, [0.52, 0.43, 0.33], 0.118);

    // ── Thumb (2 joints) ─────────────────────────────────────────────────────
    const tThick = 0.155;
    const tSeg0  = 0.50;
    const tSeg1  = 0.42;

    const tBase = new THREE.Mesh(
      new THREE.SphereGeometry(tThick * 1.35, 14, 14),
      jointMat
    );
    tBase.position.set(1.10, -0.30, 0.14);
    // NOTE: NO initial rotation — pose data handles everything
    tBase.castShadow = true;
    hand.add(tBase);

    const tb1 = new THREE.Mesh(
      new THREE.CylinderGeometry(tThick * 0.70, tThick, tSeg0, 14),
      boneMat
    );
    tb1.position.set(0, tSeg0 / 2, 0);
    tBase.add(tb1);

    const tTip = new THREE.Mesh(
      new THREE.SphereGeometry(tThick * 1.15, 14, 14),
      tipMat
    );
    tTip.position.set(0, tSeg0, 0);
    tBase.add(tTip);

    const tb2 = new THREE.Mesh(
      new THREE.CylinderGeometry(tThick * 0.58, tThick * 0.92, tSeg1, 14),
      boneMat
    );
    tb2.position.set(0, tSeg1 / 2, 0);
    tTip.add(tb2);

    // Thumbnail
    const tNail = new THREE.Mesh(
      new THREE.BoxGeometry(tThick * 1.5, tThick * 0.6, 0.06),
      new THREE.MeshStandardMaterial({ color: NAIL_COLOR, roughness: 0.4 })
    );
    tNail.position.set(0, tSeg1 * 0.55, tThick * 0.75);
    tTip.add(tNail);

    jointsRef.current['thumb'] = [tBase, tTip];

    // Orient hand: palm facing camera, slight upward tilt
    hand.rotation.y =  0.08;   // very slight angle to show thumb side
    hand.rotation.x = -0.05;   // nearly straight-on

    // Apply initial neutral pose
    applyState(curRef.current);

    // ── Render Loop ──────────────────────────────────────────────────────────
    let raf;
    let last = performance.now();
    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const dt = now - last; last = now;

      if (lerpRef.current.progress < 1) {
        lerpRef.current.progress = Math.min(lerpRef.current.progress + dt / LERP_MS, 1);
        const p = lerpRef.current.progress;
        // Smooth ease-in-out cubic
        const t = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        curRef.current = lerpState(startRef.current, targetRef.current, t);
        applyState(curRef.current);
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate(performance.now());

    return {
      renderer,
      camera,
      controls,
      cancelAnim: () => cancelAnimationFrame(raf),
    };
  }

  // ── Mount with ResizeObserver (deferred init for safe layout) ───────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let sceneObj = null;

    const tryInit = () => {
      if (sceneObj) return;
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (W > 0 && H > 0) {
        sceneObj = initScene(el);
        sceneObjRef.current = sceneObj;
      }
    };

    tryInit();

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (!sceneObj && width > 0 && height > 0) {
          tryInit();
        } else if (sceneObj && width > 0 && height > 0) {
          sceneObj.camera.aspect = width / height;
          sceneObj.camera.updateProjectionMatrix();
          sceneObj.renderer.setSize(width, height);
        }
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      clearTimeout(holdTimerRef.current);
      if (sceneObj) {
        sceneObj.cancelAnim();
        sceneObj.controls.dispose();
        if (el && sceneObj.renderer.domElement.parentNode === el) {
          el.removeChild(sceneObj.renderer.domElement);
        }
        sceneObj.renderer.dispose();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pose trigger ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(holdTimerRef.current);

    const key  = currentLetter?.trim().toLowerCase();
    const pose = (key && POSES[key]) ? POSES[key] : NEUTRAL;

    startRef.current  = JSON.parse(JSON.stringify(curRef.current));
    targetRef.current = poseToState(pose);
    lerpRef.current.progress = 0;

    if (isPlayingRef.current) {
      holdTimerRef.current = setTimeout(() => {
        onCompleteRef.current?.();
      }, LERP_MS + HOLD_MS);
    }

    return () => clearTimeout(holdTimerRef.current);
  }, [currentLetter]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
}
