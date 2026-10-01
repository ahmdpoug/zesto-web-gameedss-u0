'use client'

import { useFrame, type ThreeElements } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import type { CharacterId } from '@/lib/zesto/config'

export type Motion = { speed: number; dig: number }

const BODY_Y = 0.98
const RX = 0.78
const RY = 0.82
const RZ = 0.72
const EYE_Y = 0.18
const EYE_X = 0.25
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

type Look = {
  fur: string
  peak: number
  gaze: [number, number]
  eyes: 'round' | 'x' | 'sleepy' | 'shades'
}

const LOOKS: Record<CharacterId, Look> = {
  blu: { fur: '#2a78f0', peak: 0, gaze: [0.25, 0.4], eyes: 'round' },
  sage: { fur: '#f6cf1c', peak: 0, gaze: [0.05, -0.35], eyes: 'round' },
  frost: { fur: '#eef5ff', peak: 0, gaze: [0, 0], eyes: 'x' },
  shade: { fur: '#1b1b1f', peak: 0, gaze: [0.4, 0.05], eyes: 'sleepy' },
  blaze: { fur: '#ff7a1a', peak: 0.42, gaze: [-0.35, 0.1], eyes: 'round' },
  sprout: { fur: '#46c42e', peak: 0.55, gaze: [0.1, -0.15], eyes: 'round' },
  royal: { fur: '#8a4dff', peak: 0, gaze: [0, 0], eyes: 'shades' },
  rosie: { fur: '#ff6cb6', peak: 0, gaze: [0, 0], eyes: 'shades' },
}

const heartGeometry = (() => {
  const s = new THREE.Shape()
  s.moveTo(25, 25)
  s.bezierCurveTo(25, 25, 20, 0, 0, 0)
  s.bezierCurveTo(-30, 0, -30, 35, -30, 35)
  s.bezierCurveTo(-30, 55, -10, 77, 25, 95)
  s.bezierCurveTo(60, 77, 80, 55, 80, 35)
  s.bezierCurveTo(80, 35, 80, 0, 50, 0)
  s.bezierCurveTo(35, 0, 25, 25, 25, 25)
  const geo = new THREE.ExtrudeGeometry(s, { depth: 10, bevelEnabled: true, bevelThickness: 6, bevelSize: 5, bevelSegments: 5, curveSegments: 28 })
  geo.center()
  geo.rotateZ(Math.PI)
  geo.scale(1 / 110, 1 / 110, 1 / 110)
  geo.computeVertexNormals()
  return geo
})()

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function eyeCenter(side: 1 | -1) {
  const x = EYE_X * side
  const z = RZ * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2 - (EYE_Y / RY) ** 2))
  return new THREE.Vector3(x, EYE_Y, z + 0.02)
}

const clumpGeometry = new THREE.IcosahedronGeometry(1, 1)

