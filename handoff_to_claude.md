# DeepStacks Poker Arena - Project Status & Handoff

## Current Architecture & State
The backend infrastructure for the Arena is completely functional and verified. This is a Server-Authoritative No-Limit Hold'em platform for AI agents explicitly using Supabase.

1. **Database Schema (Supabase)**:
   - `agents`: Stores registered agents (`id`, `api_token`, `balance`).
   - `game_sessions`: The active table state (`pot_amount`, `board_cards`, `current_turn_agent_id`, `status: 'waiting_for_action' | 'playing'`).
   - `game_logs`: An append-only log of every action, including the dealer giving out secret hole cards.

2. **Supabase Edge Functions**:
   - `register-agent`: POST endpoint for agents to get an `api_token` and `id`.
   - `submit-action`: POST endpoint requiring Bearer Token authentication to submit (fold/call/raise/check).

3. **Realtime WebSockets (The Agent Contract)**:
   - We finalized the exact Agent API contract in `src/components/SkillPage.jsx` (which renders the `skill.md` document).
   - Agents listen to `game_sessions` for their turn.
   - Agents listen to `game_logs` (specifically `action === 'deal'`) to secretly receive their dealt hole cards over the network.

4. **Game Engine (`server/engine.js`)**:
   - Runs in a continuous loop via Node.js.
   - Deals cards, posts blinds, manages betting rounds, tracks timeouts (15s per agent), and advances the state.

5. **Testing Agent (`test-agent.js`)**:
   - A standalone Node script that successfully fully interacts with the environment. It registers, connects to WS, parses its hole cards, uses a heuristic to evaluate hand strength against the board, and submits an action via REST.

## Core Tasks Remaining (For Claude)

**1. Frontend Realtime Integration (Priority)**
- The React frontend (specifically `Lobby.jsx` and `PokerTable.jsx`) currently uses dummy data or static polling.
- **Task**: Hook up the frontend to the Supabase Realtime channels just like the agents do. 
- Watch `game_sessions` to animate the Pot size, Board Cards, and indicate whose turn it is. 
- Watch `game_logs` to show a feed of agent actions ("AlphaBot raises $200", "BetaBot folds").

**2. Robust Engine Edge Cases**
- The barebones poker engine in `engine.js` works for basic happy-paths, but needs hardening for edge cases (e.g., Side Pots when agents go All-In with different stack sizes).

**3. Deployment & Sandbox Strategy**
- Right now, the Engine and Frontend aren't deployed. Need to decide where the Node game engine will permanently run (e.g., a VPS, Render, or Supabase Edge Functions with a cron loop, though WebSockets make long-running edge functions tricky).

## Instructions for Claude
- Start by reading `src/components/SkillPage.jsx` to understand the exact agent integration contract.
- Read `server/engine.js` so you understand how the backend state is driven.
- Look at `test-agent.js` as the reference implementation of a player.
- Your immediate job is to connect the React frontend to these data pipes so human users can spectate the AI games live!
