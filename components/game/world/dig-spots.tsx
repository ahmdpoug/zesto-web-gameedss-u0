'use client'

import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { sandHeight, type WorldSpot } from '@/lib/zesto/world'

function DigSpot({ spot, active, digging }: { spot: WorldSpot; active: boolean; digging: boolean }) {
  const ring = useRef<THREE.Mesh>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const mark = useRef<THREE.Group>(null)
  const beam = useRef<THREE.MeshBasicMaterial>(null)
  const hole = useRef<THREE.Mesh>(null)
  const holeSize = useRef(0)
  const y = sandHeight(spot.x, spot.z)

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime + spot.x
    const pulse = (t * 0.7) % 1
    if (ring.current && ringMat.current) {
      ring.current.scale.setScalar(0.6 + pulse * (active ? 1.4 : 1))
      ringMat.current.opacity = (1 - pulse) * (active ? 0.9 : 0.55)
    }
    if (mark.current) {
      mark.current.position.y = 0.06 + Math.sin(t * 2.4) * 0.03
      const target = active ? 1.25 : 1
      const s = THREE.MathUtils.damp(mark.current.scale.x, digging ? 0.001 : target, 8, delta)
      mark.current.scale.setScalar(s)
    }
    if (beam.current) {
      const target = digging ? 0 : active ? 0.26 : 0.09
      beam.current.opacity = THREE.MathUtils.damp(beam.current.opacity, target + Math.sin(t * 3) * 0.03, 6, delta)
    }
    if (hole.current) {
      holeSize.current = THREE.MathUtils.damp(holeSize.current, digging ? 1 : 0, 1.5, delta)
      hole.current.scale.setScalar(Math.max(0.001, holeSize.current))
    }
  })

  const glow = active ? '#ffe08a' : '#ffc46b'

  return (
    <group position={[spot.x, y, spot.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.85, 32]} />
        <meshBasicMaterial color="#6b4220" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh ref={hole} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#3a2210" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.62, 0.7, 48]} />
        <meshBasicMaterial ref={ringMat} color={glow} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={mark}>
        {[Math.PI / 4, -Math.PI / 4].map((r) => (
          <mesh key={r} rotation={[-Math.PI / 2, 0, r]}>
            <planeGeometry args={[0.85, 0.16]} />
            <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.95} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.45, 0.6, 3.2, 24, 1, true]} />
        <meshBasicMaterial
          ref={beam}
          color={glow}
          transparent
          opacity={0.14}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {!digging ? <Sparkles count={active ? 22 : 10} scale={[1.4, 2.2, 1.4]} position={[0, 1, 0]} size={active ? 5 : 3} speed={0.6} color={glow} /> : null}
    </group>
  )
}

export function DigSpots({ spots, activeIndex, digIndex }: { spots: WorldSpot[]; activeIndex: number | null; digIndex: number | null }) {
  return (
    <group>
      {spots.map((spot, i) => (
        <DigSpot key={`${spot.x.toFixed(2)}:${spot.z.toFixed(2)}`} spot={spot} active={activeIndex === i} digging={digIndex === i} />
      ))}
    </group>
  )
}
