'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { BUILDINGS, RESOURCE_META, RESOURCE_NODES, type BuildingKind, type ResourceNode } from '@/lib/zesto/economy'
import { sandHeight } from '@/lib/zesto/world'
import { PalmTree, Rock } from './props'

const WOOD = '#9a6638'
const WOOD_DARK = '#6e4426'
const STONE = '#8f877b'
const STONE_DARK = '#6b645b'
const METAL = '#3b4048'
const GOLD = '#ffc94d'

function Std({ color, metal = 0, rough = 0.85, emissive, intensity = 0 }: { color: string; metal?: number; rough?: number; emissive?: string; intensity?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      metalness={metal}
      roughness={rough}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={intensity}
      toneMapped={!emissive}
    />
  )
}

function useGrowIn(level: number) {
  const ref = useRef<THREE.Group>(null)
  const anim = useRef({ t: 0 })
  useEffect(() => {
    anim.current.t = 0
  }, [level])
  useFrame((_, dt) => {
    const a = anim.current
    if (!ref.current || a.t >= 1) return
    a.t = Math.min(1, a.t + dt * 1.6)
    const t = a.t
    const s = 1 + Math.sin(t * Math.PI) * 0.12 * (1 - t) - (1 - t) ** 3
    ref.current.scale.setScalar(Math.max(0.01, s))
  })
  return ref
}

function Forge({ level, night }: { level: number; night: boolean }) {
  const mouth = useRef<THREE.MeshStandardMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const smoke = useRef<THREE.Group>(null)
  const chimneyH = 1.5 + level * 0.35
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const flicker = 0.75 + Math.sin(t * 11) * 0.1 + Math.sin(t * 23.7) * 0.08
    if (mouth.current) mouth.current.emissiveIntensity = 3 * flicker
    if (light.current) light.current.intensity = (night ? 9 : 4) * flicker
    smoke.current?.children.forEach((c, i) => {
      const p = (t * 0.35 + i / 3) % 1
      c.position.set(Math.sin(t + i) * 0.12, chimneyH + 0.75 + p * 1.6, 0)
      c.scale.setScalar(0.12 + p * 0.3)
      ;((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.35
    })
  })
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.8, 1.4]} />
        <Std color={STONE} />
      </mesh>
      <mesh position={[0, 0.86, 0]} castShadow>
        <boxGeometry args={[1.92, 0.12, 1.52]} />
        <Std color={STONE_DARK} />
      </mesh>
      <mesh position={[-0.25, 0.92, -0.05]} castShadow>
        <sphereGeometry args={[0.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Std color="#9a8f82" />
      </mesh>
      <mesh position={[-0.25, 0.45, 0.71]}>
        <boxGeometry args={[0.56, 0.34, 0.04]} />
        <meshStandardMaterial ref={mouth} color="#ff7a1a" emissive="#ff5a0a" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[-0.25, 0.6, 1.1]} color="#ff8a3a" distance={6} decay={1.8} />
      <group position={[0.55, 0, -0.35]}>
        <mesh position={[0, 0.9 + chimneyH / 2, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.24, chimneyH, 12]} />
          <Std color={STONE_DARK} />
        </mesh>
        <mesh position={[0, 0.9 + chimneyH + 0.05, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.1, 12]} />
          <Std color={METAL} metal={0.7} rough={0.4} />
        </mesh>
        {level >= 2
          ? [0.35, 0.7].map((f) => (
              <mesh key={f} position={[0, 0.9 + chimneyH * f, 0]}>
                <torusGeometry args={[0.215, 0.03, 6, 16]} />
                <Std color={METAL} metal={0.8} rough={0.35} />
              </mesh>
            ))
          : null}
        <group ref={smoke}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color="#d9d4cc" transparent opacity={0.3} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>
      <mesh position={[0.62, 0.22, 0.85]} rotation={[0, -0.3, 0]} castShadow>
        <boxGeometry args={[0.42, 0.18, 0.55]} />
        <Std color={WOOD} />
      </mesh>
      {level >= 3 ? (
        <mesh position={[-0.92, 0.95, 0.3]} castShadow>
          <boxGeometry args={[0.04, 0.9, 0.5]} />
          <Std color={GOLD} metal={0.9} rough={0.25} />
        </mesh>
      ) : null}
    </group>
  )
}

