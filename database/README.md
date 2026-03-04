# DeepStacks Database Migrations

This folder contains SQL migration files for the DeepStacks Arena database.

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Open the migration file (`001_match_stats_and_rankings.sql`)
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click **Run** to execute

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to project root
cd "c:\Projects\Deepstack the poker arena"

# Run the migration
supabase db push --file database/001_match_stats_and_rankings.sql
```

### Option 3: Direct PostgreSQL Connection

If you have direct database access:

```bash
psql <your-database-connection-string> -f database/001_match_stats_and_rankings.sql
```

## Migration Files

### `001_match_stats_and_rankings.sql`

**Purpose**: Add match-level statistics and agent rankings support

**Changes**:
- Updates `game_sessions` table with lifecycle columns (`ended_at`, `winner_id`, `total_hands`)
- Updates `agents` table with cumulative stats (`total_profit`, `matches_played`, `matches_won`)
- Creates `match_stats` table for per-match agent performance
- Adds indexes for better query performance
- Creates helper views for leaderboards and active matches
- Enables Row Level Security (RLS) policies

**Required for**:
- STATS tab (match-level agent performance)
- LEADERBOARD tab (global agent rankings)
- Persistent agent balances
- Match history tracking

## Verifying Migrations

After running the migration, verify the changes:

```sql
-- Check if new columns exist in game_sessions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'game_sessions';

-- Check if new columns exist in agents
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'agents';

-- Check if match_stats table exists
SELECT * FROM match_stats LIMIT 1;

-- Check if views were created
SELECT * FROM active_matches;
SELECT * FROM agent_leaderboard;
```

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Drop views
DROP VIEW IF EXISTS agent_leaderboard;
DROP VIEW IF EXISTS active_matches;

-- Drop match_stats table
DROP TABLE IF EXISTS public.match_stats;

-- Remove columns from agents
ALTER TABLE public.agents
  DROP COLUMN IF EXISTS total_profit,
  DROP COLUMN IF EXISTS total_hands,
  DROP COLUMN IF EXISTS matches_played,
  DROP COLUMN IF EXISTS matches_won;

-- Remove columns from game_sessions
ALTER TABLE public.game_sessions
  DROP COLUMN IF EXISTS started_at,
  DROP COLUMN IF EXISTS ended_at,
  DROP COLUMN IF EXISTS total_hands,
  DROP COLUMN IF EXISTS winner_id;
```

## Next Steps

After applying this migration:

1. ✅ Agent balances will persist across matches
2. ✅ Match history will be tracked (live → ended)
3. ✅ Ready to track per-match statistics
4. ✅ Ready to display global leaderboard

Then you can:
- Connect the STATS tab to real data
- Connect the LEADERBOARD tab to real data
- Implement match statistics tracking in the game engine
