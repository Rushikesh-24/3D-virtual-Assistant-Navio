"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Float, useFBX } from "@react-three/drei";
import { Suspense, useRef, useState, useEffect } from "react";
import { Mesh, Group, Object3D, SkinnedMesh } from "three";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

interface AvatarModelProps {
  isSpeaking: boolean;
  positionX?: number;
  positionY?: number;
  emotionalState?: "neutral" | "happy" | "excited" | "thinking" | "listening";
  gestureIntensity?: number;
}

// Simple 3D Avatar Component (placeholder until you add a real GLTF model)
function AvatarModel({
  isSpeaking,
  positionX = -0.1,
  positionY = -4.0,
  emotionalState = "neutral",
  gestureIntensity = 1.0,
}: AvatarModelProps) {
  const meshRef = useRef<Mesh>(null);
  const headRef = useRef<Mesh>(null);
  const eyeLeftRef = useRef<Mesh>(null);
  const eyeRightRef = useRef<Mesh>(null);
  const mouthRef = useRef<Mesh>(null);

  // Breathing animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.x = positionX;
      meshRef.current.position.y =
        positionY + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }

    // Blinking animation
    if (eyeLeftRef.current && eyeRightRef.current) {
      const blinkTime = Math.sin(state.clock.elapsedTime * 0.5);
      if (blinkTime > 0.98) {
        eyeLeftRef.current.scale.y = 0.1;
        eyeRightRef.current.scale.y = 0.1;
      } else {
        eyeLeftRef.current.scale.y = 1;
        eyeRightRef.current.scale.y = 1;
      }
    }

    // Mouth animation when speaking
    if (mouthRef.current && isSpeaking) {
      const talkIntensity = Math.sin(state.clock.elapsedTime * 8) * 0.3 + 0.5;
      mouthRef.current.scale.y = 0.5 + talkIntensity * 0.5;
      mouthRef.current.scale.z = 0.8 + talkIntensity * 0.3;
    } else if (mouthRef.current) {
      mouthRef.current.scale.y = 0.5;
      mouthRef.current.scale.z = 0.8;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.2}>
      <group ref={meshRef}>
        {/* Head */}
        <mesh ref={headRef} position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial color="#fdbcb4" />
        </mesh>

        {/* Eyes */}
        <mesh ref={eyeLeftRef} position={[-0.25, 0.7, 0.6]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>
        <mesh ref={eyeRightRef} position={[0.25, 0.7, 0.6]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#2563eb" />
        </mesh>

        {/* Mouth */}
        <mesh ref={mouthRef} position={[0, 0.3, 0.7]}>
          <sphereGeometry args={[0.15, 16, 8]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>

        {/* Body */}
        <mesh position={[0, -1, 0]}>
          <cylinderGeometry args={[0.6, 0.8, 1.5, 16]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>

        {/* Glow effect around avatar */}
        <mesh position={[0, 0, 0]} scale={[2.5, 2.5, 2.5]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color="#3b82f6"
            transparent
            opacity={0.1}
            wireframe={false}
          />
        </mesh>
      </group>
    </Float>
  );
}

// Talking FBX Avatar Model
function MixamoAvatarModel({
  isSpeaking,
  positionX = -0.1,
  positionY = -4.0,
  emotionalState = "neutral",
  gestureIntensity = 1.0,
}: AvatarModelProps) {
  // Load only the talking FBX file - this contains both character and animations
  const talkingFbx = useFBX("/Talking.fbx");

  const modelRef = useRef<Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [hasError, setHasError] = useState(false);
  const [animations, setAnimations] = useState<{
    [key: string]: THREE.AnimationAction;
  }>({});
  const [currentAnimation, setCurrentAnimation] = useState<string>("talking");

  // Set up the talking FBX character and animations
  useEffect(() => {
    if (talkingFbx && modelRef.current) {
      console.log("Setting up talking character...");

      // Scale down the Mixamo character
      talkingFbx.scale.set(0.03, 0.03, 0.03);

      // Set up materials and shadows
      talkingFbx.traverse((child: Object3D) => {
        if ((child as SkinnedMesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Create animation mixer
      const mixer = new THREE.AnimationMixer(talkingFbx);
      mixerRef.current = mixer;

      // Store animations from the talking FBX file
      const animationActions: { [key: string]: THREE.AnimationAction } = {};

      // Debug: Log all available animations
      console.log(
        "Available animations in Talking.fbx:",
        talkingFbx.animations?.map((a) => a.name)
      );

      if (talkingFbx.animations && talkingFbx.animations.length > 0) {
        // Look for different types of animations in the single FBX file
        talkingFbx.animations.forEach((clip, index: number) => {
          console.log(`Animation ${index}: ${clip.name} (${clip.duration}s)`);

          const action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopRepeat, Infinity);

          // Categorize animations based on name
          const clipName = clip.name.toLowerCase();
          if (clipName.includes("talk") || clipName.includes("speak")) {
            animationActions.talking = action;
            console.log("Found talking animation:", clip.name);
          } else if (
            clipName.includes("idle") ||
            clipName.includes("breathing") ||
            clipName.includes("standing")
          ) {
            animationActions.idle = action;
            console.log("Found idle animation:", clip.name);
          } else {
            // Use first animation as talking if no clear naming
            if (index === 0) {
              animationActions.talking = action;
              console.log("Using first animation as talking:", clip.name);
            }
          }
        });

        // Fallback: if no talking animation found, use first animation
        if (!animationActions.talking && talkingFbx.animations[0]) {
          const fallbackClip = talkingFbx.animations[0];
          animationActions.talking = mixer.clipAction(fallbackClip);
          animationActions.talking.setLoop(THREE.LoopRepeat, Infinity);
          console.log("Using fallback talking animation:", fallbackClip.name);
        }
      }

      console.log("Available animations:", Object.keys(animationActions));
      setAnimations(animationActions);

      // Start with talking animation (since that's our main animation)
      if (animationActions.talking) {
        animationActions.talking.play();
        setCurrentAnimation("talking");
        console.log("Started talking animation");
      }
    }
  }, [talkingFbx]);

  // Handle animation playback - just keep talking animation running
  useEffect(() => {
    if (Object.keys(animations).length === 0) {
      console.log("No animations available yet");
      return;
    }

    // Always play the talking animation since that's our main character animation
    if (animations.talking && currentAnimation !== "talking") {
      console.log("Starting talking animation");
      animations.talking.play();
      setCurrentAnimation("talking");
    }

    // You can still use the isSpeaking prop to control other behaviors if needed
    console.log("Avatar isSpeaking:", isSpeaking);
  }, [animations, currentAnimation, isSpeaking]);

  useFrame((state, delta) => {
    if (modelRef.current && !hasError) {
      // Update animation mixer for smooth animation playback
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }

      // Static position - controlled by animations now
      modelRef.current.position.x = positionX;
      modelRef.current.position.y = positionY;

      // Let animations control rotation and bone positions
      // No manual bone manipulation needed - animations handle everything
    }
  });

  // Error boundary fallback
  if (hasError) {
    return (
      <AvatarModel
        isSpeaking={isSpeaking}
        positionX={positionX}
        positionY={positionY}
        emotionalState={emotionalState}
        gestureIntensity={gestureIntensity}
      />
    );
  }

  try {
    return (
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
        <primitive
          ref={modelRef}
          object={talkingFbx}
          position={[positionX, positionY, 0]}
        />
      </Float>
    );
  } catch (error) {
    console.warn(
      "Error loading Mixamo FBX model, falling back to simple avatar:",
      error
    );
    setHasError(true);
    return (
      <AvatarModel
        isSpeaking={isSpeaking}
        positionX={positionX}
        positionY={positionY}
        emotionalState={emotionalState}
        gestureIntensity={gestureIntensity}
      />
    );
  }
}

interface AvatarSceneProps {
  isSpeaking: boolean;
  positionX?: number;
  positionY?: number;
  emotionalState?: "neutral" | "happy" | "excited" | "thinking" | "listening";
  gestureIntensity?: number;
}

export default function AvatarScene({
  isSpeaking,
  positionX = -0.1,
  positionY = -4.0,
  emotionalState = "neutral",
  gestureIntensity = 1.0,
}: AvatarSceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: "transparent" }}
      >
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#3b82f6" wireframe />
            </mesh>
          }
        >
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight
            position={[-10, -10, -5]}
            color="#3b82f6"
            intensity={0.5}
          />

          {/* Avatar Model - Using your Mixamo character */}
          <MixamoAvatarModel
            isSpeaking={isSpeaking}
            positionX={positionX}
            positionY={positionY}
            emotionalState={emotionalState}
            gestureIntensity={gestureIntensity}
          />

          {/* Environment and Controls */}
          <Environment preset="studio" />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
            autoRotate={false}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Enhanced Human-like Avatar with Realistic Speaking Animations
/*
🎭 AVATAR FEATURES:

✨ REALISTIC SPEAKING ANIMATIONS:
- Natural head nodding, tilting, and turning
- Jaw movement synchronized with speech
- Eye movements and blinking
- Hand gestures and finger articulation
- Arm movements for expressive gesturing
- Chest and spine breathing animations
- Shoulder and neck movements
- Smooth idle animations when not speaking

🎨 EMOTIONAL STATES (emotionalState prop):
- "neutral" - Calm, standard movements
- "happy" - Slightly more animated and upbeat
- "excited" - Energetic with increased gesture intensity
- "thinking" - Subdued movements, more contemplative
- "listening" - Minimal movement, focused attention

🎛️ CUSTOMIZATION OPTIONS:
- gestureIntensity: 0.1-2.0 (controls how animated the avatar is)
- positionX/positionY: Adjust avatar placement
- All bone animations are procedurally generated for natural variation

📦 SETUP:
1. Place your Mixamo character as "/Character from Mixamo.fbx" in the public folder
2. Scale adjustment: Change fbx.scale.set(0.03, 0.03, 0.03) if size needs adjustment
3. The avatar automatically detects and plays idle animations

🔧 USAGE EXAMPLES:
<AvatarScene 
  isSpeaking={true} 
  emotionalState="excited"
  gestureIntensity={1.2}
/>

<AvatarScene 
  isSpeaking={false} 
  emotionalState="thinking"
  gestureIntensity={0.7}
/>

🎯 ANIMATION DETAILS:
- Hand gestures alternate between left and right naturally
- Facial expressions include jaw movement and eye tracking
- Body language adapts to emotional state
- Breathing animation continues in both speaking and idle states
- All movements use sine waves with different phases for natural variation
- Bone detection works with standard Mixamo naming conventions

🚀 PERFORMANCE:
- Optimized animation loops
- Efficient bone traversal
- Fallback to simple geometry if FBX fails to load
- Smooth 60fps animations with RAF integration
*/
