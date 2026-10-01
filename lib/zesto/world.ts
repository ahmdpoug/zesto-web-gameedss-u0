export type WorldSpot = { x: number; z: number }

export const WATER_Y = -0.28
export const SHORE_X = -7.3
export const PLAYER_SPEED = 3.4
export const NEAR_RADIUS = 1.35
export const BOUNDS = { minX: -5, maxX: 9.6, minZ: -30.5, maxZ: 8.5 }
/** Dig spots stay on the open beach; the homestead begins south of this line. */
export const BEACH_MIN_Z = -12.5
export const HOMESTEAD_START_Z = -14

export type Interactable = { key: string; x: number; z: number; radius: number }
export type Collider = { x: number; z: number; r: number }

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function sandHeight(x: number, z: number) {
  const ripple = Math.sin(x * 0.35 + z * 0.12) * 0.08 + Math.cos(z * 0.28 - x * 0.07) * 0.1
  const dunes = smoothstep(9, 20, x) * (2.6 + Math.sin(z * 0.22) * 0.8)
  const bx = x - 11
  const bz = z + 38
  const bluff = Math.exp(-(bx * bx + bz * bz) / 60) * 3.2
  const shore = x < -5 ? (x + 5) * 0.14 : 0
  return ripple + dunes + bluff + shore
}

/** Shared, mutation-only state so the joystick, keyboard and render loop never trigger React renders. */
export const input = { x: 0, y: 0 }
export const keys = new Set<string>()
export const playerState = { x: 0, z: 4, yaw: 0 }

export const INITIAL_SPOTS: WorldSpot[] = [
  { x: -2, z: -1.5 },
  { x: 3.6, z: -5.5 },
  { x: 6.2, z: 2 },
  { x: -3.4, z: -9.5 },
]

export function randomSpot(existing: WorldSpot[], avoid: WorldSpot): WorldSpot {
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = {
      x: BOUNDS.minX + 0.8 + Math.random() * (8.5 - BOUNDS.minX - 1.6),
      z: BEACH_MIN_Z + Math.random() * (BOUNDS.maxZ - 1 - BEACH_MIN_Z),
    }
    const farFromPlayer = Math.hypot(candidate.x - avoid.x, candidate.z - avoid.z) > 4
    const farFromOthers = existing.every((s) => Math.hypot(candidate.x - s.x, candidate.z - s.z) > 3.2)
    if (farFromPlayer && farFromOthers) return candidate
  }
  return { x: (Math.random() - 0.5) * 8, z: -8 + Math.random() * 6 }
}
