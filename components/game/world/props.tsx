'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { sandHeight } from '@/lib/zesto/world'

export function PalmTree({ x, z, height = 4.2, lean = 0.25, turn = 0 }: { x: number; z: number; height?: number; lean?: number; turn?: number }) {
  const segments = 7
  const crown = useMemo(() => {
    const p = new THREE.Vector3()
    for (let i = 0; i < segments; i++) {
      const t = i / segments
      p.y += height / segments
      p.x += Math.sin(t * 1.6) * lean * 0.5
    }
    return p
  }, [height, lean])
  const fronds = 8
  return (
    <group position={[x, sandHeight(x, z) - 0.1, z]} rotation={[0, turn, 0]}>
      {Array.from({ length: segments }, (_, i) => {
        const t = i / segments
        const y = (height / segments) * (i + 0.5)
        const offset = Array.from({ length: i }, (_, k) => Math.sin((k / segments) * 1.6) * lean * 0.5).reduce((a, b) => a + b, 0)
        const r = 0.2 - t * 0.07
        return (
          <mesh key={i} position={[offset, y, 0]} rotation={[0, 0, -lean * 0.35 * t]} castShadow>
            <cylinderGeometry args={[r * 0.9, r, height / segments + 0.02, 10]} />
            <meshStandardMaterial color={i % 2 ? '#8a5c34' : '#7a4f2b'} roughness={1} />
          </mesh>
        )
      })}
      <group position={crown}>
        {Array.from({ length: fronds }, (_, i) => {
          const a = (i / fronds) * Math.PI * 2
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh position={[0, 0.05, 0.95]} rotation={[0.55 + (i % 2) * 0.2, 0, 0]} scale={[0.32, 0.05, 1.1]} castShadow>
                <sphereGeometry args={[1, 12, 8]} />
                <meshStandardMaterial color={i % 2 ? '#3f9a3a' : '#2f8a35'} roughness={0.8} />
              </mesh>
            </group>
          )
        })}
        {[0, 2.1, 4.2].map((a) => (
          <mesh key={a} position={[Math.sin(a) * 0.2, -0.15, Math.cos(a) * 0.2]} castShadow>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial color="#5a3a1c" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function Rock({ x, z, s = 1, color = '#8d8478' }: { x: number; z: number; s?: number; color?: string }) {
  return (
    <mesh position={[x, sandHeight(x, z) + 0.1 * s, z]} rotation={[x, z, 0]} scale={[s, s * 0.7, s * 0.9]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
  )
}

function Umbrella({ x, z, color }: { x: number; z: number; color: string }) {
  const y = sandHeight(x, z)
  return (
    <group position={[x, y, z]} rotation={[0, 0, -0.12]}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 2.4, 8]} />
        <meshStandardMaterial color="#f5efe6" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <coneGeometry args={[1.5, 0.55, 10, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} flatShading />
      </mesh>
      <mesh position={[0.9, 0.02, 0.4]} rotation={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[1, 0.03, 1.9]} />
        <meshStandardMaterial color="#fff2dc" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 0.04, 0.4]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.28, 0.031, 1.9]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  )
}

function Starfish({ x, z, color = '#ff7a59' }: { x: number; z: number; color?: string }) {
  return (
    <group position={[x, sandHeight(x, z) + 0.03, z]} rotation={[0, x * 3, 0]}>
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.4]}>
            <coneGeometry args={[0.06, 0.3, 6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Lighthouse({ night }: { night: boolean }) {
  const beam = useRef<THREE.Group>(null)
  const x = 18
  const z = -34
  const base = sandHeight(x, z)
  useFrame(({ clock }) => {
    if (beam.current) beam.current.rotation.y = clock.elapsedTime * 0.7
  })
  return (
    <group position={[x, base - 0.2, z]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.9 + i * 1.8, 0]} castShadow>
          <cylinderGeometry args={[1.05 - (i + 1) * 0.12, 1.05 - i * 0.12, 1.8, 24]} />
          <meshStandardMaterial color={i % 2 ? '#d9473f' : '#f6f1e8'} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 7.4, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.12, 24]} />
        <meshStandardMaterial color="#2b2f38" roughness={0.5} />
      </mesh>
      <mesh position={[0, 7.95, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1, 16]} />
        <meshStandardMaterial color="#fff6c8" emissive="#ffd36b" emissiveIntensity={night ? 4 : 1.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 8.75, 0]}>
        <coneGeometry args={[0.7, 0.7, 16]} />
        <meshStandardMaterial color="#d9473f" roughness={0.6} />
      </mesh>
      {night ? (
        <group ref={beam} position={[0, 7.95, 0]}>
          <mesh position={[0, 0, 9]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[2.4, 18, 24, 1, true]} />
            <meshBasicMaterial color="#ffe7a8" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight color="#ffd88a" intensity={20} distance={20} decay={1.6} />
        </group>
      ) : null}
    </group>
  )
}

function Islands({ night }: { night: boolean }) {
  const color = night ? '#1a2440' : '#7a9a8e'
  return (
    <group>
      {[
        { x: -70, z: -40, s: 9 },
        { x: -85, z: -12, s: 6 },
        { x: -64, z: 18, s: 5 },
      ].map((i) => (
        <mesh key={i.x} position={[i.x, -1.5, i.z]} scale={[i.s * 1.8, i.s * 0.55, i.s]}>
          <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={1} fog />
        </mesh>
      ))}
    </group>
  )
}

export function BeachProps({ night }: { night: boolean }) {
  return (
    <group>
      <PalmTree x={11} z={4} height={4.6} lean={0.5} turn={-0.6} />
      <PalmTree x={12.5} z={-3} height={5.2} lean={0.35} turn={0.4} />
      <PalmTree x={10.6} z={-10.5} height={4.2} lean={0.55} turn={-1.2} />
      <PalmTree x={13.5} z={-17} height={5.4} lean={0.3} turn={0.9} />
      <PalmTree x={11.2} z={11} height={4.4} lean={0.6} turn={-0.2} />
      <PalmTree x={16} z={1} height={5} lean={0.3} turn={2.2} />
      <Umbrella x={9.6} z={-6.5} color="#ff6b5a" />
      <Umbrella x={10} z={7.5} color="#3cc6b8" />
      <Rock x={-6.4} z={-12} s={1.4} />
      <Rock x={-7.2} z={-10.6} s={0.8} />
      <Rock x={-6.8} z={9.5} s={1.1} />
      <Rock x={9.4} z={-14.5} s={1.2} color="#9a8f80" />
      <Rock x={-5.8} z={-17} s={1.8} />
      <Starfish x={-4.2} z={6.5} />
      <Starfish x={7.6} z={-12} color="#ffb347" />
      <Starfish x={-5.3} z={-6} color="#ff5f8f" />
      <Lighthouse night={night} />
      <Islands night={night} />
    </group>
  )
}
