import type { RarityId } from './config'

export type ResourceId = 'wood' | 'stone' | 'ore' | 'ingots'
export type Cost = Partial<Record<ResourceId, number>>
export type Resources = Record<ResourceId, number>

export const RESOURCE_IDS: ResourceId[] = ['wood', 'stone', 'ore', 'ingots']

export const RESOURCE_META: Record<ResourceId, { label: string; color: string }> = {
  wood: { label: 'Wood', color: '#d79b5b' },
  stone: { label: 'Stone', color: '#b9b2a6' },
  ore: { label: 'Ore', color: '#6fb7ff' },
  ingots: { label: 'Ingots', color: '#ffc94d' },
}

export const SIGNUP_BONUS = 50
export const STARTER_RESOURCES: Resources = { wood: 10, stone: 6, ore: 0, ingots: 0 }

export const ENERGY_MAX = 30
export const ENERGY_REGEN_MS = 2 * 60 * 1000
export const GATHER_ENERGY = 1
export const GATHER_POINTS = 3
export const PRODUCTION_CAP_HOURS = 12

export const CHECKIN_BASE = 20
export const CHECKIN_STEP = 10
export const CHECKIN_MAX_STREAK = 7
export const CHECKIN_ENERGY = 10

export function checkinPoints(streak: number) {
  return CHECKIN_BASE + CHECKIN_STEP * (Math.min(streak, CHECKIN_MAX_STREAK) - 1)
}

export const SMELT_COST: Cost = { ore: 3, wood: 1 }
export const SMELT_POINTS_PER_INGOT = 5

export type NodeId =
  | 'palm-grove'
  | 'driftwood'
  | 'rock-pile'
  | 'ore-vein'
  | 'shipwreck'
  | 'ironwood'
  | 'highland-quarry'
  | 'starfall-geode'

export type ResourceNode = {
  id: NodeId
  name: string
  resource: 'wood' | 'stone' | 'ore'
  x: number
  z: number
  radius: number
  yield: [number, number]
}

export const RESOURCE_NODES: ResourceNode[] = [
  { id: 'palm-grove', name: 'Palm Grove', resource: 'wood', x: 8.6, z: -21.8, radius: 1.1, yield: [2, 4] },
  { id: 'driftwood', name: 'Driftwood Pile', resource: 'wood', x: -4.2, z: -15.6, radius: 0.9, yield: [1, 3] },
  { id: 'rock-pile', name: 'Granite Outcrop', resource: 'stone', x: -4, z: -29, radius: 1.1, yield: [2, 4] },
  { id: 'ore-vein', name: 'Azure Ore Vein', resource: 'ore', x: 8.8, z: -28.6, radius: 1.1, yield: [1, 3] },
  { id: 'shipwreck', name: 'Galleon Wreck', resource: 'wood', x: -3, z: 25, radius: 1.6, yield: [2, 4] },
  { id: 'ironwood', name: 'Ironwood Thicket', resource: 'wood', x: 24, z: 11, radius: 1.2, yield: [3, 5] },
  { id: 'highland-quarry', name: 'Highland Quarry', resource: 'stone', x: 31.5, z: -41, radius: 1.5, yield: [3, 5] },
  { id: 'starfall-geode', name: 'Starfall Geode', resource: 'ore', x: 6.5, z: -50.5, radius: 1.3, yield: [2, 4] },
]

export const NODE_BY_ID = Object.fromEntries(RESOURCE_NODES.map((n) => [n.id, n])) as Record<NodeId, ResourceNode>

export type BuildingKind = 'forge' | 'anvil' | 'lumber_mill' | 'quarry' | 'beacon' | 'vault'

export type Production = Partial<Record<ResourceId | 'points', number>>

export type BuildingDef = {
  id: BuildingKind
  name: string
  tagline: string
  description: string
  x: number
  z: number
  radius: number
  requires?: BuildingKind
  baseCost: Cost
  basePoints: number
  /** Effect text per level (index 0 = level 1). */
  effects: [string, string, string]
  /** Hourly output per level. */
  production?: Production
}

