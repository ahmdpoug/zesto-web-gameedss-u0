export const ZESTO_ADDRESS = '0xbD9b14e487ba56b896D2589C492462b10d456077' as const
export const ZESTO_DECIMALS = 18
export const ZESTO_TOTAL_SUPPLY = 1_000_000_000
export const POINTS_POOL_PERCENT = 10
export const POINTS_POOL_TOKENS = (ZESTO_TOTAL_SUPPLY * POINTS_POOL_PERCENT) / 100
export const DIG_COST = 100
export const DIG_COST_WEI = BigInt(`${DIG_COST}${'0'.repeat(ZESTO_DECIMALS)}`)

export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_ZESTO_TREASURY ||
  '0x000000000000000000000000000000000000dEaD') as `0x${string}`

export const BUY_URL = `https://testnet.vibevibe.fun/t/${ZESTO_ADDRESS}`
export const EXPLORER_URL = 'https://explorer.testnet.chain.robinhood.com'

export type RarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type Rarity = {
  id: RarityId
  label: string
  item: string
  points: number
  weight: number
  color: string
  image: string
}

export const RARITIES: Rarity[] = [
  { id: 'common', label: 'Common', item: 'Spiral Seashell', points: 10, weight: 58, color: '#d9c7a7', image: '/items/common.png' },
  { id: 'uncommon', label: 'Uncommon', item: 'Tidal Sea Glass', points: 30, weight: 26, color: '#3cc6b8', image: '/items/uncommon.png' },
  { id: 'rare', label: 'Rare', item: 'Moonlit Pearl', points: 80, weight: 11, color: '#4f8cff', image: '/items/rare.png' },
  { id: 'epic', label: 'Epic', item: "Captain's Compass", points: 250, weight: 4, color: '#a46bff', image: '/items/epic.png' },
  { id: 'legendary', label: 'Legendary', item: 'Zesto Gold Chest', points: 1000, weight: 1, color: '#ffb321', image: '/items/legendary.png' },
]

export const RARITY_BY_ID = Object.fromEntries(RARITIES.map((r) => [r.id, r])) as Record<RarityId, Rarity>

export type CharacterId = 'blu' | 'sage' | 'frost' | 'shade' | 'blaze' | 'sprout' | 'royal' | 'rosie'

export type Character = {
  id: CharacterId
  name: string
  title: string
  color: string
  image: string
  perkRarity: RarityId | 'all'
  perkPercent: number
  perkLabel: string
}

export const CHARACTERS: Character[] = [
  { id: 'blu', name: 'Blu', title: 'The Tide Rookie', color: '#2f7bff', image: '/characters/blu.png', perkRarity: 'common', perkPercent: 25, perkLabel: '+25% on Common finds' },
  { id: 'sage', name: 'Sage', title: 'The Shore Scholar', color: '#f2c81b', image: '/characters/sage.png', perkRarity: 'rare', perkPercent: 15, perkLabel: '+15% on Rare finds' },
  { id: 'frost', name: 'Frost', title: 'The Cold Current', color: '#9fd3ff', image: '/characters/frost.png', perkRarity: 'uncommon', perkPercent: 20, perkLabel: '+20% on Uncommon finds' },
  { id: 'shade', name: 'Shade', title: 'The Night Digger', color: '#b6ff2e', image: '/characters/shade.png', perkRarity: 'epic', perkPercent: 12, perkLabel: '+12% on Epic finds' },
  { id: 'blaze', name: 'Blaze', title: 'The Sunset DJ', color: '#ff8a1f', image: '/characters/blaze.png', perkRarity: 'all', perkPercent: 6, perkLabel: '+6% on every find' },
  { id: 'sprout', name: 'Sprout', title: 'The Lucky Leaf', color: '#4cd437', image: '/characters/sprout.png', perkRarity: 'legendary', perkPercent: 10, perkLabel: '+10% on Legendary finds' },
  { id: 'royal', name: 'Royal', title: 'The Disco Monarch', color: '#a45bff', image: '/characters/royal.png', perkRarity: 'epic', perkPercent: 15, perkLabel: '+15% on Epic finds' },
  { id: 'rosie', name: 'Rosie', title: 'The Heart Queen', color: '#ff5fb1', image: '/characters/rosie.png', perkRarity: 'uncommon', perkPercent: 25, perkLabel: '+25% on Uncommon finds' },
]

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<CharacterId, Character>

export function isCharacterId(value: unknown): value is CharacterId {
  return typeof value === 'string' && value in CHARACTER_BY_ID
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2400, 3600, 5200, 7500, 10500, 14500, 20000, 27500, 37500]
const LEVEL_TITLES = [
  'Sand Sifter', 'Shell Seeker', 'Tide Walker', 'Dune Runner', 'Reef Ranger',
  'Pearl Diver', 'Wave Rider', 'Treasure Hunter', 'Lighthouse Keeper', 'Deep Explorer',
  'Sea Captain', 'Storm Chaser', 'Coral Admiral', 'Ocean Sovereign', 'Zesto Legend',
]

export const MAX_LEVEL = LEVEL_THRESHOLDS.length

export function getLevel(points: number) {
  let level = 1
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1
  }
  const current = LEVEL_THRESHOLDS[level - 1]
  const next = LEVEL_THRESHOLDS[level] ?? null
  const progress = next === null ? 1 : (points - current) / (next - current)
  return {
    level,
    title: LEVEL_TITLES[level - 1],
    current,
    next,
    progress: Math.max(0, Math.min(1, progress)),
    bonusPercent: levelBonusPercent(level),
  }
}

export function levelBonusPercent(level: number) {
  return Math.min(30, (level - 1) * 2)
}

export function getLevelTable() {
  return LEVEL_THRESHOLDS.map((points, i) => ({
    level: i + 1,
    points,
    title: LEVEL_TITLES[i],
    bonusPercent: levelBonusPercent(i + 1),
  }))
}

export function calculatePoints(rarity: Rarity, character: Character, level: number, homesteadPercent = 0) {
  const perk = character.perkRarity === 'all' || character.perkRarity === rarity.id ? character.perkPercent : 0
  const multiplier = 1 + (perk + levelBonusPercent(level) + homesteadPercent) / 100
  return {
    points: Math.round(rarity.points * multiplier),
    perkPercent: perk,
    levelPercent: levelBonusPercent(level),
    homesteadPercent,
  }
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
