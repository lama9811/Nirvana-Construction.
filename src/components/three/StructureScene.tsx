/* ============================================================
   StructureScene.tsx — the homepage signature.
   A procedural metal-stud framing structure the camera sits
   inside, with real project photographs mapped onto floating
   panels. Mouse parallax + scroll dollies the camera deeper
   into the build. Cinematic post-FX sells the look.
   ============================================================ */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, useTexture, AdaptiveDpr } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { STRUCTURE, PANEL, PANEL_PLACEMENTS } from "./scene-config";
import { detectQuality, type Quality } from "../../lib/quality";

interface Props {
  texturePaths: string[];
}

/* ----------------------------- studs ---------------------- */
/* steel material colour for the light theme — brushed aluminium */
const STEEL_COLOR = "#bdbeb6";

function FramingStructure() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const total = STRUCTURE.studsPerRow * STRUCTURE.rowsDeep;

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const offsetX = (STRUCTURE.studsPerRow - 1) / 2;
    let i = 0;
    for (let r = 0; r < STRUCTURE.rowsDeep; r++) {
      for (let s = 0; s < STRUCTURE.studsPerRow; s++) {
        dummy.position.set(
          (s - offsetX) * STRUCTURE.studSpacingX,
          0,
          -r * STRUCTURE.rowSpacingZ,
        );
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i++, dummy.matrix);
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [total]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, total]}>
      <boxGeometry args={[STRUCTURE.studWidth, STRUCTURE.studHeight, STRUCTURE.studDepth]} />
      <meshStandardMaterial color={STEEL_COLOR} metalness={0.65} roughness={0.4} />
    </instancedMesh>
  );
}

/* ----------------------------- plates --------------------- */
function Plates() {
  const totalWidth = STRUCTURE.studsPerRow * STRUCTURE.studSpacingX + 0.5;
  return (
    <>
      {Array.from({ length: STRUCTURE.rowsDeep }).map((_, r) => {
        const z = -r * STRUCTURE.rowSpacingZ;
        return (
          <group key={r} position={[0, 0, z]}>
            <mesh position={[0, STRUCTURE.studHeight / 2, 0]}>
              <boxGeometry args={[totalWidth, STRUCTURE.plateThickness, 0.09]} />
              <meshStandardMaterial color={STEEL_COLOR} metalness={0.65} roughness={0.4} />
            </mesh>
            <mesh position={[0, -STRUCTURE.studHeight / 2, 0]}>
              <boxGeometry args={[totalWidth, STRUCTURE.plateThickness, 0.09]} />
              <meshStandardMaterial color={STEEL_COLOR} metalness={0.65} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/* ----------------------------- panel ---------------------- */
function PhotoPanel({
  src,
  position,
  rotation,
}: {
  src: string;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const texture = useTexture(src) as THREE.Texture;
  useMemo(() => {
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <Float speed={1.05} rotationIntensity={0.22} floatIntensity={0.45}>
      <group position={position} rotation={rotation}>
        {/* thin emissive back-frame, gives the panel a glow edge */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[PANEL.width + 0.04, PANEL.height + 0.04]} />
          <meshBasicMaterial color="#18c95a" transparent opacity={0.06} />
        </mesh>
        <mesh>
          <planeGeometry args={[PANEL.width, PANEL.height]} />
          <meshStandardMaterial
            map={texture}
            side={THREE.DoubleSide}
            roughness={0.7}
            metalness={0.0}
            emissive={"#1a1a20"}
            emissiveIntensity={0.18}
          />
        </mesh>
      </group>
    </Float>
  );
}

/* --------------------------- camera ----------------------- */
function CameraRig() {
  const { camera, pointer } = useThree();
  const targetRot = useRef(new THREE.Vector2(0, 0));
  const startY = 1.55;
  const startZ = 6;

  useFrame(() => {
    // mouse parallax — gentle pitch / yaw toward pointer
    targetRot.current.x = THREE.MathUtils.lerp(targetRot.current.x, pointer.y * 0.04, 0.05);
    targetRot.current.y = THREE.MathUtils.lerp(targetRot.current.y, -pointer.x * 0.06, 0.05);
    camera.rotation.x = targetRot.current.x;
    camera.rotation.y = targetRot.current.y;

    // scroll dolly — pull deeper into the structure as we scroll
    if (typeof window === "undefined") return;
    const t = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 0.9));
    const targetZ = startZ - t * 5.4;
    const targetY = startY - t * 0.45;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.07);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.07);
  });

  return null;
}

/* --------------------------- scene ------------------------ */
function Scene({ texturePaths, quality }: { texturePaths: string[]; quality: Quality }) {
  const panels = PANEL_PLACEMENTS.slice(0, quality.panelCount);
  return (
    <>
      <color attach="background" args={["#ece6d4"]} />
      <fog attach="fog" args={["#ece6d4", 7, 22]} />

      <ambientLight intensity={1.4} color="#fff7e6" />
      <directionalLight
        position={[5, 7, 4]}
        intensity={1.8}
        color="#ffffff"
      />
      {/* forward fill — kills the front-stud silhouettes */}
      <directionalLight position={[0, 3, 8]} intensity={0.9} color="#fff4dd" />
      {/* brand rim — emerald — sweeps the back of the structure */}
      <pointLight position={[-6, 2, -3]} intensity={2.0} color="#1ed87a" distance={14} decay={2} />
      {/* action accent — warm orange interior glow */}
      <pointLight position={[2, -2.4, -2]} intensity={1.4} color="#ff7448" distance={9} decay={2.2} />

      <FramingStructure />
      <Plates />

      {texturePaths.slice(0, panels.length).map((src, i) => (
        <PhotoPanel
          key={src + i}
          src={src}
          position={panels[i].pos}
          rotation={panels[i].rot}
        />
      ))}

      <CameraRig />
    </>
  );
}

/* ------------------------ entry point --------------------- */
export default function StructureScene({ texturePaths }: Props) {
  const quality = useMemo(() => detectQuality(), []);

  if (quality.reducedMotion) {
    /* respect reduced-motion: render nothing — the static
       background image behind the canvas remains the hero */
    return null;
  }

  return (
    <Canvas
      dpr={quality.dpr}
      camera={{ position: [0, 1.55, 6], fov: 50, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <AdaptiveDpr pixelated={false} />
      <Suspense fallback={null}>
        <Scene texturePaths={texturePaths} quality={quality} />
        {quality.postProcessing && (
          <EffectComposer multisampling={0}>
            <Bloom intensity={0.25} luminanceThreshold={0.85} luminanceSmoothing={0.4} mipmapBlur />
            <ChromaticAberration offset={[0.0004, 0.0006]} radialModulation={false} modulationOffset={0} />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}
