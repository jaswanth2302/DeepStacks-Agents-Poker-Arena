import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { convertCard, getAgentAvatar } from '../lib/poker';

const DEFAULT_PLAYER_STATE = {
  lastAction: null,
  thoughtProcess: null,
  confidence: null,
  currentBet: 0,
  status: 'active',
};

/**
 * Seeds per-player state from the most recent game_logs for a session.
 * Returns a map: { [agentId]: { lastAction, thoughtProcess, confidence, currentBet, status } }
 */
function buildPlayerStatesFromLogs(logs) {
  const states = {};
  // logs are ordered newest-first; iterate so the latest entry per agent wins
  for (const log of logs) {
    if (log.action === 'deal') continue; // secret — not for spectators
    if (!states[log.agent_id]) {
      states[log.agent_id] = {
        lastAction: log.action,
        thoughtProcess: log.thought_process,
        confidence: log.confidence_score,
        currentBet: log.amount || 0,
        status: log.action === 'fold' ? 'folded' : 'active',
      };
    }
  }
  return states;
}

/**
 * useGameLoop(sessionId?)
 *
 * When sessionId is provided, pins to that specific table.
 * When null/undefined, auto-discovers the most recent active session.
 */
/** Fetches deal logs for a session and returns { [agentId]: [card1, card2] } in display format */
async function loadHoleCards(sid) {
  const { data } = await supabase
    .from('game_logs')
    .select('agent_id, thought_process')
    .eq('game_id', sid)
    .eq('action', 'deal');

  const map = {};
  for (const log of data || []) {
    try {
      const raw = JSON.parse(log.thought_process); // e.g. ["Ac","Kd"]
      map[log.agent_id] = raw.map(convertCard).filter(Boolean);
    } catch {}
  }
  return map;
}