/** A plush ball built from hundreds of instanced fur clumps over a solid core. */
function FuzzBall({
  radius,
  count,
  clump,
  color,
  peak = 0,
  exclude = [],
  seed = 1,
}: {
  radius: [number, number, number]
  count: number
  clump: number
  color: string
  peak?: number
  exclude?: THREE.Vector3[]
  seed?: number
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const [rx, ry, rz] = radius

  const instances = useMemo(() => {
    const rand = seeded(seed * 9973)
    const base = new THREE.Color(color)
    const hsl = { h: 0, s: 0, l: 0 }
    base.getHSL(hsl)
    const dummy = new THREE.Object3D()
    const matrices: THREE.Matrix4[] = []
    const colors: THREE.Color[] = []
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = GOLDEN * i
      let px = Math.cos(theta) * r * rx
      let py = y * ry
      let pz = Math.sin(theta) * r * rz
      if (peak > 0 && y > 0.35) {
        const t = (y - 0.35) / 0.65
        py += peak * t * t * 1.4
        const pinch = 1 - 0.55 * t * t
        px *= pinch
        pz *= pinch
      }
      const point = new THREE.Vector3(px, py, pz)
      if (exclude.some((e) => e.distanceTo(point) < 0.24)) continue
      dummy.position.copy(point)
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
      dummy.scale.setScalar(clump * (0.78 + rand() * 0.5))
      dummy.updateMatrix()
      matrices.push(dummy.matrix.clone())
      colors.push(new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * (0.92 + rand() * 0.16)), Math.min(1, Math.max(0, hsl.l + (rand() - 0.5) * 0.1))))
    }
    return { matrices, colors }
  }, [rx, ry, rz, count, clump, color, peak, exclude, seed])

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    instances.matrices.forEach((matrix, i) => {
      m.setMatrixAt(i, matrix)
      m.setColorAt(i, instances.colors[i])
    })
    m.count = instances.matrices.length
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [instances])

  const core = useMemo(() => new THREE.Color(color).multiplyScalar(0.82), [color])
  const coneHeight = ry + peak * 1.4 - 0.1 - ry * 0.5

  return (
    <group>
      <instancedMesh ref={mesh} args={[clumpGeometry, undefined, count]} castShadow receiveShadow>
        <meshPhysicalMaterial roughness={0.9} sheen={1} sheenRoughness={0.45} sheenColor="#ffffff" />
      </instancedMesh>
      <mesh scale={[rx * 0.94, ry * 0.94, rz * 0.94]} castShadow>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={core} roughness={1} />
      </mesh>
      {peak > 0 ? (
        <mesh position={[0, ry * 0.5 + coneHeight / 2, 0]} scale={[1, 1, rz / rx]}>
          <coneGeometry args={[rx * 0.72, coneHeight, 24]} />
          <meshStandardMaterial color={core} roughness={1} />
        </mesh>
      ) : null}
    </group>
  )
}

