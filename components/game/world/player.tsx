'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { CharacterId } from '@/lib/zesto/config'
import {
  BOUNDS,
  HOMESTEAD_START_Z,
  NEAR_RADIUS,
  PLAYER_SPEED,
  input,
  keys,
  playerState,
  sandHeight,
  type Collider,
  type Interactable,
  type WorldSpot,
} from '@/lib/zesto/world'
import { emitDust, emitSand } from './particles'
import { ZestoModel, type Motion } from './zesto-model'

const KEY_MAP: Record<string, string> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

const CAMERA_OFFSET = new THREE.Vector3(0, 7.2, 9.6)

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + diff * (1 - Math.exp(-lambda * dt))
}

function useKeyboard() {
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
    const down = (e: KeyboardEvent) => {
      const k = KEY_MAP[e.code]
      if (!k || isTyping(e)) return
      keys.add(k)
      if (e.code.startsWith('Arrow')) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      const k = KEY_MAP[e.code]
      if (k) keys.delete(k)
    }
    const clear = () => keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      keys.clear()
    }
  }, [])
}

function resolveCollisions(colliders: Collider[]) {
  const PLAYER_R = 0.35
  for (const c of colliders) {
    const dx = playerState.x - c.x
    const dz = playerState.z - c.z
    const dist = Math.hypot(dx, dz)
    const min = c.r + PLAYER_R
    if (dist < min && dist > 1e-4) {
      playerState.x = c.x + (dx / dist) * min
      playerState.z = c.z + (dz / dist) * min
    }
  }
}

export function Player({
  id,
  locked,
  digging,
  spots,
  faceTarget,
  interactables,
  colliders,
  onNearChange,
}: {
  id: CharacterId
  locked: boolean
  digging: boolean
  spots: WorldSpot[]
  faceTarget: WorldSpot | null
  interactables: Interactable[]
  colliders: Collider[]
  onNearChange: (key: string | null) => void
}) {
  useKeyboard()
  const group = useRef<THREE.Group>(null)
  const arrow = useRef<THREE.Group>(null)
  const motion = useRef<Motion>({ speed: 0, dig: 0 })
  const velocity = useRef({ x: 0, z: 0 })
  const near = useRef<string | null>(null)
  const timers = useRef({ dust: 0, sand: 0, step: 0 })
  const lookTarget = useRef(new THREE.Vector3(playerState.x, 1, playerState.z))
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    camera.position.set(playerState.x + CAMERA_OFFSET.x, sandHeight(playerState.x, playerState.z) + CAMERA_OFFSET.y, playerState.z + CAMERA_OFFSET.z)
  }, [camera])

  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05)
    let ix = input.x
    let iy = input.y
    if (keys.has('left')) ix -= 1
    if (keys.has('right')) ix += 1
    if (keys.has('up')) iy += 1
    if (keys.has('down')) iy -= 1
    const len = Math.hypot(ix, iy)
    if (len > 1) {
      ix /= len
      iy /= len
    }
    if (locked) ix = iy = 0

    const v = velocity.current
    const accel = 1 - Math.exp(-(len > 0.05 ? 9 : 12) * dt)
    v.x += (ix * PLAYER_SPEED - v.x) * accel
    v.z += (-iy * PLAYER_SPEED - v.z) * accel

    playerState.x = THREE.MathUtils.clamp(playerState.x + v.x * dt, BOUNDS.minX, BOUNDS.maxX)
    playerState.z = THREE.MathUtils.clamp(playerState.z + v.z * dt, BOUNDS.minZ, BOUNDS.maxZ)
    resolveCollisions(colliders)
    const speed = Math.min(1, Math.hypot(v.x, v.z) / PLAYER_SPEED)
    const groundY = sandHeight(playerState.x, playerState.z)

    const target = faceTarget
    if (target) {
      playerState.yaw = dampAngle(playerState.yaw, Math.atan2(target.x - playerState.x, target.z - playerState.z), 10, dt)
    } else if (speed > 0.05) {
      playerState.yaw = dampAngle(playerState.yaw, Math.atan2(v.x, v.z), 12, dt)
    }

    const m = motion.current
    m.speed = speed
    m.dig = THREE.MathUtils.damp(m.dig, digging ? 1 : 0, 8, dt)

    if (group.current) {
      group.current.position.set(playerState.x, groundY, playerState.z)
      group.current.rotation.y = playerState.yaw
    }

    const tm = timers.current
    tm.dust -= dt
    if (speed > 0.45 && tm.dust <= 0) {
      tm.dust = 0.11
      emitDust(playerState.x - v.x * 0.08, groundY, playerState.z - v.z * 0.08)
    }
    tm.sand -= dt
    if (digging && target && m.dig > 0.6 && tm.sand <= 0) {
      tm.sand = 0.14
      emitSand(target.x, sandHeight(target.x, target.z), target.z, 5)
    }

    let nearestKey: string | null = null
    let nearestGap = Infinity
    for (const it of interactables) {
      const gap = Math.hypot(it.x - playerState.x, it.z - playerState.z) - it.radius
      if (gap < nearestGap) {
        nearestGap = gap
        nearestKey = it.key
      }
    }
    const nextNear = nearestGap <= NEAR_RADIUS ? nearestKey : null
    if (!locked && nextNear !== near.current) {
      near.current = nextNear
      onNearChange(nextNear)
    }

    let nearestSpot: number | null = null
    let spotDist = Infinity
    spots.forEach((s, i) => {
      const d = Math.hypot(s.x - playerState.x, s.z - playerState.z)
      if (d < spotDist) {
        spotDist = d
        nearestSpot = i
      }
    })

    if (arrow.current) {
      const onBeach = playerState.z > HOMESTEAD_START_Z
      const guide = nearestSpot !== null && nextNear === null && !locked && onBeach ? spots[nearestSpot] : null
      arrow.current.visible = !!guide
      if (guide) {
        const a = Math.atan2(guide.x - playerState.x, guide.z - playerState.z)
        arrow.current.position.set(playerState.x + Math.sin(a) * 1.7, groundY + 0.08, playerState.z + Math.cos(a) * 1.7)
        arrow.current.rotation.y = a
      }
    }

    const desired = new THREE.Vector3(playerState.x, groundY, playerState.z).add(CAMERA_OFFSET)
    camera.position.lerp(desired, 1 - Math.exp(-4 * dt))
    lookTarget.current.lerp(new THREE.Vector3(playerState.x, groundY + 0.9, playerState.z - 1.4), 1 - Math.exp(-6 * dt))
    camera.lookAt(lookTarget.current)
  })

  return (
    <>
      <group ref={group}>
        <ZestoModel id={id} motion={motion} />
      </group>
      <group ref={arrow}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.25]}>
          <coneGeometry args={[0.3, 0.6, 3]} />
          <meshBasicMaterial color="#ffe08a" transparent opacity={0.9} toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}
