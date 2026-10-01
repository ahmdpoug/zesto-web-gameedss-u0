'use client'

import { Environment, Lightformer, Sky, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CharacterId } from '@/lib/zesto/config'
import { BUILDINGS, RESOURCE_NODES, type BuildingKind } from '@/lib/zesto/economy'
import { playerState, type Collider, type Interactable, type WorldSpot } from '@/lib/zesto/world'
import { DigSpots } from './dig-spots'
import { Homestead } from './homestead'
import { SandParticles } from './particles'
import { Player } from './player'
import { BeachProps } from './props'
import { Sand, Water } from './terrain'

const SUN_OFFSET = new THREE.Vector3(-12, 16, -8)

function Lighting({ night }: { night: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  useFrame(() => {
    const light = sun.current
    if (!light) return
    light.position.set(playerState.x + SUN_OFFSET.x, SUN_OFFSET.y, playerState.z + SUN_OFFSET.z)
    light.target.position.set(playerState.x, 0, playerState.z)
    light.target.updateMatrixWorld()
  })
  return (
    <>
      <hemisphereLight args={night ? ['#6d84c9', '#2a2238', 1.1] : ['#ffe4c4', '#b9773f', 0.65]} />
      <ambientLight intensity={night ? 0.45 : 0.12} color={night ? '#7f96d9' : '#fff1de'} />
      <Environment resolution={128} environmentIntensity={night ? 0.45 : 0.55}>
        <Lightformer form="ring" intensity={night ? 1.5 : 3} color={night ? '#b8ccff' : '#ffd9a8'} scale={6} position={[-6, 6, -6]} />
        <Lightformer form="rect" intensity={night ? 0.8 : 2} color="#ffffff" scale={[10, 3, 1]} position={[0, 8, 6]} />
        <Lightformer form="rect" intensity={night ? 0.6 : 1.2} color={night ? '#3a4f8a' : '#7fd6ff'} scale={[20, 6, 1]} position={[0, 2, -10]} />
      </Environment>
      <directionalLight
        ref={sun}
        intensity={night ? 1.4 : 2.3}
        color={night ? '#b8ccff' : '#ffd29a'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  )
}

const STATIC_COLLIDERS: Collider[] = [
  { x: 0.4, z: -14, r: 0.2 },
  { x: 3.4, z: -14, r: 0.2 },
  { x: 0.2, z: -16.5, r: 0.12 },
  { x: 3.6, z: -16.5, r: 0.12 },
  { x: 0.2, z: -22.5, r: 0.12 },
  { x: 3.6, z: -22.5, r: 0.12 },
  { x: 9.6, z: -6.5, r: 0.25 },
  ...RESOURCE_NODES.map((n) => ({ x: n.x, z: n.z, r: n.radius * 0.7 })),
]

export function BeachWorld({
  night,
  character,
  spots,
  nearKey,
  digIndex,
  faceTarget,
  buildingLevels,
  locked,
  digging,
  onNearChange,
}: {
  night: boolean
  character: CharacterId | null
  spots: WorldSpot[]
  nearKey: string | null
  digIndex: number | null
  faceTarget: WorldSpot | null
  buildingLevels: Partial<Record<BuildingKind, number>>
  locked: boolean
  digging: boolean
  onNearChange: (key: string | null) => void
}) {
  const fog = night ? '#0b1430' : '#f3c9a0'
  const levelKey = BUILDINGS.map((b) => buildingLevels[b.id] ?? 0).join('')
  const colliders = useMemo<Collider[]>(
    () => [
      ...STATIC_COLLIDERS,
      ...BUILDINGS.filter((_, i) => levelKey[i] !== '0').map((b) => ({ x: b.x, z: b.z, r: b.radius })),
    ],
    [levelKey],
  )
  const interactables = useMemo<Interactable[]>(
    () => [
      ...spots.map((s, i) => ({ key: `spot:${i}`, x: s.x, z: s.z, radius: 0 })),
      ...RESOURCE_NODES.map((n) => ({ key: `node:${n.id}`, x: n.x, z: n.z, radius: n.radius })),
      ...BUILDINGS.map((b) => ({ key: `plot:${b.id}`, x: b.x, z: b.z, radius: b.radius })),
    ],
    [spots],
  )
  const nearIndex = nearKey?.startsWith('spot:') ? Number(nearKey.slice(5)) : null
  return (
    <div className="absolute inset-0" aria-label="3D beach dig site. Move with the joystick or W A S D keys.">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 45, near: 0.1, far: 400, position: [0, 7, 12] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[fog]} />
        <fog attach="fog" args={[fog, 28, night ? 90 : 120]} />
        {night ? (
          <Stars radius={160} depth={40} count={2500} factor={5} saturation={0} fade speed={0.6} />
        ) : (
          <Sky distance={4500} sunPosition={[-60, 9, -50]} turbidity={7} rayleigh={2.4} mieCoefficient={0.006} mieDirectionalG={0.86} />
        )}
        <Lighting night={night} />
        <Suspense fallback={null}>
          <Sand night={night} />
          <Water night={night} />
          <BeachProps night={night} />
          <Homestead night={night} levels={buildingLevels} nearKey={nearKey} />
          <DigSpots spots={spots} activeIndex={nearIndex} digIndex={digIndex} />
          <SandParticles color={night ? '#a89a8a' : '#e3bf8a'} />
          {character ? (
            <Player
              key={character}
              id={character}
              locked={locked}
              digging={digging}
              spots={spots}
              faceTarget={faceTarget}
              interactables={interactables}
              colliders={colliders}
              onNearChange={onNearChange}
            />
          ) : null}
        </Suspense>
      </Canvas>
    </div>
  )
}