/** The Zesto "Z" built from three bars so it needs no font assets. */
function ZMark({ color, size = 0.3, emissive = 0, ...props }: { color: string; size?: number; emissive?: number } & ThreeElements['group']) {
  const t = 0.2
  const diag = Math.hypot(1, 1 - t * 2)
  const angle = Math.atan2(1 - t * 2, 1)
  return (
    <group scale={size} {...props}>
      {[
        { p: [0, 0.5 - t / 2, 0], s: [1, t, t], r: 0 },
        { p: [0, -0.5 + t / 2, 0], s: [1, t, t], r: 0 },
        { p: [0, 0, 0], s: [diag, t, t], r: angle },
      ].map((bar, i) => (
        <mesh key={i} position={bar.p as [number, number, number]} rotation={[0, 0, bar.r]}>
          <boxGeometry args={bar.s as [number, number, number]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

const gloss = { roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 }

function Eye({ side, look }: { side: 1 | -1; look: Look }) {
  const center = eyeCenter(side)
  const [gx, gy] = look.gaze
  const dir = new THREE.Vector3(gx, gy, 1).normalize()
  const pupil = dir.clone().multiplyScalar(0.2)
  return (
    <group position={center}>
      <mesh scale={[1, 1, 0.82]} castShadow>
        <sphereGeometry args={[0.26, 32, 24]} />
        <meshPhysicalMaterial color="#ffffff" {...gloss} />
      </mesh>
      {look.eyes === 'x' ? (
        <group position={[0, 0, 0.215]}>
          {[Math.PI / 4, -Math.PI / 4].map((r) => (
            <mesh key={r} rotation={[0, 0, r]}>
              <boxGeometry args={[0.26, 0.06, 0.04]} />
              <meshStandardMaterial color="#141418" roughness={0.3} />
            </mesh>
          ))}
        </group>
      ) : (
        <>
          <mesh position={pupil} scale={[1, 1, 0.55]}>
            <sphereGeometry args={[0.13, 24, 16]} />
            <meshPhysicalMaterial color="#0b0b0e" {...gloss} />
          </mesh>
          <mesh position={[pupil.x + 0.045, pupil.y + 0.05, pupil.z + 0.07]}>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </>
      )}
      {look.eyes === 'sleepy' ? (
        <mesh rotation={[-0.25, 0, 0]}>
          <sphereGeometry args={[0.272, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <meshStandardMaterial color="#2a2a30" roughness={0.6} />
        </mesh>
      ) : null}
    </group>
  )
}

function Beanie({ color, cuff, mark, markEmissive = 0, pompom }: { color: string; cuff: string; mark: string; markEmissive?: number; pompom?: string }) {
  return (
    <group position={[0, 0.42, 0]}>
      <mesh scale={[1, 0.72, 0.95]} castShadow>
        <sphereGeometry args={[0.9, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[0, 0.06, 0]} scale={[1, 1, 0.95]} castShadow>
        <cylinderGeometry args={[0.93, 0.95, 0.24, 40]} />
        <meshStandardMaterial color={cuff} roughness={1} />
      </mesh>
      <ZMark color={mark} emissive={markEmissive} size={0.17} position={[0, 0.07, 0.9]} />
      {pompom ? (
        <group position={[0, 0.7, 0]}>
          <FuzzBall radius={[0.17, 0.17, 0.17]} count={60} clump={0.07} color={pompom} seed={7} />
        </group>
      ) : null}
    </group>
  )
}

function Cap() {
  return (
    <group position={[0, 0.4, 0]}>
      <mesh scale={[1, 0.64, 0.96]} castShadow>
        <sphereGeometry args={[0.88, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1f63d8" roughness={0.75} />
      </mesh>
      <mesh scale={[1, 0.64, 0.96]}>
        <sphereGeometry args={[0.89, 32, 16, Math.PI / 2 - 0.62, 1.24, 0.12, Math.PI / 2 - 0.12]} />
        <meshStandardMaterial color="#f4f6fb" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.03, 0.82]} rotation={[0.18, 0, 0]} scale={[1, 1, 0.85]} castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.05, 40]} />
        <meshStandardMaterial color="#1f63d8" roughness={0.75} />
      </mesh>
      <ZMark color="#1f63d8" size={0.24} position={[0, 0.3, 0.74]} rotation={[-0.55, 0, 0]} />
      <mesh position={[0, 0.57, 0]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshStandardMaterial color="#1f63d8" />
      </mesh>
    </group>
  )
}

function Pacifier() {
  return (
    <group position={[0, -0.24, 0.7]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 32]} />
        <meshPhysicalMaterial color="#69c8ff" {...gloss} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshPhysicalMaterial color="#9fdcff" {...gloss} />
      </mesh>
      <mesh position={[0, -0.06, 0.1]} rotation={[0.25, 0, 0]}>
        <torusGeometry args={[0.12, 0.03, 12, 32]} />
        <meshPhysicalMaterial color="#69c8ff" {...gloss} />
      </mesh>
    </group>
  )
}

function Glasses() {
  const left = eyeCenter(-1)
  const right = eyeCenter(1)
  const frame = <meshPhysicalMaterial color="#121214" {...gloss} />
  return (
    <group position={[0, 0, 0.1]}>
      {[left, right].map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]}>
          <torusGeometry args={[0.27, 0.035, 12, 40]} />
          {frame}
        </mesh>
      ))}
      <mesh position={[0, EYE_Y + 0.04, left.z + 0.02]}>
        <boxGeometry args={[0.16, 0.045, 0.045]} />
        {frame}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.53, EYE_Y, left.z - 0.25]} rotation={[0, s * 0.35, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.5]} />
          {frame}
        </mesh>
      ))}
    </group>
  )
}

function Book() {
  return (
    <group position={[0, -0.32, 0.86]} rotation={[-0.55, 0, 0]}>
      {[-1, 1].map((s) => (
        <group key={s} rotation={[0, s * 0.42, 0]}>
          <mesh position={[s * 0.17, 0, 0]} castShadow>
            <boxGeometry args={[0.34, 0.44, 0.035]} />
            <meshStandardMaterial color="#1d2430" roughness={0.6} />
          </mesh>
          <mesh position={[s * 0.16, 0, -0.03]}>
            <boxGeometry args={[0.31, 0.41, 0.03]} />
            <meshStandardMaterial color="#fbf6ea" roughness={0.9} />
          </mesh>
          <ZMark color="#b6ff2e" emissive={0.5} size={0.11} position={[s * 0.18, 0, 0.022]} />
        </group>
      ))}
    </group>
  )
}

