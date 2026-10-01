export type WorldSpot = { x: number; z: number }

export const WATER_Y = -0.28
export const SHORE_X = -7.3
export const PLAYER_SPEED = 4.2
export const SPRINT_MULTIPLIER = 1.65
export const NEAR_RADIUS = 1.35
export const BOUNDS = { minX: -5.2, maxX: 45, minZ: -60, maxZ: 31 }
/** Dig spots stay on the open beach and cove; the homestead begins north of this line. */
export const BEACH_MIN_Z = -12.5
export const HOMESTEAD_START_Z = -14
export const DIG_ZONE = { minX: -4.4, maxX: 8.2, minZ: BEACH_MIN_Z, maxZ: 28.5 }

/** Terrain/heightfield extents shared by the mesh, water depth texture and maps. */
export const TERRAIN = { minX: -40, maxX: 80, minZ: -90, maxZ: 60 }

export type Interactable = { key: string; x: number; z: number; radius: number }
export type Collider = { x: number; z: number; r: number }

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export type RegionId = 'shore' | 'cove' | 'homestead' | 'cliffs' | 'jungle' | 'highlands'

export type Region = {
  id: RegionId
  name: string
  blurb: string
  color: string
  label: WorldSpot
  waypoint: WorldSpot
}

export const REGIONS: Region[] = [
  { id: 'shore', name: 'Sunset Shore', blurb: 'Treasure spots glow in the sand', color: '#f2c46d', label: { x: 2, z: -2 }, waypoint: { x: 1.5, z: 4 } },
  { id: 'cove', name: 'Coral Cove', blurb: 'A wrecked galleon and quiet tide pools', color: '#5fd4c6', label: { x: 2, z: 20 }, waypoint: { x: 2, z: 16 } },
  { id: 'homestead', name: 'Homestead', blurb: 'Raise and upgrade your buildings', color: '#e8a25c', label: { x: 2, z: -23 }, waypoint: { x: 1.9, z: -15.5 } },
  { id: 'cliffs', name: 'Crystal Cliffs', blurb: 'Starfall ore beneath the old lighthouse', color: '#a993ff', label: { x: 3, z: -47 }, waypoint: { x: 3.5, z: -42 } },
  { id: 'jungle', name: 'Whispering Jungle', blurb: 'Ironwood and forgotten ruins', color: '#7cc46a', label: { x: 29, z: 8 }, waypoint: { x: 22, z: 3 } },
  { id: 'highlands', name: 'Granite Highlands', blurb: 'Windswept quarries and standing stones', color: '#c9bfae', label: { x: 30, z: -38 }, waypoint: { x: 26, z: -28 } },
]

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, Region>

export function regionAt(x: number, z: number): RegionId {
  if (x >= 13) return z > -14 ? 'jungle' : 'highlands'
  if (z > 10) return 'cove'
  if (z > -13) return 'shore'
  if (z > -34) return 'homestead'
  return 'cliffs'
}

/** Dirt trails linking every region; used for terrain colour, prop avoidance and the map. */
export const TRAILS: [number, number][][] = [
  [[4, -2], [12, 0], [20, 2], [28, 4]],
  [[28, 4], [30, -6], [30, -16], [29, -26], [30, -38]],
  [[7, -24], [14, -28], [22, -32], [30, -38]],
  [[2, -28], [3, -36], [5, -44], [6, -49]],
  [[3, 6], [1.5, 13], [0, 21]],
]