function AnvilModel({ level }: { level: number }) {
  const rune = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (rune.current) rune.current.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 2.5) * 0.8
  })
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.4, 0.5, 14]} />
        <Std color={WOOD_DARK} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[0.36, 0.12, 0.26]} />
        <Std color={METAL} metal={0.85} rough={0.35} />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[0.2, 0.14, 0.16]} />
        <Std color={METAL} metal={0.85} rough={0.35} />
      </mesh>
      <mesh position={[-0.04, 0.8, 0]} castShadow>
        <boxGeometry args={[0.6, 0.13, 0.26]} />
        <Std color={level >= 3 ? '#5b5340' : '#454b55'} metal={0.9} rough={0.3} />
      </mesh>
      <mesh position={[0.4, 0.8, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.11, 0.3, 12]} />
        <Std color="#454b55" metal={0.9} rough={0.3} />
      </mesh>
      <group position={[0.42, 0.25, 0.32]} rotation={[0.25, 0, -0.35]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.03, 0.6, 8]} />
          <Std color={WOOD} />
        </mesh>
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[0.2, 0.1, 0.1]} />
          <Std color={METAL} metal={0.8} rough={0.4} />
        </mesh>
      </group>
      {level >= 2 ? (
        <group position={[-0.7, 0, -0.1]}>
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} position={[x, 0.45, 0]} castShadow>
              <boxGeometry args={[0.06, 0.9, 0.06]} />
              <Std color={WOOD} />
            </mesh>
          ))}
          <mesh position={[0, 0.82, 0]} castShadow>
            <boxGeometry args={[0.5, 0.06, 0.1]} />
            <Std color={WOOD} />
          </mesh>
        </group>
      ) : null}
      {level >= 3 ? (
        <mesh position={[-0.04, 0.87, 0]}>
          <boxGeometry args={[0.5, 0.012, 0.04]} />
          <meshStandardMaterial ref={rune} color={GOLD} emissive={GOLD} emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  )
}

function LumberMill({ level }: { level: number }) {
  const saw = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (saw.current) saw.current.rotation.y += dt * (2 + level)
  })
  return (
    <group>
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.3, 0.16, 1.8]} />
        <Std color={WOOD_DARK} />
      </mesh>
      <mesh position={[-0.15, 0.72, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.1, 1.25]} />
        <Std color="#b88250" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[-0.15 + side * 0.42, 1.52, -0.1]} rotation={[0, 0, side * -0.62]} castShadow>
          <boxGeometry args={[1.05, 0.08, 1.45]} />
          <Std color="#7a3b2a" />
        </mesh>
      ))}
      <mesh position={[-0.15, 0.55, 0.53]}>
        <boxGeometry args={[0.42, 0.7, 0.04]} />
        <Std color={WOOD_DARK} />
      </mesh>
      <mesh ref={saw} position={[0.9, 0.62, 0.35]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 24]} />
        <Std color="#c9ced6" metal={0.9} rough={0.25} />
      </mesh>
      <mesh position={[0.9, 0.3, 0.35]} castShadow>
        <boxGeometry args={[0.18, 0.45, 0.6]} />
        <Std color={WOOD} />
      </mesh>
      {Array.from({ length: 2 + level }, (_, i) => (
        <mesh key={i} position={[-1.35 + (i % 2) * 0.05, 0.22 + Math.floor(i / 2) * 0.2, 0.55 - (i % 3) * 0.24]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.9, 10]} />
          <Std color={WOOD} />
        </mesh>
      ))}
    </group>
  )
}

function Quarry({ level }: { level: number }) {
  const hook = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (hook.current) hook.current.position.y = 1.15 + Math.sin(clock.elapsedTime * 0.9) * 0.3
  })
  const blocks: [number, number, number, number][] = [
    [-0.6, 0.2, 0.3, 0.4],
    [-0.15, 0.2, 0.45, 0.38],
    [-0.4, 0.55, 0.35, 0.32],
    [0.35, 0.18, 0.5, 0.34],
    [0.1, 0.5, 0.4, 0.3],
    [-0.75, 0.18, -0.35, 0.36],
    [0.5, 0.17, -0.2, 0.32],
  ]
  return (
    <group>
      {blocks.slice(0, 3 + level).map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i * 0.7, 0]} castShadow receiveShadow>
          <boxGeometry args={[s * 1.4, s, s * 1.1]} />
          <Std color={i % 2 ? '#a79e90' : '#968d80'} />
        </mesh>
      ))}
      <mesh position={[0.85, 1.1, -0.45]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 2.2, 8]} />
        <Std color={WOOD} />
      </mesh>
      <mesh position={[0.35, 2.15, -0.45]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.08]} />
        <Std color={WOOD} />
      </mesh>
      <group ref={hook} position={[-0.15, 1.15, -0.45]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1, 4]} />
          <Std color="#3a2a1a" />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.24, 0.28]} />
          <Std color="#a79e90" />
        </mesh>
      </group>
      <group position={[0.6, 0.12, 0.7]} rotation={[0, 0.4, 1.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />
          <Std color={WOOD} />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <coneGeometry args={[0.04, 0.4, 6]} />
          <Std color={METAL} metal={0.8} rough={0.4} />
        </mesh>
      </group>
    </group>
  )
}