export const MAX_BUILDING_LEVEL = 3
const LEVEL_COST_SCALE = [1, 2.5, 6]
const LEVEL_POINT_SCALE = [1, 2, 4]

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'forge',
    name: 'Forge',
    tagline: 'Smelt ore into ingots',
    description: 'A stone furnace that turns raw ore into refined ingots — the backbone of every advanced build.',
    x: -2.2,
    z: -19,
    radius: 1.15,
    baseCost: { wood: 15, stone: 10 },
    basePoints: 150,
    effects: ['1 ingot per smelt', '2 ingots per smelt', '3 ingots per smelt'],
  },
  {
    id: 'anvil',
    name: 'Anvil',
    tagline: 'Craft legendary tools',
    description: 'Hammer ingots into tools that boost your digs, gathering and stamina.',
    x: 1.4,
    z: -19.4,
    radius: 0.75,
    requires: 'forge',
    baseCost: { stone: 16, ingots: 3 },
    basePoints: 200,
    effects: ['Unlocks Tier I tools', 'Unlocks Tier II tools', 'Unlocks Tier III tools'],
  },
  {
    id: 'lumber_mill',
    name: 'Lumber Mill',
    tagline: 'Passive wood income',
    description: 'A sawmill that keeps cutting planks while you are away.',
    x: 5.6,
    z: -18.8,
    radius: 1.3,
    baseCost: { wood: 20, stone: 6 },
    basePoints: 100,
    effects: ['+6 wood / hour', '+12 wood / hour', '+18 wood / hour'],
    production: { wood: 6 },
  },
  {
    id: 'quarry',
    name: 'Quarry',
    tagline: 'Passive stone & ore',
    description: 'Cranes and chisels steadily pull stone and ore from the bluff.',
    x: -2.4,
    z: -25,
    radius: 1.3,
    baseCost: { wood: 24, stone: 10 },
    basePoints: 120,
    effects: ['+5 stone, +1 ore / hour', '+10 stone, +2 ore / hour', '+15 stone, +3 ore / hour'],
    production: { stone: 5, ore: 1 },
  },
  {
    id: 'beacon',
    name: 'Tide Beacon',
    tagline: 'Boost every dig',
    description: 'A blazing signal fire that guides treasure toward your shovel.',
    x: 5.8,
    z: -25.2,
    radius: 0.95,
    requires: 'forge',
    baseCost: { stone: 30, wood: 10, ingots: 5 },
    basePoints: 300,
    effects: ['+5% dig points', '+10% dig points', '+15% dig points'],
  },
  {
    id: 'vault',
    name: 'Treasure Vault',
    tagline: 'Passive points',
    description: 'A gilded vault that compounds your fortune into points every hour.',
    x: 1.8,
    z: -26.4,
    radius: 1.2,
    requires: 'anvil',
    baseCost: { stone: 40, ingots: 12 },
    basePoints: 500,
    effects: ['+12 points / hour', '+24 points / hour', '+36 points / hour'],
    production: { points: 12 },
  },
]

export const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingKind, BuildingDef>

export function isBuildingKind(value: unknown): value is BuildingKind {
  return typeof value === 'string' && value in BUILDING_BY_ID
}

/** Cost and points to reach `level` (1 = initial build). */
export function buildingCost(kind: BuildingKind, level: number): Cost {
  const def = BUILDING_BY_ID[kind]
  const scale = LEVEL_COST_SCALE[level - 1] ?? LEVEL_COST_SCALE.at(-1)!
  const cost: Cost = {}
  for (const [key, value] of Object.entries(def.baseCost) as [ResourceId, number][]) {
    cost[key] = Math.round(value * scale)
  }
  if (level >= 2 && !cost.ingots) cost.ingots = level === 2 ? 4 : 12
  return cost
}