function Headphones() {
  return (
    <group position={[0, 0.06, 0]}>
      <mesh>
        <torusGeometry args={[0.98, 0.06, 12, 48, Math.PI]} />
        <meshPhysicalMaterial color="#141416" {...gloss} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.96, -0.02, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.27, 0.27, 0.2, 32]} />
            <meshPhysicalMaterial color="#141416" {...gloss} />
          </mesh>
          <ZMark color="#b6ff2e" emissive={1.2} size={0.15} position={[s * 0.105, 0, 0]} rotation={[0, s * (Math.PI / 2), 0]} />
        </group>
      ))}
    </group>
  )
}

function Hoodie() {
  return (
    <group>
      <mesh scale={[0.98, 0.98, 0.92]} castShadow>
        <sphereGeometry args={[1, 40, 24, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44]} />
        <meshStandardMaterial color="#111114" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.5, 0.8]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.04, 0.42, 0.03]} />
        <meshStandardMaterial color="#b6ff2e" emissive="#b6ff2e" emissiveIntensity={0.6} />
      </mesh>
      {[-0.42, -0.62].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.93, 1]}>
          <torusGeometry args={[Math.sqrt(1 - y * y) * 0.98, 0.018, 8, 64]} />
          <meshStandardMaterial color="#b6ff2e" emissive="#b6ff2e" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function Scarf() {
  return (
    <group position={[0, -0.22, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.93, 1]} castShadow>
        <torusGeometry args={[0.8, 0.13, 16, 48]} />
        <meshStandardMaterial color="#1f5fe0" roughness={1} />
      </mesh>
      <mesh position={[0.32, -0.36, 0.72]} rotation={[0.25, 0, 0.12]} castShadow>
        <boxGeometry args={[0.22, 0.56, 0.08]} />
        <meshStandardMaterial color="#1f5fe0" roughness={1} />
      </mesh>
    </group>
  )
}

function GlassShell() {
  return (
    <mesh scale={[RX + 0.26, RY + 0.24, RZ + 0.26]}>
      <sphereGeometry args={[1, 40, 28]} />
      <meshPhysicalMaterial color="#dcefff" transparent opacity={0.16} roughness={0.05} clearcoat={1} depthWrite={false} />
    </mesh>
  )
}

function GlowOrb() {
  const light = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = 2.2 + Math.sin(clock.elapsedTime * 5) * 0.5
  })
  return (
    <group position={[0, -0.18, 0.92]}>
      <mesh>
        <sphereGeometry args={[0.17, 24, 16]} />
        <meshStandardMaterial color="#fff2a8" emissive="#ffd43b" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.1, 0.26, 16]} />
        <meshStandardMaterial color="#fff2a8" emissive="#ffb21a" emissiveIntensity={2.5} toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <pointLight ref={light} color="#ffd56b" distance={4} decay={2} />
    </group>
  )
}

function Crown() {
  const gold = { color: '#ffd24a', emissive: '#b87a00', emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.1 }
  const points = 5
  return (
    <group position={[0.1, RY + 0.14, 0]} rotation={[-0.1, 0, -0.2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.27, 0.16, 40, 1, true]} />
        <meshPhysicalMaterial {...gold} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.275, 0.025, 10, 40]} />
        <meshPhysicalMaterial {...gold} />
      </mesh>
      {Array.from({ length: points }, (_, i) => {
        const a = (i / points) * Math.PI * 2
        return (
          <group key={i} position={[Math.sin(a) * 0.29, 0.15, Math.cos(a) * 0.29]}>
            <mesh castShadow>
              <coneGeometry args={[0.075, 0.18, 12]} />
              <meshPhysicalMaterial {...gold} />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <sphereGeometry args={[0.035, 12, 10]} />
              <meshPhysicalMaterial {...gold} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0, 0.29]}>
        <octahedronGeometry args={[0.045]} />
        <meshPhysicalMaterial color="#ff3d8b" emissive="#ff3d8b" emissiveIntensity={0.6} roughness={0.1} clearcoat={1} />
      </mesh>
    </group>
  )
}

