import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- POSE CONSTANTS (Rotations in Radians) ---
const EXTENDED = [0, 0, 0];
const CURL_90 = [1.4, 1.4, 0.8]; // Bend knuckle 1, knuckle 2, knuckle 3
const CURL_60 = [0.8, 0.8, 0.4];

// Fingerspelling Pose Library (A-Z)
const LETTER_POSES = {
  a: { // Fist: all fingers curled, thumb bent sideways over index
    index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.5, 0.4, 0.2]
  },
  b: { // Flat hand: all fingers extended, thumb crossed in front of palm
    index: EXTENDED, middle: EXTENDED, ring: EXTENDED, pinky: EXTENDED,
    thumb: [0.2, 0.8, 0.8]
  },
  c: { // Curved hand shape
    index: CURL_60, middle: CURL_60, ring: CURL_60, pinky: CURL_60,
    thumb: [0.4, 0.4, 0.2]
  },
  d: { // Index pointing up, others closed
    index: EXTENDED, middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  },
  e: { // Claw: all fingers bent halfway
    index: CURL_60, middle: CURL_60, ring: CURL_60, pinky: CURL_60,
    thumb: [0.8, 0.6, 0.4]
  },
  f: { // Index and thumb touching, others extended
    index: [0.7, 0.7, 0.2], middle: EXTENDED, ring: EXTENDED, pinky: EXTENDED,
    thumb: [0.6, 0.4, -0.4]
  },
  g: { // Index pointing sideways, thumb pointing up, others closed
    index: [0, 0, 1.4], middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0, 0, -0.5]
  },
  h: { // Index and middle extended, others closed
    index: EXTENDED, middle: EXTENDED, ring: CURL_90, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  },
  i: { // Pinky pointing up, others closed
    index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: EXTENDED,
    thumb: [0.8, 0.8, 0.2]
  },
  j: { // Pinky extended, wriggling (handled via wrist animation)
    index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: EXTENDED,
    thumb: [0.8, 0.8, 0.2]
  },
  k: { // Index and middle up, thumb between them
    index: EXTENDED, middle: [0.2, 0.2, 0], ring: CURL_90, pinky: CURL_90,
    thumb: [0.2, 0, -0.2]
  },
  l: { // Index and thumb extended forming L
    index: EXTENDED, middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0, 0, -1.2]
  },
  m: { // Fist, thumb tucked under middle/ring
    index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.9, 0.5, 0.5]
  },
  n: { // Fist, thumb tucked under index/middle
    index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.7, 0.4, 0.4]
  },
  o: { // Rounded hand
    index: CURL_60, middle: CURL_60, ring: CURL_60, pinky: CURL_60,
    thumb: [0.8, 0.8, 0]
  },
  p: { // K-pose tilted down (handled via wrist tilt)
    index: EXTENDED, middle: [0.2, 0.2, 0], ring: CURL_90, pinky: CURL_90,
    thumb: [0.2, 0, -0.2]
  },
  q: { // Q-pose pointing down
    index: [0.7, 0.7, 0.2], middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.6, 0.4, -0.4]
  },
  r: { // Index and middle crossed
    index: [0, 0, 0.2], middle: [0, 0, -0.2], ring: CURL_90, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  },
  s: { // Closed fist, thumb wrapped over
    index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  },
  t: { // Fist with thumb tucked under index
    index: [1.2, 1.2, 0.6], middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.5, 0.3, 0.1]
  },
  u: { // Index and middle up, touching
    index: EXTENDED, middle: EXTENDED, ring: CURL_90, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  },
  v: { // Peace sign: index and middle spread
    index: [0, 0, 0.3], middle: [0, 0, -0.3], ring: CURL_90, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  },
  w: { // Index, middle, ring up
    index: EXTENDED, middle: EXTENDED, ring: EXTENDED, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  },
  x: { // Index curved like hook, others closed
    index: [0.8, 0.8, 0.4], middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  },
  y: { // Thumb and pinky extended, others closed
    index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: EXTENDED,
    thumb: [0, 0, -1.2]
  },
  z: { // Index pointing up (motion handled via sequencer)
    index: EXTENDED, middle: CURL_90, ring: CURL_90, pinky: CURL_90,
    thumb: [0.8, 0.8, 0.2]
  }
};

