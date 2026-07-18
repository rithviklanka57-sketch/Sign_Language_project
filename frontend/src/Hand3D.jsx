import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- POSE CONSTANTS (Rotations in Radians) ---
const EXTENDED = [0, 0, 0];
const CURL_90 = [1.4, 0, 0];
const CURL_60 = [0.8, 0, 0];
const CURL_45 = [0.5, 0, 0];

// --- A-Z FINGERSPELLING POSE LIBRARY ---
// Each entry defines the target rotation [x, y, z] for each finger's joints.
// Only X-rotation (curl) is used for simplicity; Y/Z used for spread/splay.
const LETTER_POSES = {
  a: { index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.5, 0.4, 0] },
  b: { index: EXTENDED, middle: EXTENDED, ring: EXTENDED, pinky: EXTENDED, thumb: [0.2, 0.6, 0] },
  c: { index: CURL_60, middle: CURL_60, ring: CURL_60, pinky: CURL_60, thumb: [0.4, 0.3, 0] },
  d: { index: EXTENDED, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.7, 0.6, 0] },
  e: { index: CURL_60, middle: CURL_60, ring: CURL_60, pinky: CURL_60, thumb: [0.8, 0.6, 0] },
  f: { index: CURL_60, middle: EXTENDED, ring: EXTENDED, pinky: EXTENDED, thumb: [0.6, 0.4, 0] },
  g: { index: [0, 0, 1.4], middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0, 0, -0.5] },
  h: { index: EXTENDED, middle: EXTENDED, ring: CURL_90, pinky: CURL_90, thumb: [0.8, 0.6, 0] },
  i: { index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: EXTENDED, thumb: [0.8, 0.6, 0] },
  j: { index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: EXTENDED, thumb: [0.8, 0.6, 0] },
  k: { index: EXTENDED, middle: CURL_45, ring: CURL_90, pinky: CURL_90, thumb: [0.2, 0, -0.2] },
  l: { index: EXTENDED, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0, 0, -1.2] },
  m: { index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.9, 0.5, 0] },
  n: { index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.7, 0.4, 0] },
  o: { index: CURL_60, middle: CURL_60, ring: CURL_60, pinky: CURL_60, thumb: [0.8, 0.8, 0] },
  p: { index: EXTENDED, middle: CURL_45, ring: CURL_90, pinky: CURL_90, thumb: [0.2, 0, -0.2] },
  q: { index: CURL_60, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.6, 0.4, 0] },
  r: { index: [0, 0, 0.2], middle: [0, 0, -0.2], ring: CURL_90, pinky: CURL_90, thumb: [0.8, 0.6, 0] },
  s: { index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.8, 0.8, 0] },
  t: { index: [1.2, 0, 0], middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.5, 0.3, 0] },
  u: { index: EXTENDED, middle: EXTENDED, ring: CURL_90, pinky: CURL_90, thumb: [0.8, 0.6, 0] },
  v: { index: [0, 0, 0.3], middle: [0, 0, -0.3], ring: CURL_90, pinky: CURL_90, thumb: [0.8, 0.6, 0] },
  w: { index: EXTENDED, middle: EXTENDED, ring: EXTENDED, pinky: CURL_90, thumb: [0.8, 0.6, 0] },
  x: { index: CURL_60, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.8, 0.6, 0] },
  y: { index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: EXTENDED, thumb: [0, 0, -1.2] },
  z: { index: EXTENDED, middle: CURL_90, ring: CURL_90, pinky: CURL_90, thumb: [0.8, 0.6, 0] },
};

// Default neutral hand pose
const DEFAULT_POSE = {
  index: EXTENDED, middle: EXTENDED, ring: EXTENDED, pinky: EXTENDED,
  thumb: EXTENDED,
};

