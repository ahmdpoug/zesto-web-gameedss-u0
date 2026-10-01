'use client'

import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

const POOL = 140
const GRAVITY = 9

type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; gravity: number }

const pool: Particle[] = Array.from({ length: POOL }, () => ({ x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0, gravity: 1 }))
let cursor = 0

function spawn(p: Omit<Particle, 'life'>) {
  const slot = pool[cursor]
  Object.assign(slot, p, { life: p.max })
  cursor = (cursor + 1) % POOL
}

/** Sand chunks thrown outward from a dig hole. */
export function emitSand(x: number, y: number, z: number, count = 6) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const s = 1.2 + Math.random() * 1.8
    spawn({ x, y: y + 0.05, z, vx: Math.cos(a) * s, vy: 2.6 + Math.random() * 2.4, vz: Math.sin(a) * s, max: 0.7 + Math.random() * 0.4, size: 0.05 + Math.random() * 0.06, gravity: 1 })
  }
}

/** Soft dust puffs kicked up by footsteps. */
export function emitDust(x: number, y: number, z: number) {
  for (let i = 0; i < 2; i++) {
    spawn({
      x: x + (Math.random() - 0.5) * 0.3,
      y: y + 0.05,
      z: z + (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 0.4,
      vy: 0.3 + Math.random() * 0.3,
      vz: (Math.random() - 0.5) * 0.4,
      max: 0.55,
      size: 0.07 + Math.random() * 0.05,
      gravity: 0.05,
    })
  }
}

const geometry = new THREE.IcosahedronGeometry(1, 0)
const dummy = new THREE.Object3D()

export function SandParticles({ color }: { color: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (let i = 0; i < POOL; i++) m.setMatrixAt(i, dummy.matrix)
    m.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((_, raw) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(raw, 0.05)
    for (let i = 0; i < POOL; i++) {
      const p = pool[i]
      if (p.life > 0) {
        p.life -= dt
        p.vy -= GRAVITY * p.gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.z += p.vz * dt
        const t = Math.max(0, p.life / p.max)
        dummy.position.set(p.x, p.y, p.z)
        dummy.rotation.set(p.life * 6, p.life * 4, 0)
        dummy.scale.setScalar(p.size * Math.min(1, t * 2.2))
      } else {
        dummy.scale.setScalar(0)
      }
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, POOL]} frustumCulled={false} castShadow>
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </instancedMesh>
  )
}