// Word Gestures (Sequences of Keyframes)
const GESTURES = {
  hello: [
    { pose: 'b', duration: 150 }, // Start flat
    { wrist: [0, 0, -0.4], duration: 200 }, // Tilt left
    { wrist: [0, 0, 0.4], duration: 250 }, // Tilt right
    { wrist: [0, 0, -0.4], duration: 250 }, // Tilt left
    { wrist: [0, 0, 0], pose: 'b', duration: 200 } // Back to center
  ],
  goodbye: [
    { pose: 'b', duration: 150 },
    { index: CURL_60, middle: CURL_60, ring: CURL_60, pinky: CURL_60, duration: 250 }, // Wave down
    { index: EXTENDED, middle: EXTENDED, ring: EXTENDED, pinky: EXTENDED, duration: 250 }, // Wave up
    { index: CURL_60, middle: CURL_60, ring: CURL_60, pinky: CURL_60, duration: 250 }, // Wave down
    { index: EXTENDED, middle: EXTENDED, ring: EXTENDED, pinky: EXTENDED, duration: 200 }
  ],
  please: [
    { pose: 'b', wrist: [0.2, 0, 0], duration: 200 },
    { wrist: [0.2, 0.4, 0.2], duration: 300 }, // Circular chest rub rub 1
    { wrist: [0.2, -0.4, -0.2], duration: 300 }, // rub 2
    { wrist: [0, 0, 0], duration: 200 }
  ],
  "thank you": [
    { pose: 'b', wrist: [-0.4, 0.3, 0], duration: 200 }, // Hand at lips
    { wrist: [0.5, -0.2, 0], duration: 400 }, // Gesture forward/down
    { wrist: [0, 0, 0], duration: 200 }
  ],
  yes: [
    { pose: 's', duration: 200 }, // Close fist
    { wrist: [0.6, 0, 0], duration: 200 }, // Nod down
    { wrist: [-0.2, 0, 0], duration: 200 }, // Nod up
    { wrist: [0.6, 0, 0], duration: 200 },
    { wrist: [0, 0, 0], pose: 'b', duration: 200 }
  ],
  no: [
    { pose: 'b', duration: 150 },
    { index: CURL_90, middle: CURL_90, thumb: [0.8, 0.5, 0.2], duration: 200 }, // Snap shut
    { pose: 'b', duration: 150 },
    { index: CURL_90, middle: CURL_90, thumb: [0.8, 0.5, 0.2], duration: 200 }
  ],
  happy: [
    { pose: 'b', duration: 200 },
    { wrist: [0.2, 0, 0], duration: 200 }, // Tilt forward
    { wrist: [-0.1, 0, 0], duration: 200 }, // Tap
    { wrist: [0.2, 0, 0], duration: 200 },
    { wrist: [0, 0, 0], duration: 200 }
  ],
  sad: [
    { pose: 'c', wrist: [-0.3, 0, 0], duration: 300 }, // Curved hand near face
    { wrist: [0.4, 0, 0], index: CURL_90, middle: CURL_90, ring: CURL_90, pinky: CURL_90, duration: 500 }, // Slide down and curl
    { wrist: [0, 0, 0], pose: 'b', duration: 300 }
  ],
  deaf: [
    { pose: 'd', wrist: [-0.3, -0.2, 0], duration: 250 }, // Pointing index
    { wrist: [0.2, 0.3, 0], duration: 300 }, // Move pointing hand
    { wrist: [0, 0, 0], pose: 'b', duration: 250 }
  ],
  friend: [
    { pose: 'x', wrist: [0, 0.3, -0.2], duration: 300 }, // Hooks clasping
    { wrist: [0, -0.3, 0.2], duration: 300 },
    { wrist: [0, 0, 0], pose: 'b', duration: 200 }
  ],
  family: [
    { pose: 'c', duration: 200 },
    { wrist: [0, 0.6, 0], duration: 400 }, // Circular sweep
    { wrist: [0, -0.6, 0], duration: 400 },
    { wrist: [0, 0, 0], pose: 'b', duration: 200 }
  ]
};