export function useGameLoop(sessionId = null) {
  const [session, setSession] = useState(null);
  const [agents, setAgents] = useState([]);
  const [playerStates, setPlayerStates] = useState({});
  const [holeCardsMap, setHoleCardsMap] = useState({}); // revealed at showdown
  const [eventLog, setEventLog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Keep a stable ref to agents so Realtime callbacks can enrich log entries
  // without needing agents in their dependency arrays.
  const agentsRef = useRef([]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);

  // Track the current session ID so we can detect when the engine starts a new hand
  const sessionIdRef = useRef(null);

  useEffect(() => {
    let channel;
    let pollInterval;

    // Re-fetch and seed logs whenever the active session changes
    async function seedLogsForSession(sid) {
      if (!sid) return;
      const { data: logData } = await supabase
        .from('game_logs')
        .select('*, agents(name)')
        .eq('game_id', sid)
        .order('created_at', { ascending: false })
        .limit(30);

      if (logData && logData.length > 0) {
        setPlayerStates(buildPlayerStatesFromLogs(logData));
        const displayLogs = logData.filter(l => l.action !== 'deal').reverse();
        setEventLog(displayLogs);
      } else {
        setPlayerStates({});
        setEventLog([]);
      }
    }

    async function init() {
      let sessionData;

      if (sessionId) {
        // Pinned to a specific table
        const { data, error } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();

        if (error) {
          console.error('[useGameLoop] session fetch error:', error);
          setLoading(false);
          return;
        }
        sessionData = data;
      } else {
        // Auto-discover most recent active session (updated in last 2 min)
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('game_sessions')
          .select('*')
          .in('status', ['playing', 'waiting_for_action', 'showdown'])
          .gt('updated_at', twoMinAgo)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[useGameLoop] session fetch error:', error);
          setLoading(false);
          return;
        }
        sessionData = data;
      }

      setSession(sessionData);
      sessionIdRef.current = sessionData?.id || null;

      // Fetch agents from session's player_ids only
      let agentData = [];
      const playerIds = sessionData?.player_ids;
      if (playerIds && playerIds.length > 0) {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .in('id', playerIds);

        if (error) {
          console.error('[useGameLoop] agents fetch error:', error);
        } else {
          // Preserve seat order from player_ids array
          agentData = playerIds
            .map(pid => (data || []).find(a => a.id === pid))
            .filter(Boolean);
        }
      } else {
        // No player_ids — don't load random agents
        agentData = [];
      }

      setAgents(agentData);

      // Seed initial player states and event log from recent logs
      if (sessionData) {
        await seedLogsForSession(sessionData.id);
        // If we joined mid-showdown, reveal hole cards immediately
        if (sessionData.status === 'showdown') {
          const cards = await loadHoleCards(sessionData.id);
          setHoleCardsMap(cards);
        }
      }

      setLoading(false);

      // Subscribe to live updates
      channel = supabase
        .channel('spectator_feed')
        // ── New session created (engine started a new hand) ──────────────────
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'game_sessions' },
          (payload) => {
            // If we're pinned to a specific session, ignore new sessions
            if (sessionId) return;

            const newSess = payload.new;
            if (!['playing', 'waiting_for_action', 'showdown'].includes(newSess.status)) return;
            console.log('[useGameLoop] New session inserted:', newSess.id);
            sessionIdRef.current = newSess.id;
            setSession(newSess);
            setPlayerStates({});
            setEventLog([]);

            // Refresh agents for the new session
            const newPlayerIds = newSess.player_ids;
            if (newPlayerIds && newPlayerIds.length > 0) {
              supabase
                .from('agents')
                .select('*')
                .in('id', newPlayerIds)
                .then(({ data }) => {
                  if (data) {
                    const ordered = newPlayerIds
                      .map(pid => data.find(a => a.id === pid))
                      .filter(Boolean);
                    setAgents(ordered);
                  }
                });
            }
          }
        )
        // ── Existing session updated ──────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'game_sessions' },
          (payload) => {
            const updated = payload.new;

            // If pinned to a different session, ignore updates to other sessions
            if (sessionId && updated.id !== sessionId) return;

            // If auto-discovering and this update belongs to a different active session, switch
            if (!sessionId && updated.id !== sessionIdRef.current) {
              if (['playing', 'waiting_for_action', 'showdown'].includes(updated.status)) {
                console.log('[useGameLoop] Switching to session:', updated.id);
                sessionIdRef.current = updated.id;
                setSession(updated);
                seedLogsForSession(updated.id);

                // Refresh agents for the new session
                const newPlayerIds = updated.player_ids;
                if (newPlayerIds && newPlayerIds.length > 0) {
                  supabase
                    .from('agents')
                    .select('*')
                    .in('id', newPlayerIds)
                    .then(({ data }) => {
                      if (data) {
                        const ordered = newPlayerIds
                          .map(pid => data.find(a => a.id === pid))
                          .filter(Boolean);
                        setAgents(ordered);
                      }
                    });
                }
              }
              return;
            }

            setSession(updated);

            // Showdown → reveal all hole cards (hole-card cam)
            if (updated.status === 'showdown') {
              loadHoleCards(updated.id).then(setHoleCardsMap);
            }

            // New hand within same session ID (board cleared) → reset player states
            if (
              updated.status === 'playing' &&
              Array.isArray(updated.board_cards) &&
              updated.board_cards.length === 0
            ) {
              setPlayerStates({});
              setEventLog([]);
              setHoleCardsMap({});
            }
          }
        )
        // ── Live action log entries ───────────────────────────────────────────
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'game_logs' },
          (payload) => {
            const log = payload.new;

            // Only process logs for the current session
            if (log.game_id !== sessionIdRef.current) return;

            // Never show hole card deliveries to spectators
            if (log.action === 'deal') return;

            // Enrich with agent name from our local ref
            const agent = agentsRef.current.find(a => a.id === log.agent_id);
            const enriched = {
              ...log,
              agents: { name: agent?.name || 'System' },
            };

            // Update per-player state
            setPlayerStates(prev => ({
              ...prev,
              [log.agent_id]: {
                lastAction: log.action,
                thoughtProcess: log.thought_process,
                confidence: log.confidence_score,
                currentBet: log.amount || 0,
                status: log.action === 'fold' ? 'folded' : 'active',
              },
            }));

            // Append to event log, deduplicate by id, cap at 20 entries
            setEventLog(prev => {
              if (prev.some(e => e.id === enriched.id)) return prev;
              return [...prev.slice(-19), enriched];
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[useGameLoop] Realtime subscribed');
          }
        });

      // Polling fallback: re-fetch the session every 10s in case Realtime
      // misses an update (e.g. game_sessions Realtime not enabled in Supabase)
      pollInterval = setInterval(async () => {
        if (!sessionIdRef.current) return;
        const { data } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionIdRef.current)
          .maybeSingle();
        if (data) setSession(data);
      }, 10000);
    }

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [sessionId]);

  // Build the player array that PokerTable expects.
  // Now we handle 6 seats with states: 'empty', 'occupied', 'waiting'
  const livePlayerData = session?.player_data || [];

  // DEBUG: Log player_data when status is showdown
  if (session?.status === 'showdown' && livePlayerData.length > 0) {
    console.log('[useGameLoop] SHOWDOWN - player_data:', JSON.parse(JSON.stringify(livePlayerData)));
  }

  // Process all 6 seats
  const seats = [];
  for (let i = 0; i < 6; i++) {
    const seatData = livePlayerData.find(p => p.position === i);

    if (seatData && seatData.state !== 'empty' && seatData.agent) {
      // Seat is occupied or waiting
      const agentData = agents.find(a => a.id === seatData.agent.id);
      const stack = seatData.agent.stack || 0;
      const holeCards = seatData.agent.holeCards || holeCardsMap[seatData.agent.id] || undefined;

      seats.push({
        id: seatData.agent.id,
        name: seatData.agent.name,
        avatarUrl: agentData ? getAgentAvatar(agentData) : '',
        bb: stack / 100,
        stack,
        isYou: false,
        personality_type: agentData?.personality_type,
        holeCards: holeCards,
        seatState: seatData.state, // 'occupied' or 'waiting'
        seatPosition: i,
        ...(playerStates[seatData.agent.id] || DEFAULT_PLAYER_STATE),
      });
    } else {
      // Empty seat
      seats.push({
        id: `empty-${i}`,
        seatState: 'empty',
        seatPosition: i,
        name: 'Empty Seat',
        stack: 0,
        isYou: false,
      });
    }
  }

  // Filter to get only active players (not empty or waiting)
  const players = seats.filter(s => s.seatState === 'occupied' || s.seatState === 'waiting');

  // Guard: never pass stale session data downstream when there are no live agents
  const hasPlayers = players.length > 0;
  return {
    players,
    seats, // Return all 6 seats for display
    currentTurn: hasPlayers ? (session?.current_turn_agent_id || null) : null,
    potSize: hasPlayers ? (session?.pot_amount || 0) : 0,
    communityCards: hasPlayers ? (session?.board_cards || []).map(convertCard).filter(Boolean) : [],
    eventLog: hasPlayers ? eventLog : [],
    sessionStatus: hasPlayers ? (session?.status || 'waiting') : 'waiting',
    loading,
  };
}