export default function Hand3D({ currentLetter, isPlaying, onItemComplete }) {
  const containerRef = useRef(null);
  const lerpProgress = useRef(1); // Start at 1 = "already at target"
  const lerpDuration = useRef(500);

  const jointsRef = useRef({});
  const startRotations = useRef({});
  const targetRotations = useRef({});
  const currentRotations = useRef({});
  const onItemCompleteRef = useRef(onItemComplete);

  useEffect(() => {
    onItemCompleteRef.current = onItemComplete;
  }, [onItemComplete]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    // Atmospheric fog
    scene.fog = new THREE.FogExp2(0x0f172a, 0.08);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // --- LIGHTING ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(5, 10, 7);
    key.castShadow = true;
    scene.add(key);
    // Neon fill light
    const fill = new THREE.DirectionalLight(0xa855f7, 0.6);
    fill.position.set(-5, -5, -3);
    scene.add(fill);
    const back = new THREE.DirectionalLight(0x38bdf8, 0.3);
    back.position.set(0, 5, -8);
    scene.add(back);

    // Subtle grid ground
    const grid = new THREE.GridHelper(20, 30, 0x1e293b, 0x1e293b);
    grid.position.y = -4;
    scene.add(grid);

    // --- ORBIT CONTROLS ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 16;
    controls.target.set(0, 0.5, 0);

    // --- MATERIALS ---
    const palmMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.3,
    });
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.2,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0x9333ea,
      emissiveIntensity: 1.0,
      roughness: 0.3,
    });
    const fingertipMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    // --- BUILD HAND ---
    const handGroup = new THREE.Group();
    scene.add(handGroup);

    // Palm
    const palmGeo = new THREE.BoxGeometry(2.1, 2.4, 0.45);
    const palm = new THREE.Mesh(palmGeo, palmMat);
    palm.position.set(0, -0.6, 0);
    palm.castShadow = true;
    handGroup.add(palm);

    // Wrist cylinder
    const wristGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.6, 16);
    const wrist = new THREE.Mesh(wristGeo, boneMat);
    wrist.position.set(0, -1.9, 0);
    handGroup.add(wrist);

    // Helper: build a finger with 3 joints and 3 bone segments
    const buildFinger = (name, xOffset, yStart, segLen, thickness) => {
      const joints = [];
      let parent = handGroup;
      for (let j = 0; j < 3; j++) {
        // Joint sphere
        const mat = j === 2 ? fingertipMat : jointMat;
        const jGeo = new THREE.SphereGeometry(thickness * 1.25, 12, 12);
        const jMesh = new THREE.Mesh(jGeo, mat);
        jMesh.position.set(j === 0 ? xOffset : 0, j === 0 ? yStart : segLen, 0);
        jMesh.castShadow = true;
        parent.add(jMesh);

        // Bone segment
        const bGeo = new THREE.CylinderGeometry(thickness * 0.7, thickness, segLen, 12);
        const bMesh = new THREE.Mesh(bGeo, boneMat);
        bMesh.position.set(0, segLen / 2, 0);
        bMesh.castShadow = true;
        jMesh.add(bMesh);

        joints.push(jMesh);
        parent = jMesh;
      }
      jointsRef.current[name] = joints;
    };

    buildFinger('pinky',  -0.78, 0.45, 0.38, 0.10);
    buildFinger('ring',   -0.27, 0.56, 0.46, 0.12);
    buildFinger('middle',  0.22, 0.60, 0.52, 0.12);
    buildFinger('index',   0.70, 0.56, 0.46, 0.12);

    // Thumb (2 joints, angled)
    const thumbJoints = [];
    const tThick = 0.14;
    const tSeg = 0.46;
    const tBase = new THREE.Mesh(new THREE.SphereGeometry(tThick * 1.3, 12, 12), jointMat);
    tBase.position.set(0.95, -0.22, 0.15);
    tBase.rotation.z = -0.55;
    tBase.castShadow = true;
    handGroup.add(tBase);
    const tb1 = new THREE.Mesh(new THREE.CylinderGeometry(tThick * 0.75, tThick, tSeg, 12), boneMat);
    tb1.position.set(0, tSeg / 2, 0);
    tBase.add(tb1);
    thumbJoints.push(tBase);

    const tTip = new THREE.Mesh(new THREE.SphereGeometry(tThick * 1.1, 12, 12), fingertipMat);
    tTip.position.set(0, tSeg, 0);
    tBase.add(tTip);
    const tb2 = new THREE.Mesh(new THREE.CylinderGeometry(tThick * 0.65, tThick * 0.9, tSeg, 12), boneMat);
    tb2.position.set(0, tSeg / 2, 0);
    tTip.add(tb2);
    thumbJoints.push(tTip);

    jointsRef.current['thumb'] = thumbJoints;

    // --- INIT ROTATIONS ---
    const makeRotState = () => ({
      index:  [[0,0,0],[0,0,0],[0,0,0]],
      middle: [[0,0,0],[0,0,0],[0,0,0]],
      ring:   [[0,0,0],[0,0,0],[0,0,0]],
      pinky:  [[0,0,0],[0,0,0],[0,0,0]],
      thumb:  [[0,0,0],[0,0,0]],
    });
    currentRotations.current = makeRotState();
    startRotations.current   = makeRotState();
    targetRotations.current  = makeRotState();

    handGroup.rotation.y = -0.35;
    handGroup.rotation.x =  0.15;

    // --- ANIMATION LOOP ---
    let raf;
    let lastTime = performance.now();

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      const delta = now - lastTime;
      lastTime = now;

      if (lerpProgress.current < 1) {
        lerpProgress.current = Math.min(lerpProgress.current + delta / lerpDuration.current, 1);
        // Ease-in-out curve
        const t = lerpProgress.current < 0.5
          ? 2 * lerpProgress.current * lerpProgress.current
          : 1 - Math.pow(-2 * lerpProgress.current + 2, 2) / 2;

        const fingers = ['index', 'middle', 'ring', 'pinky'];
        fingers.forEach(f => {
          for (let j = 0; j < 3; j++) {
            for (let ax = 0; ax < 3; ax++) {
              currentRotations.current[f][j][ax] = THREE.MathUtils.lerp(
                startRotations.current[f][j][ax],
                targetRotations.current[f][j][ax],
                t
              );
            }
            const mesh = jointsRef.current[f]?.[j];
            if (mesh) {
              mesh.rotation.x = currentRotations.current[f][j][0];
              mesh.rotation.y = currentRotations.current[f][j][1];
              mesh.rotation.z = currentRotations.current[f][j][2];
            }
          }
        });

        // Thumb (2 joints)
        for (let j = 0; j < 2; j++) {
          for (let ax = 0; ax < 3; ax++) {
            currentRotations.current.thumb[j][ax] = THREE.MathUtils.lerp(
              startRotations.current.thumb[j][ax],
              targetRotations.current.thumb[j][ax],
              t
            );
          }
          const mesh = jointsRef.current.thumb?.[j];
          if (mesh) {
            mesh.rotation.x = currentRotations.current.thumb[j][0];
            mesh.rotation.y = currentRotations.current.thumb[j][1];
            mesh.rotation.z = currentRotations.current.thumb[j][2];
          }
        }

        if (lerpProgress.current >= 1) {
          onItemCompleteRef.current?.();
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate(performance.now());

    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // --- POSE TRIGGER ---
  useEffect(() => {
    const letter = currentLetter?.trim().toLowerCase();
    const pose = (letter && LETTER_POSES[letter]) ? LETTER_POSES[letter] : DEFAULT_POSE;

    // Snapshot current state as start
    startRotations.current = JSON.parse(JSON.stringify(currentRotations.current));

    // Build target state from pose
    const target = {
      index:  [[0,0,0],[0,0,0],[0,0,0]],
      middle: [[0,0,0],[0,0,0],[0,0,0]],
      ring:   [[0,0,0],[0,0,0],[0,0,0]],
      pinky:  [[0,0,0],[0,0,0],[0,0,0]],
      thumb:  [[0,0,0],[0,0,0]],
    };

    ['index', 'middle', 'ring', 'pinky'].forEach(f => {
      const rot = pose[f] || EXTENDED;
      for (let j = 0; j < 3; j++) {
        // Apply decreasing curl for natural finger bend
        const scale = j === 0 ? 1.0 : j === 1 ? 0.9 : 0.7;
        target[f][j] = [
          (rot[0] || 0) * scale,
          rot[1] || 0,
          rot[2] || 0,
        ];
      }
    });

    const tRot = pose.thumb || EXTENDED;
    for (let j = 0; j < 2; j++) {
      target.thumb[j] = [tRot[0] || 0, tRot[1] || 0, tRot[2] || 0];
    }

    targetRotations.current = target;
    lerpDuration.current = isPlaying ? 400 : 600;
    lerpProgress.current = 0; // Start transition
  }, [currentLetter, isPlaying]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
}