function HeartShades() {
  const left = eyeCenter(-1)
  const frame = <meshPhysicalMaterial color="#fbfbff" roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
  return (
    <group position={[0, 0.02, 0.06]}>
      {[-1, 1].map((side) => {
        const c = eyeCenter(side as 1 | -1)
        return (
          <group key={side} position={[c.x * 1.08, c.y, c.z]} rotation={[0, side * 0.22, 0]}>
            <mesh geometry={heartGeometry} scale={[0.46, 0.46, 0.5]} castShadow>
              {frame}
            </mesh>
            <mesh geometry={heartGeometry} position={[0, 0.005, 0.035]} scale={[0.36, 0.36, 0.3]}>
              <meshPhysicalMaterial color="#0d0a14" roughness={0.05} clearcoat={1} clearcoatRoughness={0.02} metalness={0.4} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, EYE_Y + 0.06, left.z + 0.02]}>
        <boxGeometry args={[0.14, 0.05, 0.05]} />
        {frame}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.6, EYE_Y + 0.03, left.z - 0.28]} rotation={[0, s * 0.3, 0]}>
          <boxGeometry args={[0.05, 0.06, 0.56]} />
          {frame}
        </mesh>
      ))}
    </group>
  )
}

function HeldHeart() {
  return (
    <mesh geometry={heartGeometry} position={[0, -0.36, 0.86]} rotation={[-0.25, 0, 0]} scale={[0.5, 0.5, 0.6]} castShadow>
      <meshPhysicalMaterial color="#ff4fa3" emissive="#ff2e8a" emissiveIntensity={0.25} roughness={0.12} clearcoat={1} clearcoatRoughness={0.05} />
    </mesh>
  )
}

