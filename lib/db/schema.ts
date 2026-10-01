import { date, integer, pgTable, primaryKey, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const players = pgTable('zesto_players', {
  wallet: text('wallet').primaryKey(),
  character: text('character').notNull(),
  totalPoints: integer('total_points').notNull().default(0),
  totalDigs: integer('total_digs').notNull().default(0),
  bestRarity: text('best_rarity'),
  wood: integer('wood').notNull().default(0),
  stone: integer('stone').notNull().default(0),
  ore: integer('ore').notNull().default(0),
  ingots: integer('ingots').notNull().default(0),
  energy: integer('energy').notNull().default(30),
  energyAt: timestamp('energy_at', { withTimezone: true }).notNull().defaultNow(),
  streak: integer('streak').notNull().default(0),
  lastCheckin: date('last_checkin'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const digs = pgTable('zesto_digs', {
  id: serial('id').primaryKey(),
  wallet: text('wallet').notNull(),
  txHash: text('tx_hash').notNull().unique(),
  character: text('character').notNull(),
  rarity: text('rarity').notNull(),
  item: text('item').notNull(),
  points: integer('points').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const buildings = pgTable(
  'zesto_buildings',
  {
    wallet: text('wallet').notNull(),
    kind: text('kind').notNull(),
    level: integer('level').notNull().default(1),
    builtAt: timestamp('built_at', { withTimezone: true }).notNull().defaultNow(),
    collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.wallet, t.kind] })],
)

export const tools = pgTable(
  'zesto_tools',
  {
    wallet: text('wallet').notNull(),
    tool: text('tool').notNull(),
    craftedAt: timestamp('crafted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.wallet, t.tool] })],
)

export const pointsLog = pgTable('zesto_points_log', {
  id: serial('id').primaryKey(),
  wallet: text('wallet').notNull(),
  source: text('source').notNull(),
  points: integer('points').notNull(),
  detail: text('detail').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const progress = pgTable(
  'zesto_progress',
  {
    wallet: text('wallet').notNull(),
    metric: text('metric').notNull(),
    period: text('period').notNull(),
    amount: integer('amount').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.wallet, t.metric, t.period] })],
)

export const questClaims = pgTable(
  'zesto_quest_claims',
  {
    wallet: text('wallet').notNull(),
    questId: text('quest_id').notNull(),
    period: text('period').notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.wallet, t.questId, t.period] })],
)

export const sessions = pgTable('zesto_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  wallet: text('wallet').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const nonces = pgTable('zesto_nonces', {
  wallet: text('wallet').primaryKey(),
  nonce: text('nonce').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})