// Default flat pose structure
const DEFAULT_POSE = {
  index: EXTENDED, middle: EXTENDED, ring: EXTENDED, pinky: EXTENDED,
  thumb: EXTENDED,
  wrist: [0, 0, 0]
};

export default function Hand3D({ currentWord, isPlaying, onItemComplete }) {
  const containerRef = useRef(null);
  const activeTimeline = useRef([]);
  const timelineIndex = useRef(0);
  const currentLerpTime = useRef(0);
  const totalLerpTime = useRef(500); // Duration in ms

  // References to Three.js objects
  const sceneRef = useRef(null);
  const handRef = useRef(null);
  const jointsRef = useRef({}); // Stores references to bone meshes
  const currentRotations = useRef({}); // Tracks actual bone rotations
  const startRotations = useRef({}); // Starts transition rotations
  const targetRotations = useRef({}); // Targets transition rotations

  useEffect(() => {
    // --- 1. SETUP THREE.JS SCENE ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Deep blue-slate
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Lightings
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 0.4); // Neon glow fill light
    dirLight2.position.set(-5, -5, -2);
    scene.add(dirLight2);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 15;

    // --- 2. BUILD PROCEDURAL HAND RIG ---
    const handGroup = new THREE.Group();
    handRef.current = handGroup;
    scene.add(handGroup);

    // Palm base
    const palmGeo = new THREE.BoxGeometry(2.0, 2.2, 0.4);
    // Cyber metallic material for bones/palm
    const cyberMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.2,
      envMapIntensity: 1.0
    });
    const palmMesh = new THREE.Mesh(palmGeo, cyberMat);
    palmMesh.position.set(0, -0.6, 0);
    handGroup.add(palmMesh);

    // Neon joint materials
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0xa855f7,
      emissiveIntensity: 0.8,
      roughness: 0.4
    });

    // Helper to add finger joint hierarchy
    const buildFingerRig = (name, xOffset, yStart, length, thickness) => {
      const joints = [];
      const segLength = length / 3;
      
      let currentParent = handGroup;
      
      for (let j = 0; j < 3; j++) {
        const jointGeo = new THREE.SphereGeometry(thickness * 1.3, 12, 12);
        const joint = new THREE.Mesh(jointGeo, jointMat);
        
        // Position first joint relative to hand group, subsequent relative to previous joint
        if (j === 0) {
          joint.position.set(xOffset, yStart, 0.1);
        } else {
          joint.position.set(0, segLength, 0);
        }
        
        currentParent.add(joint);
        joints.push(joint);

        // Bone segment
        const boneGeo = new THREE.CylinderGeometry(thickness * 0.8, thickness, segLength, 12);
        const bone = new THREE.Mesh(boneGeo, cyberMat);
        bone.position.set(0, segLength / 2, 0);
        joint.add(bone);
        
        currentParent = joint;
      }
      
      jointsRef.current[name] = joints;
    };

    // Rig all fingers
    // Parameters: name, xOffset, yStart, totalLength, thickness
    buildFingerRig('pinky', -0.75, 0.5, 1.1, 0.11);
    buildFingerRig('ring', -0.28, 0.58, 1.4, 0.125);
    buildFingerRig('middle', 0.2, 0.62, 1.6, 0.125);
    buildFingerRig('index', 0.68, 0.58, 1.4, 0.125);

    // Rig Thumb (rotated outwards, 2 joints + base)
    const thumbJoints = [];
    const thumbThickness = 0.15;
    const thumbSeg = 0.45;

    // Thumb Base Joint (carpal-metacarpal)
    const tbJoint = new THREE.Mesh(new THREE.SphereGeometry(thumbThickness * 1.3, 12, 12), jointMat);
    tbJoint.position.set(0.9, -0.2, 0.15);
    tbJoint.rotation.z = -0.6; // Angled outwards
    handGroup.add(tbJoint);
    thumbJoints.push(tbJoint);

    const tbBone = new THREE.Mesh(new THREE.CylinderGeometry(thumbThickness * 0.8, thumbThickness, thumbSeg, 12), cyberMat);
    tbBone.position.set(0, thumbSeg / 2, 0);
    tbJoint.add(tbBone);

    // Thumb Interphalangeal Joint
    const tipJoint = new THREE.Mesh(new THREE.SphereGeometry(thumbThickness * 1.1, 12, 12), jointMat);
    tipJoint.position.set(0, thumbSeg, 0);
    tbJoint.add(tipJoint);
    thumbJoints.push(tipJoint);

    const tipBone = new THREE.Mesh(new THREE.CylinderGeometry(thumbThickness * 0.7, thumbThickness * 0.9, thumbSeg, 12), cyberMat);
    tipBone.position.set(0, thumbSeg / 2, 0);
    tipJoint.add(tipBone);

    jointsRef.current['thumb'] = thumbJoints;

    // --- 3. INIT ROTATION ARRAYS ---
    const initializeRotations = () => {
      const state = {};
      const addBones = (name, count) => {
        state[name] = [];
        for (let i = 0; i < count; i++) {
          state[name].push([0, 0, 0]);
        }
      };
      addBones('pinky', 3);
      addBones('ring', 3);
      addBones('middle', 3);
      addBones('index', 3);
      addBones('thumb', 2);
      state['wrist'] = [0, 0, 0];
      
      currentRotations.current = JSON.parse(JSON.stringify(state));
      startRotations.current = JSON.parse(JSON.stringify(state));
      targetRotations.current = JSON.parse(JSON.stringify(state));
    };
    initializeRotations();

    // Set initial layout rotation (slightly angled toward the viewer)
    handGroup.rotation.y = -0.4; 
    handGroup.rotation.x = 0.2;

    // --- 4. RENDER LOOP ---
    let lastTime = performance.now();
    let animationFrameId;

    const animate = (time) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = time - lastTime;
      lastTime = time;

      // Update joint angles via LERP if animation is active
      if (currentLerpTime.current < totalLerpTime.current) {
        currentLerpTime.current += delta;
        const progress = Math.min(currentLerpTime.current / totalLerpTime.current, 1);
        
        // Apply smooth ease-in-out interpolation curve
        const t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Interpolate wrist
        const startWrist = startRotations.current.wrist;
        const targetWrist = targetRotations.current.wrist;
        const currentWrist = currentRotations.current.wrist;
        for (let i = 0; i < 3; i++) {
          currentWrist[i] = THREE.MathUtils.lerp(startWrist[i], targetWrist[i], t);
        }
        handGroup.position.y = currentWrist[0] * 0.5; // Simulate arm vertical movement on wrist-X tilt

        // Interpolate fingers
        ['pinky', 'ring', 'middle', 'index', 'thumb'].forEach(finger => {
          const jointCount = finger === 'thumb' ? 2 : 3;
          for (let j = 0; j < jointCount; j++) {
            for (let axis = 0; axis < 3; axis++) {
              currentRotations.current[finger][j][axis] = THREE.MathUtils.lerp(
                startRotations.current[finger][j][axis],
                targetRotations.current[finger][j][axis],
                t
              );
            }
          }
        });

        // Apply updated angles to 3D skeletons
        // Apply wrist rotation
        handGroup.rotation.x = 0.2 + currentRotations.current.wrist[0];
        handGroup.rotation.y = -0.4 + currentRotations.current.wrist[1];
        handGroup.rotation.z = currentRotations.current.wrist[2];

        // Apply finger rotations
        ['pinky', 'ring', 'middle', 'index', 'thumb'].forEach(finger => {
          const jointCount = finger === 'thumb' ? 2 : 3;
          const meshes = jointsRef.current[finger];
          for (let j = 0; j < jointCount; j++) {
            if (meshes && meshes[j]) {
              meshes[j].rotation.x = currentRotations.current[finger][j][0];
              meshes[j].rotation.y = currentRotations.current[finger][j][1];
              meshes[j].rotation.z = currentRotations.current[finger][j][2];
            }
          }
        });

        // Check if transition is finished
        if (progress >= 1) {
          onTransitionEnd();
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    // Handle keyframe transition ends
    const onTransitionEnd = () => {
      // If we are in the middle of a gesture sequence, advance to next keyframe
      if (activeTimeline.current.length > 0) {
        timelineIndex.current += 1;
        if (timelineIndex.current < activeTimeline.current.length) {
          playKeyframe(activeTimeline.current[timelineIndex.current]);
        } else {
          // Gesture is fully complete
          activeTimeline.current = [];
          onItemComplete();
        }
      } else {
        // Single pose (like a letter) is complete
        onItemComplete();
      }
    };

    animate(performance.now());

    // --- 5. RESIZE HANDLER ---
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // --- KEYFRAME PLAYBACK SEQUENCER ---
  const playKeyframe = (keyframe) => {
    // 1. Snapshot current rotations as start state
    startRotations.current = JSON.parse(JSON.stringify(currentRotations.current));

    // 2. Parse target rotations
    // If it points to a letter key in LETTER_POSES
    let poseData = null;
    if (typeof keyframe.pose === 'string' && LETTER_POSES[keyframe.pose]) {
      poseData = LETTER_POSES[keyframe.pose];
    } else if (typeof keyframe.pose === 'object') {
      poseData = keyframe.pose;
    }

    // Default target is a flat hand
    const target = JSON.parse(JSON.stringify(DEFAULT_POSE));

    if (poseData) {
      Object.keys(poseData).forEach(part => {
        if (part === 'wrist') {
          target.wrist = poseData.wrist;
        } else if (target[part]) {
          const jointCount = part === 'thumb' ? 2 : 3;
          for (let j = 0; j < jointCount; j++) {
            // Apply X rotation (and Y/Z if defined, otherwise 0)
            target[part][j] = [
              poseData[part][0] || 0,
              poseData[part][1] || 0,
              poseData[part][2] || 0
            ];
            
            // Allow mapping finger array definitions [j0_x, j1_x, j2_x]
            if (Array.isArray(poseData[part]) && Array.isArray(poseData[part][0]) === false) {
              target[part][j] = [poseData[part][j] || 0, 0, 0];
            }
          }
        }
      });
    }

    // Overlay explicit wrist or finger adjustments defined inside the keyframe itself
    if (keyframe.wrist) target.wrist = keyframe.wrist;
    ['pinky', 'ring', 'middle', 'index', 'thumb'].forEach(finger => {
      if (keyframe[finger]) {
        const jointCount = finger === 'thumb' ? 2 : 3;
        for (let j = 0; j < jointCount; j++) {
          target[finger][j] = [keyframe[finger][j] || 0, 0, 0];
        }
      }
    });

    targetRotations.current = target;
    totalLerpTime.current = keyframe.duration || 500;
    currentLerpTime.current = 0; // Starts lerping
  };

  // Triggers whenever props change
  useEffect(() => {
    if (!isPlaying) {
      // Put hand back in default flat pose
      playKeyframe({ pose: 'b', duration: 400 });
      return;
    }

    if (!currentWord) return;

    const wordNorm = currentWord.trim().toLowerCase();

    // Check if it matches a word gesture sequence
    if (GESTURES[wordNorm]) {
      activeTimeline.current = GESTURES[wordNorm];
      timelineIndex.current = 0;
      playKeyframe(activeTimeline.current[0]);
    } else if (LETTER_POSES[wordNorm]) {
      // Matches a single letter pose
      activeTimeline.current = [];
      playKeyframe({ pose: wordNorm, duration: 600 });
    } else {
      // Default fallback (e.g. flat b)
      activeTimeline.current = [];
      playKeyframe({ pose: 'b', duration: 500 });
    }
  }, [currentWord, isPlaying]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
}
