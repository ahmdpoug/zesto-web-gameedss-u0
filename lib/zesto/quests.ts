import type { Cost } from './economy'

export type Metric = 'gather' | 'gather_wood' | 'gather_stone' | 'gather_ore' | 'smelt' | 'collect' | 'checkin' | 'dig' | 'build' | 'craft'
export type DerivedStat = 'buildings' | 'building_levels' | 'tools' | 'streak' | 'digs' | 'legendary' | 'points'
export type QuestScope = 'daily' | 'weekly' | 'achievement'

export type QuestReward = { points: number; resources?: Cost }

export type QuestDef = {
  id: string
  scope: QuestScope
  title: string
  description: string
  stat: Metric | DerivedStat
  goal: number
  reward: QuestReward
}

export type QuestState = Omit<QuestDef, 'stat'> & { period: string; progress: number; claimed: boolean }

const daily = (id: string, title: string, description: string, stat: Metric, goal: number, reward: QuestReward): QuestDef => ({
  id: `d:${id}`,
  scope: 'daily',
  title,
  description,
  stat,
  goal,
  reward,
})

const weekly = (id: string, title: string, description: string, stat: Metric, goal: number, reward: QuestReward): QuestDef => ({
  id: `w:${id}`,
  scope: 'weekly',
  title,
  description,
  stat,
  goal,
  reward,
})

const achievement = (id: string, title: string, description: string, stat: Metric | DerivedStat, goal: number, points: number): QuestDef => ({
  id: `a:${id}`,
  scope: 'achievement',
  title,
  description,
  stat,
  goal,
  reward: { points },
})

const DAILY_FIXED = daily('checkin', 'Morning Roll Call', 'Check in at the Rewards board', 'checkin', 1, { points: 15, resources: { wood: 3 } })

const DAILY_POOL: QuestDef[] = [
  daily('gather-15', 'Busy Hands', 'Gather 15 materials of any kind', 'gather', 15, { points: 40 }),
  daily('gather-30', 'Beachcomber', 'Gather 30 materials of any kind', 'gather', 30, { points: 70, resources: { ingots: 1 } }),
  daily('wood-12', 'Timber!', 'Chop 12 wood', 'gather_wood', 12, { points: 35, resources: { stone: 4 } }),
  daily('stone-10', 'Rock Steady', 'Mine 10 stone', 'gather_stone', 10, { points: 35, resources: { wood: 4 } }),
  daily('ore-6', 'Blue Vein', 'Mine 6 ore', 'gather_ore', 6, { points: 40, resources: { wood: 3, stone: 3 } }),
  daily('smelt-4', 'Hot Metal', 'Smelt 4 ingots at the Forge', 'smelt', 4, { points: 50, resources: { ore: 3 } }),
  daily('collect-2', 'Payday', 'Collect homestead production twice', 'collect', 2, { points: 40 }),
  daily('build-1', 'Hammer Time', 'Build or upgrade any building', 'build', 1, { points: 60 }),
  daily('dig-1', 'X Marks the Spot', 'Dig up a treasure', 'dig', 1, { points: 80, resources: { ingots: 2 } }),
]

const WEEKLY_POOL: QuestDef[] = [
  weekly('gather-200', 'Haul of the Week', 'Gather 200 materials', 'gather', 200, { points: 400, resources: { ingots: 5 } }),
  weekly('smelt-30', 'Foundry Shift', 'Smelt 30 ingots', 'smelt', 30, { points: 350, resources: { ore: 10 } }),
  weekly('checkin-5', 'Regular', 'Check in on 5 days', 'checkin', 5, { points: 300, resources: { ingots: 4 } }),
  weekly('dig-5', 'Treasure Week', 'Dig up 5 treasures', 'dig', 5, { points: 500, resources: { ingots: 8 } }),
  weekly('collect-10', 'Landlord', 'Collect production 10 times', 'collect', 10, { points: 300, resources: { wood: 30, stone: 30 } }),
  weekly('build-3', 'Expansion', 'Build or upgrade 3 times', 'build', 3, { points: 400, resources: { ingots: 6 } }),
]

export const ACHIEVEMENTS: QuestDef[] = [
  achievement('first-haul', 'First Haul', 'Gather your first materials', 'gather', 1, 25),
  achievement('homesteader', 'Homesteader', 'Own 3 buildings', 'buildings', 3, 200),
  achievement('lumberjack', 'Lumberjack', 'Chop 250 wood in total', 'gather_wood', 250, 300),
  achievement('stonecutter', 'Stonecutter', 'Mine 250 stone in total', 'gather_stone', 250, 300),
  achievement('prospector', 'Prospector', 'Mine 100 ore in total', 'gather_ore', 100, 300),
  achievement('smelter', 'Master Smelter', 'Smelt 100 ingots in total', 'smelt', 100, 400),
  achievement('devoted', 'Devoted', 'Reach a 7-day check-in streak', 'streak', 7, 500),
  achievement('treasure-hunter', 'Treasure Hunter', 'Dig up 10 treasures', 'digs', 10, 500),
  achievement('architect', 'Architect', 'Construct all 6 buildings', 'buildings', 6, 600),
  achievement('toolsmith', 'Toolsmith', 'Craft all 5 tools', 'tools', 5, 800),
  achievement('legend', 'Living Legend', 'Dig up a Legendary treasure', 'legendary', 1, 1000),
  achievement('master-builder', 'Master Builder', 'Upgrade every building to level 3', 'building_levels', 18, 1500),
  achievement('tycoon', 'Shore Tycoon', 'Earn 25,000 points', 'points', 25_000, 1000),
]

export function dayKey(now: Date) {
  return now.toISOString().slice(0, 10)
}

export function weekStart(now: Date) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const offset = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - offset)
  return d
}

export function weekKey(now: Date) {
  return `w${dayKey(weekStart(now))}`
}

export const ALL_TIME = 'all'

export function nextDailyReset(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
}

export function nextWeeklyReset(now: Date) {
  const start = weekStart(now)
  start.setUTCDate(start.getUTCDate() + 7)
  return start.toISOString()
}

function seededPick<T>(pool: T[], count: number, seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const items = [...pool]
  for (let i = items.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    const j = h % (i + 1)
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items.slice(0, count)
}

export function activeQuests(now: Date) {
  const day = dayKey(now)
  const week = weekKey(now)
  return {
    daily: { period: day, quests: [DAILY_FIXED, ...seededPick(DAILY_POOL, 3, day)] },
    weekly: { period: week, quests: seededPick(WEEKLY_POOL, 3, week) },
    achievements: { period: ALL_TIME, quests: ACHIEVEMENTS },
  }
}