function Beacon({ level, night }: { level: number; night: boolean }) {
  const flame = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const height = 1.8 + level * 0.45
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (flame.current) {
      flame.current.scale.set(1 + Math.sin(t * 9) * 0.08, 1 + Math.sin(t * 13) * 0.18, 1 + Math.cos(t * 8) * 0.08)
      flame.current.rotation.y = t * 1.5
    }
    if (light.current) light.current.intensity = (night ? 14 : 5) * (0.85 + Math.sin(t * 12) * 0.1)
  })
  return (
    <group>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.7, height, 14]} />
        <Std color={STONE} />
      </mesh>
      {Array.from({ length: level }, (_, i) => (
        <mesh key={i} position={[0, 0.5 + i * 0.55, 0]}>
          <torusGeometry args={[0.66 - i * 0.06, 0.04, 6, 20]} />
          <Std color={i === 2 ? GOLD : METAL} metal={0.85} rough={0.3} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.4, 0.22, 14]} />
        <Std color={METAL} metal={0.8} rough={0.4} />
      </mesh>
      <mesh ref={flame} position={[0, height + 0.55, 0]}>
        <coneGeometry args={[0.36, 0.8, 10]} />
        <meshStandardMaterial color="#ffd27a" emissive="#ff9a2a" emissiveIntensity={4} toneMapped={false} transparent opacity={0.92} />
      </mesh>
      <pointLight ref={light} position={[0, height + 0.8, 0]} color="#ffb36b" distance={10} decay={1.6} />
    </group>
  )
}

function Vault({ level, night }: { level: number; night: boolean }) {
  const crest = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (crest.current) {
      crest.current.rotation.y = clock.elapsedTime * 0.8
      crest.current.position.y = 2.15 + Math.sin(clock.elapsedTime * 1.6) * 0.06
    }
  })
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.24, 1.8]} />
        <Std color="#d8ccb4" />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.12, 1.3]} />
        <Std color="#efe5d2" rough={0.6} />
      </mesh>
      {[-0.82, 0.82].map((x) => (
        <mesh key={x} position={[x, 0.8, 0.66]} castShadow>
          <boxGeometry args={[0.12, 1.12, 0.12]} />
          <Std color={GOLD} metal={0.9} rough={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[1.74, 0.1, 1.42]} />
        <Std color={GOLD} metal={0.9} rough={0.25} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[0.58, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Std color={level >= 2 ? GOLD : '#e2d6bf'} metal={level >= 2 ? 0.9 : 0.1} rough={0.3} />
      </mesh>
      <mesh position={[0, 0.72, 0.66]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.06, 28]} />
        <Std color="#5a5f68" metal={0.85} rough={0.3} />
      </mesh>
      <mesh position={[0, 0.72, 0.7]}>
        <torusGeometry args={[0.36, 0.04, 8, 28]} />
        <Std color={GOLD} metal={0.9} rough={0.25} />
      </mesh>
      {level >= 3 ? (
        <group ref={crest} position={[0, 2.15, 0]}>
          <mesh>
            <octahedronGeometry args={[0.22]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
        </group>
      ) : null}
      <pointLight position={[0, 1.1, 1.2]} color={GOLD} intensity={night ? 4 : 1.2} distance={4} decay={2} />
    </group>
  )
}

function Model({ kind, level, night }: { kind: BuildingKind; level: number; night: boolean }) {
  switch (kind) {
    case 'forge':
      return <Forge level={level} night={night} />
    case 'anvil':
      return <AnvilModel level={level} />
    case 'lumber_mill':
      return <LumberMill level={level} />
    case 'quarry':
      return <Quarry level={level} />
    case 'beacon':
      return <Beacon level={level} night={night} />
    case 'vault':
      return <Vault level={level} night={night} />
  }
}

function PlotRing({ radius, color, active, dim }: { radius: number; color: string; active: boolean; dim: boolean }) {
  const ring = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    const p = (clock.elapsedTime * 0.6) % 1
    if (ring.current) ring.current.scale.setScalar(1 + p * (active ? 0.35 : 0.15))
    if (mat.current) mat.current.opacity = (dim ? 0.18 : active ? 0.85 : 0.45) * (1 - p * 0.6)
  })
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
      <ringGeometry args={[radius + 0.15, radius + 0.28, 48]} />
      <meshBasicMaterial ref={mat} color={color} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function Blueprint({ radius, locked }: { radius: number; locked: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = 0.55 + Math.sin(clock.elapsedTime * 1.5) * 0.08
  })
  const color = locked ? '#8a93a6' : '#7fe6ff'
  return (
    <>
      <group ref={group}>
        <mesh>
          <boxGeometry args={[radius * 1.3, 0.9, radius * 1.1]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={locked ? 0.15 : 0.35} toneMapped={false} />
        </mesh>
      </group>
      <group position={[radius * 0.9, 0, radius * 0.75]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.06, 0.8, 0.06]} />
          <Std color={WOOD} />
        </mesh>
        <mesh position={[0, 0.75, 0.02]} castShadow>
          <boxGeometry args={[0.42, 0.26, 0.04]} />
          <Std color="#c99a62" />
        </mesh>
      </group>
    </>
  )
}