function Sneaker({ side }: { side: 1 | -1 }) {
  return (
    <group>
      <mesh position={[0, 0, 0.06]} scale={[1, 0.62, 1.3]} castShadow>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshStandardMaterial color="#f2f2f4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.07, 0.02]} scale={[0.92, 0.5, 1.15]}>
        <sphereGeometry args={[0.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#18181b" roughness={0.6} />
      </mesh>
      <mesh position={[side * 0.18, 0.02, 0.06]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.02, 0.05, 0.22]} />
        <meshStandardMaterial color="#b6ff2e" emissive="#b6ff2e" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

function Shovel({ visible }: { visible: RefObject<THREE.Group | null> }) {
  return (
    <group ref={visible} position={[0.05, -0.2, 0.1]} rotation={[0.3, 0, 0]} visible={false}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.7, 10]} />
        <meshStandardMaterial color="#9a6a3c" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.28, 0.02]}>
        <boxGeometry args={[0.2, 0.24, 0.025]} />
        <meshStandardMaterial color="#c9ced6" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

export function ZestoModel({ id, motion }: { id: CharacterId; motion: RefObject<Motion> }) {
  const look = LOOKS[id]
  const body = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftFoot = useRef<THREE.Group>(null)
  const rightFoot = useRef<THREE.Group>(null)
  const shovel = useRef<THREE.Group>(null)
  const phase = useRef(0)

  const exclude = useMemo(() => [eyeCenter(1), eyeCenter(-1)], [])
  const holds = id === 'sage' || id === 'sprout' || id === 'rosie'

  useFrame(({ clock }, delta) => {
    const m = motion.current
    if (!m || !body.current) return
    const t = clock.elapsedTime
    const s = m.speed
    const d = m.dig
    phase.current += delta * (4 + 9 * s)
    const p = phase.current
    const stride = Math.sin(p)

    const bob = Math.abs(stride) * 0.1 * s + Math.sin(t * 2.2) * 0.014 * (1 - s)
    const digBob = Math.abs(Math.sin(t * 14)) * 0.06 * d
    body.current.position.y = BODY_Y + bob + digBob
    body.current.rotation.x = s * 0.14 + d * (0.42 + Math.sin(t * 14) * 0.1)
    body.current.rotation.z = stride * 0.07 * s
    const squash = 1 + Math.sin(t * 2.2) * 0.012 * (1 - s) - Math.abs(Math.cos(p)) * 0.03 * s
    body.current.scale.set(2 - squash, squash, 2 - squash)

    const armSwing = stride * 0.8 * s
    const scoop = -1.4 + Math.sin(t * 14) * 0.6
    if (leftArm.current && rightArm.current) {
      const holdX = holds ? -1.05 : 0
      leftArm.current.rotation.x = THREE.MathUtils.lerp(holdX + (holds ? 0 : armSwing), scoop, d)
      rightArm.current.rotation.x = THREE.MathUtils.lerp(holdX + (holds ? 0 : -armSwing), scoop, d)
      const raise = id === 'blaze' ? Math.max(0, 1 - s * 2) * (1 - d) : 0
      rightArm.current.rotation.z = -raise * 2.3 + (holds ? 0.35 : 0) * (1 - d)
      leftArm.current.rotation.z = (holds ? -0.35 : 0) * (1 - d)
    }
    if (leftFoot.current && rightFoot.current) {
      leftFoot.current.rotation.x = stride * 0.75 * s
      rightFoot.current.rotation.x = -stride * 0.75 * s
      leftFoot.current.position.y = 0.17 + Math.max(0, stride) * 0.12 * s
      rightFoot.current.position.y = 0.17 + Math.max(0, -stride) * 0.12 * s
    }
    if (shovel.current) shovel.current.visible = d > 0.35
  })

  const footColor = useMemo(() => new THREE.Color(look.fur).multiplyScalar(0.9).getStyle(), [look.fur])

  return (
    <group scale={0.82}>
      {[-1, 1].map((side) => (
        <group key={side} ref={side === -1 ? leftFoot : rightFoot} position={[side * 0.32, 0.17, 0.08]}>
          {id === 'shade' ? (
            <Sneaker side={side as 1 | -1} />
          ) : (
            <group position={[0, 0, 0.05]}>
              <FuzzBall radius={[0.25, 0.17, 0.3]} count={70} clump={0.085} color={footColor} seed={side + 3} />
            </group>
          )}
        </group>
      ))}

      <group ref={body} position={[0, BODY_Y, 0]}>
        <FuzzBall radius={[RX, RY, RZ]} count={560} clump={0.165} color={look.fur} peak={look.peak} exclude={exclude} />
        {look.eyes === 'shades' ? (
          <HeartShades />
        ) : (
          <>
            <Eye side={-1} look={look} />
            <Eye side={1} look={look} />
          </>
        )}

        {[-1, 1].map((side) => (
          <group key={side} ref={side === -1 ? leftArm : rightArm} position={[side * 0.68, -0.05, 0.04]}>
            <group position={[side * 0.1, -0.24, 0.02]}>
              <FuzzBall radius={[0.19, 0.22, 0.19]} count={50} clump={0.08} color={id === 'shade' ? '#141417' : look.fur} seed={side + 11} />
              {side === 1 ? <Shovel visible={shovel} /> : null}
            </group>
          </group>
        ))}

        {id === 'blu' ? (
          <>
            <Cap />
            <Pacifier />
          </>
        ) : null}
        {id === 'sage' ? (
          <>
            <Glasses />
            <Book />
          </>
        ) : null}
        {id === 'frost' ? (
          <>
            <Beanie color="#2a6ef0" cuff="#2262dc" mark="#ffffff" pompom="#2a6ef0" />
            <Scarf />
            <GlassShell />
          </>
        ) : null}
        {id === 'shade' ? (
          <>
            <Beanie color="#16161a" cuff="#111114" mark="#b6ff2e" markEmissive={1} />
            <Hoodie />
          </>
        ) : null}
        {id === 'blaze' ? <Headphones /> : null}
        {id === 'sprout' ? <GlowOrb /> : null}
        {id === 'royal' || id === 'rosie' ? <Crown /> : null}
        {id === 'rosie' ? <HeldHeart /> : null}
      </group>
    </group>
  )
}
