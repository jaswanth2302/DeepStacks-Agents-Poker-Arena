-- ============================================================================
-- DeepStacks Database Schema Updates
-- Migration: Match Statistics & Agent Rankings
-- Date: 2026-03-03
-- ============================================================================

-- Purpose: Add match-level statistics tracking and agent cumulative rankings
-- to support the STATS and LEADERBOARD features in the frontend.

-- ============================================================================
-- 1. Update game_sessions table (match lifecycle)
-- ============================================================================

-- Add columns for match metadata and lifecycle tracking
ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS ended_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS total_hands integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES public.agents(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_ended_at ON public.game_sessions(ended_at);

-- ============================================================================
-- 2. Update agents table (cumulative stats & rankings)
-- ============================================================================

-- Add cumulative performance tracking columns
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS total_profit bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_hands integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matches_played integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matches_won integer NOT NULL DEFAULT 0;

-- Create indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_agents_total_profit ON public.agents(total_profit DESC);
CREATE INDEX IF NOT EXISTS idx_agents_elo_rating ON public.agents(elo_rating DESC);

-- ============================================================================
-- 3. Create match_stats table (per-match agent performance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.match_stats (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  match_id uuid NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,

  -- Entry/Exit Data
  starting_stack bigint NOT NULL DEFAULT 10000,
  ending_stack bigint NOT NULL DEFAULT 0,
  profit_loss bigint NOT NULL DEFAULT 0,  -- ending_stack - starting_stack

  -- Performance Metrics
  hands_played integer NOT NULL DEFAULT 0,
  hands_won integer NOT NULL DEFAULT 0,
  vpip_count integer NOT NULL DEFAULT 0,  -- Voluntary Put In Pot actions
  pfr_count integer NOT NULL DEFAULT 0,   -- Pre-Flop Raise actions

  -- Timing
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,

  -- Constraints
  CONSTRAINT match_stats_pkey PRIMARY KEY (id),
  CONSTRAINT match_stats_unique UNIQUE (match_id, agent_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_match_stats_match_id ON public.match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_agent_id ON public.match_stats(agent_id);
CREATE INDEX IF NOT EXISTS idx_match_stats_profit_loss ON public.match_stats(profit_loss DESC);

-- ============================================================================
-- 4. Enable Row Level Security (RLS) for match_stats
-- ============================================================================

-- Enable RLS on match_stats table
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Allow public read access to match_stats" ON public.match_stats;
DROP POLICY IF EXISTS "Allow server to insert match_stats" ON public.match_stats;
DROP POLICY IF EXISTS "Allow server to update match_stats" ON public.match_stats;

-- Policy: Allow public read access (for spectators and agents)
CREATE POLICY "Allow public read access to match_stats"
  ON public.match_stats
  FOR SELECT
  USING (true);

-- Policy: Allow server to insert/update match stats
-- Note: This assumes you're using the service role key on the server
-- If using anon key, you'll need to adjust this policy
CREATE POLICY "Allow server to insert match_stats"
  ON public.match_stats
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow server to update match_stats"
  ON public.match_stats
  FOR UPDATE
  USING (true);

-- ============================================================================
-- 5. Helper Views (Optional - for easier querying)
-- ============================================================================

-- View: Active matches with player count
CREATE OR REPLACE VIEW public.active_matches AS
SELECT
  gs.id,
  gs.status,
  gs.pot_amount,
  gs.board_cards,
  gs.match_type,
  gs.total_hands,
  gs.started_at,
  gs.updated_at,
  array_length(gs.player_ids, 1) as player_count,
  gs.player_ids
FROM public.game_sessions gs
WHERE gs.status IN ('playing', 'waiting_for_action', 'showdown')
ORDER BY gs.updated_at DESC;

-- View: Agent leaderboard (ordered by profit)
CREATE OR REPLACE VIEW public.agent_leaderboard AS
SELECT
  a.id,
  a.name,
  a.avatar_url,
  a.balance,
  a.total_profit,
  a.total_hands,
  a.matches_played,
  a.matches_won,
  a.elo_rating,
  CASE
    WHEN a.total_hands > 0
    THEN ROUND((a.matches_won::numeric / a.matches_played::numeric) * 100, 1)
    ELSE 0
  END as win_rate_percent,
  a.created_at
FROM public.agents a
WHERE a.matches_played > 0
ORDER BY a.total_profit DESC, a.elo_rating DESC;

-- ============================================================================
-- 6. Sample Queries (for testing)
-- ============================================================================

-- Get all ended matches with winner info
-- SELECT gs.*, a.name as winner_name
-- FROM game_sessions gs
-- LEFT JOIN agents a ON gs.winner_id = a.id
-- WHERE gs.status = 'ended'
-- ORDER BY gs.ended_at DESC;

-- Get agent performance in a specific match
-- SELECT ms.*, a.name as agent_name
-- FROM match_stats ms
-- JOIN agents a ON ms.agent_id = a.id
-- WHERE ms.match_id = '<match-id-here>';

-- Get top 10 agents by profit
-- SELECT * FROM agent_leaderboard LIMIT 10;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
