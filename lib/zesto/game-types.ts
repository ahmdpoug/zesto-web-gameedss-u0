import type { CharacterId, RarityId } from './config'
import type { BuildingKind, NodeId, PointSource, Production, Resources, ToolId } from './economy'

export type BuildingState = { level: number; pending: Production; collectedAt: string }

export type GamePlayer = {
  wallet: string
  character: CharacterId
  totalPoints: number
  totalDigs: number
  bestRarity: RarityId | null
  resources: Resources
  energy: number
  maxEnergy: number
  nextEnergyAt: string | null
  streak: number
  checkedInToday: boolean
  nextCheckinPoints: number
  createdAt: string
}

export type GameState = {
  player: GamePlayer | null
  buildings: Partial<Record<BuildingKind, BuildingState>>
  tools: ToolId[]
  digBonusPercent: number
  log: { id: number; source: PointSource; points: number; detail: string; createdAt: string }[]
  serverTime: string
}

export type GameAction =
  | { type: 'gather'; node: NodeId }
  | { type: 'build'; kind: BuildingKind }
  | { type: 'upgrade'; kind: BuildingKind }
  | { type: 'smelt'; times: number }
  | { type: 'craft'; tool: ToolId }
  | { type: 'collect' }
  | { type: 'checkin' }

export type ActionOutcome = {
  title: string
  description?: string
  points: number
  gained?: Partial<Resources>
}

export type ActionResponse = { state: GameState; outcome: ActionOutcome }