function Plot({ kind, level, locked, active, night }: { kind: BuildingKind; level: number; locked: boolean; active: boolean; night: boolean }) {
  const def = BUILDINGS.find((b) => b.id === kind)!
  const grow = useGrowIn(level)
  const y = sandHeight(def.x, def.z)
  return (
    <group position={[def.x, y - 0.02, def.z]}>
      <PlotRing radius={def.radius} color={level > 0 ? GOLD : locked ? '#8a93a6' : '#7fe6ff'} active={active} dim={level > 0 && !active} />
      {level > 0 ? (
        <group ref={grow} scale={0.01}>
          <Model kind={kind} level={level} night={night} />
        </group>
      ) : (
        <Blueprint radius={def.radius} locked={locked} />
      )}
    </group>
  )
}

function NodeModel({ node }: { node: ResourceNode }) {
  const crystals = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    crystals.current?.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial
      m.emissiveIntensity = 1.4 + Math.sin(clock.elapsedTime * 2 + i) * 0.6
    })
  })
  const y = sandHeight(node.x, node.z)
  switch (node.id) {
    case 'palm-grove':
      return (
        <>
          <PalmTree x={node.x + 0.5} z={node.z - 0.4} height={4} lean={0.35} turn={0.8} />
          <PalmTree x={node.x - 0.5} z={node.z + 0.35} height={3.4} lean={0.5} turn={-1.6} />
          <mesh position={[node.x, y + 0.15, node.z + 0.8]} rotation={[0, 0.4, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.9, 10]} />
            <Std color={WOOD} />
          </mesh>
        </>
      )
    case 'driftwood':
      return (
        <group position={[node.x, y, node.z]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, 0.1 + (i === 2 ? 0.16 : 0), (i - 1) * 0.22]} rotation={[0, i * 0.5 - 0.4, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.09, 0.11, 1.2 - i * 0.15, 8]} />
              <Std color="#a89480" />
            </mesh>
          ))}
        </group>
      )
    case 'rock-pile':
      return (
        <>
          <Rock x={node.x} z={node.z} s={1.3} color="#9a9184" />
          <Rock x={node.x + 0.8} z={node.z + 0.4} s={0.7} color="#8a8174" />
          <Rock x={node.x - 0.6} z={node.z + 0.6} s={0.6} />
        </>
      )
    case 'ore-vein':
      return (
        <group>
          <Rock x={node.x} z={node.z} s={1.3} color="#4f4a55" />
          <group ref={crystals} position={[node.x, y, node.z]}>
            {[
              [0.3, 0.75, 0.4, 0.2],
              [-0.35, 0.6, 0.45, 0.16],
              [0.05, 0.95, 0.1, 0.24],
              [0.55, 0.45, -0.1, 0.14],
            ].map(([x, yy, z, s], i) => (
              <mesh key={i} position={[x, yy, z]} rotation={[i, i * 0.6, 0.3]}>
                <octahedronGeometry args={[s]} />
                <meshStandardMaterial color="#8fd0ff" emissive="#3a9cff" emissiveIntensity={1.6} toneMapped={false} />
              </mesh>
            ))}
          </group>
        </group>
      )
  }
}