function segmentDistance(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

export function trailDistance(x: number, z: number) {
  let best = Infinity
  for (const trail of TRAILS) {
    for (let i = 0; i < trail.length - 1; i++) {
      const d = segmentDistance(x, z, trail[i][0], trail[i][1], trail[i + 1][0], trail[i + 1][1])
      if (d < best) best = d
    }
  }
  return best
}

function hill(x: number, z: number, cx: number, cz: number, r: number, h: number) {
  const dx = x - cx
  const dz = z - cz
  return Math.exp(-(dx * dx + dz * dz) / (r * r)) * h
}

export type Biome = { east: number; jungle: number; high: number; cliffs: number; wall: number }

export function biomeAt(x: number, z: number): Biome {
  const east = smoothstep(9, 16, x)
  const high = smoothstep(-12, -22, z) * smoothstep(11, 19, x)
  const cliffs = smoothstep(-33, -42, z) * (1 - smoothstep(11, 17, x)) * smoothstep(-8.5, -4.5, x)
  const ridge = Math.sin(z * 0.31) * 1.5 + Math.sin(x * 0.27) * 1.5
  const wall = Math.max(smoothstep(44 + ridge, 54 + ridge, x), smoothstep(-59 + ridge, -70 + ridge, z))
  return { east, jungle: east * (1 - high), high, cliffs, wall }
}

/** Heightfield for the whole island. Name kept for the many props that sit on it. */
export function sandHeight(x: number, z: number) {
  const ripple = Math.sin(x * 0.35 + z * 0.12) * 0.08 + Math.cos(z * 0.28 - x * 0.07) * 0.1
  const shore = x < -5 ? (x + 5) * 0.14 : 0
  const south = z > 30.5 ? -(z - 30.5) * 0.16 : 0
  const b = biomeAt(x, z)
  const rolling = 0.9 + Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.45 + Math.sin(z * 0.09 + x * 0.05) * 0.3
  const jungle = b.jungle * rolling
  const highNoise = Math.sin(x * 0.3) * Math.sin(z * 0.25) * 0.7 + hill(x, z, 36, -28, 5, 1.6) + hill(x, z, 22, -46, 6, 1.2)
  const high = b.high * (2.2 + highNoise)
  const cliffs = b.cliffs * (1.6 + Math.sin(x * 0.7 + z * 0.4) * 0.18 + hill(x, z, 10, -56, 4, 1.4))
  const wall = b.wall * (9 + Math.sin(x * 0.5) * Math.cos(z * 0.45) * 2.5)
  return ripple + shore + south + jungle + high + cliffs + wall
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

const C = {
  dry: hex('#efc994'),
  warm: hex('#dfae72'),
  wet: hex('#b48a5c'),
  lush: hex('#6aa24a'),
  deep: hex('#3f7d36'),
  meadow: hex('#9cab62'),
  stone: hex('#9a9183'),
  slate: hex('#625c74'),
  amethyst: hex('#7a68a0'),
  rock: hex('#7d7468'),
  snow: hex('#e9e4dc'),
  trail: hex('#c9a273'),
  shallow: hex('#3fd2c7'),
  sea: hex('#126f9e'),
}

/** sRGB terrain colour, shared by the 3D mesh and the 2D maps so they always agree. */
export function terrainColor(x: number, z: number, y: number): [number, number, number] {
  const grain = Math.sin(x * 2.3 + z * 1.7) * Math.cos(z * 2.9 - x * 0.6)
  const b = biomeAt(x, z)
  let c = mix(C.dry, C.warm, 0.35 + grain * 0.25)
  c = mix(c, C.wet, 1 - smoothstep(SHORE_X - 0.5, SHORE_X + 2.6, x))
  c = mix(c, C.wet, smoothstep(29.5, 32, z) * (1 - b.east))
  c = mix(c, C.meadow, smoothstep(-15, -20, z) * (1 - b.cliffs) * 0.35 * (0.7 + grain * 0.3))
  c = mix(c, mix(C.lush, C.deep, 0.5 + grain * 0.4), b.jungle * smoothstep(11, 15, x))
  c = mix(c, mix(C.meadow, C.stone, smoothstep(2.4, 3.6, y) * 0.8 + grain * 0.1), b.high)
  c = mix(c, mix(C.slate, C.amethyst, 0.4 + grain * 0.35), b.cliffs)
  const trail = 1 - smoothstep(0.7, 1.6, trailDistance(x, z))
  c = mix(c, C.trail, trail * (1 - b.wall) * 0.85)
  c = mix(c, mix(C.rock, C.snow, smoothstep(7.5, 10, y)), b.wall)
  return c
}

export function waterColor(depth: number): [number, number, number] {
  return mix(C.shallow, C.sea, smoothstep(0, 4, depth))
}

/** Shared, mutation-only state so the joystick, keyboard and render loop never trigger React renders. */
export const input = { x: 0, y: 0 }
export const keys = new Set<string>()
export const playerState = { x: 0, z: 4, yaw: 0, snap: false }

export function teleport(spot: WorldSpot) {
  playerState.x = spot.x
  playerState.z = spot.z
  playerState.snap = true
}

export const INITIAL_SPOTS: WorldSpot[] = [
  { x: -2, z: -1.5 },
  { x: 3.6, z: -5.5 },
  { x: 6.2, z: 2 },
  { x: -3.4, z: -9.5 },
  { x: 5.4, z: 14 },
  { x: -1.8, z: 18.5 },
]

const SPOT_AVOID: WorldSpot[] = [
  { x: -3, z: 25 },
  { x: -5, z: 20 },
]

export function randomSpot(existing: WorldSpot[], avoid: WorldSpot): WorldSpot {
  for (let attempt = 0; attempt < 60; attempt++) {
    const candidate = {
      x: DIG_ZONE.minX + Math.random() * (DIG_ZONE.maxX - DIG_ZONE.minX),
      z: DIG_ZONE.minZ + Math.random() * (DIG_ZONE.maxZ - DIG_ZONE.minZ),
    }
    const farFromPlayer = Math.hypot(candidate.x - avoid.x, candidate.z - avoid.z) > 4
    const farFromOthers = existing.every((s) => Math.hypot(candidate.x - s.x, candidate.z - s.z) > 3.2)
    const clear = SPOT_AVOID.every((s) => Math.hypot(candidate.x - s.x, candidate.z - s.z) > 3.5)
    if (farFromPlayer && farFromOthers && clear) return candidate
  }
  return { x: (Math.random() - 0.5) * 8, z: -8 + Math.random() * 6 }
}