export function buildingPoints(kind: BuildingKind, level: number) {
  return BUILDING_BY_ID[kind].basePoints * (LEVEL_POINT_SCALE[level - 1] ?? 1)
}

export function productionPerHour(kind: BuildingKind, level: number): Production {
  const base = BUILDING_BY_ID[kind].production
  if (!base || level < 1) return {}
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v * level])) as Production
}

export type ToolId = 'iron_axe' | 'iron_pick' | 'steel_shovel' | 'tide_lantern' | 'gold_shovel'

export type ToolDef = {
  id: ToolId
  name: string
  tier: 1 | 2 | 3
  cost: Cost
  points: number
  effect: string
}

export const TOOLS: ToolDef[] = [
  { id: 'iron_axe', name: 'Iron Axe', tier: 1, cost: { ingots: 3, wood: 4 }, points: 120, effect: '+1 wood every gather' },
  { id: 'iron_pick', name: 'Iron Pickaxe', tier: 1, cost: { ingots: 4, wood: 6 }, points: 120, effect: '+1 stone & ore every gather' },
  { id: 'tide_lantern', name: 'Tide Lantern', tier: 2, cost: { ingots: 8, stone: 20 }, points: 250, effect: '+10 max energy' },
  { id: 'steel_shovel', name: 'Steel Shovel', tier: 2, cost: { ingots: 10, wood: 12 }, points: 300, effect: '+5% dig points' },
  { id: 'gold_shovel', name: 'Zesto Gold Shovel', tier: 3, cost: { ingots: 24, stone: 40, wood: 30 }, points: 800, effect: '+10% dig points' },
]

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, ToolDef>

export function isToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && value in TOOL_BY_ID
}

export const DIG_MATERIALS: Record<RarityId, Cost> = {
  common: { wood: 2 },
  uncommon: { stone: 3 },
  rare: { ore: 3 },
  epic: { ingots: 2, ore: 2 },
  legendary: { ingots: 6, ore: 6 },
}

export function maxEnergy(tools: ToolId[]) {
  return ENERGY_MAX + (tools.includes('tide_lantern') ? 10 : 0)
}

export function digBonusPercent(beaconLevel: number, tools: ToolId[]) {
  return beaconLevel * 5 + (tools.includes('steel_shovel') ? 5 : 0) + (tools.includes('gold_shovel') ? 10 : 0)
}

export function canAfford(resources: Resources, cost: Cost) {
  return (Object.entries(cost) as [ResourceId, number][]).every(([k, v]) => resources[k] >= v)
}

export type PointSource = 'signup' | 'dig' | 'gather' | 'build' | 'upgrade' | 'smelt' | 'craft' | 'collect' | 'checkin' | 'quest'

export const POINT_SOURCES: { source: PointSource; label: string; value: string }[] = [
  { source: 'signup', label: 'Create your account', value: `+${SIGNUP_BONUS}` },
  { source: 'checkin', label: 'Daily check-in (7-day streak)', value: `+${CHECKIN_BASE} → +${checkinPoints(CHECKIN_MAX_STREAK)}` },
  { source: 'gather', label: 'Gather wood, stone or ore', value: `+${GATHER_POINTS} each` },
  { source: 'quest', label: 'Complete quests & achievements', value: '+15 → +1,500' },
  { source: 'smelt', label: 'Smelt ingots at the Forge', value: `+${SMELT_POINTS_PER_INGOT} / ingot` },
  { source: 'build', label: 'Construct a building', value: '+100 → +500' },
  { source: 'upgrade', label: 'Upgrade a building', value: '×2 → ×4' },
  { source: 'craft', label: 'Craft a tool at the Anvil', value: '+120 → +800' },
  { source: 'collect', label: 'Collect from the Vault', value: '+12 / hr per level' },
  { source: 'dig', label: 'Dig treasure (100 $ZESTO)', value: '+10 → +1,000' },
]
