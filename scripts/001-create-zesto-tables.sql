CREATE TABLE IF NOT EXISTS zesto_players (
  wallet TEXT PRIMARY KEY,
  character TEXT NOT NULL DEFAULT 'blu',
  total_points INTEGER NOT NULL DEFAULT 0,
  total_digs INTEGER NOT NULL DEFAULT 0,
  best_rarity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zesto_players_points_idx ON zesto_players (total_points DESC);

CREATE TABLE IF NOT EXISTS zesto_digs (
  id SERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  character TEXT NOT NULL,
  rarity TEXT NOT NULL,
  item TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zesto_digs_wallet_idx ON zesto_digs (wallet, created_at DESC);