function NodeRing({ node, active }: { node: ResourceNode; active: boolean }) {
  const y = sandHeight(node.x, node.z)
  return (
    <group position={[node.x, y - 0.02, node.z]}>
      <PlotRing radius={node.radius} color={RESOURCE_META[node.resource].color} active={active} dim={false} />
    </group>
  )
}

function PathAndGate({ night }: { night: boolean }) {
  const stones = Array.from({ length: 13 }, (_, i) => {
    const z = -14.6 - i * 1.05
    const x = 1.9 + Math.sin(i * 0.9) * 0.25
    return { x, z, r: 0.36 + ((i * 7) % 3) * 0.04 }
  })
  const lanterns = [
    { x: 0.2, z: -16.5 },
    { x: 3.6, z: -16.5 },
    { x: 0.2, z: -22.5 },
    { x: 3.6, z: -22.5 },
  ]
  return (
    <group>
      {stones.map((s, i) => (
        <mesh key={i} position={[s.x, sandHeight(s.x, s.z) + 0.03, s.z]} rotation={[-Math.PI / 2, 0, i]} receiveShadow>
          <circleGeometry args={[s.r, 9]} />
          <Std color="#bfae93" rough={1} />
        </mesh>
      ))}
      {[0.4, 3.4].map((x) => (
        <mesh key={x} position={[x, sandHeight(x, -14) + 1.2, -14]} castShadow>
          <cylinderGeometry args={[0.12, 0.15, 2.4, 10]} />
          <Std color={WOOD_DARK} />
        </mesh>
      ))}
      <mesh position={[1.9, sandHeight(1.9, -14) + 2.45, -14]} castShadow>
        <boxGeometry args={[3.6, 0.22, 0.26]} />
        <Std color={WOOD} />
      </mesh>
      <mesh position={[1.9, sandHeight(1.9, -14) + 2.05, -13.86]} castShadow>
        <boxGeometry args={[1.8, 0.5, 0.05]} />
        <Std color="#2f6f8f" />
      </mesh>
      <mesh position={[1.9, sandHeight(1.9, -14) + 2.05, -13.83]}>
        <boxGeometry args={[1.5, 0.06, 0.02]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={night ? 2 : 0.6} toneMapped={false} />
      </mesh>
      {lanterns.map((l) => {
        const y = sandHeight(l.x, l.z)
        return (
          <group key={`${l.x}-${l.z}`} position={[l.x, y, l.z]}>
            <mesh position={[0, 0.6, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.05, 1.2, 6]} />
              <Std color={METAL} metal={0.6} rough={0.5} />
            </mesh>
            <mesh position={[0, 1.28, 0]}>
              <boxGeometry args={[0.18, 0.22, 0.18]} />
              <meshStandardMaterial color="#ffe2a8" emissive="#ffb34d" emissiveIntensity={night ? 3 : 0.5} toneMapped={false} />
            </mesh>
            {night ? <pointLight position={[0, 1.3, 0]} color="#ffbe6b" intensity={3} distance={4.5} decay={2} /> : null}
          </group>
        )
      })}
    </group>
  )
}

export function Homestead({
  night,
  levels,
  nearKey,
}: {
  night: boolean
  levels: Partial<Record<BuildingKind, number>>
  nearKey: string | null
}) {
  return (
    <group>
      <PathAndGate night={night} />
      {BUILDINGS.map((b) => (
        <Plot
          key={b.id}
          kind={b.id}
          level={levels[b.id] ?? 0}
          locked={!!b.requires && !levels[b.requires]}
          active={nearKey === `plot:${b.id}`}
          night={night}
        />
      ))}
      {RESOURCE_NODES.map((n) => (
        <group key={n.id}>
          <NodeModel node={n} />
          <NodeRing node={n} active={nearKey === `node:${n.id}`} />
        </group>
      ))}
    </group>
  )
}
