import { useCallback, useRef, useState } from 'react';
import {
  MessageType,
  type TranscriptHelperItem,
  type UserTranscription,
  type AgentTranscription,
  type StateChangeEvent,
  AgentState,
} from 'agora-agent-client-toolkit';
import { BackendApi } from './BackendApi';
import { AgoraSession } from './agora/AgoraSession';
import { AGENT_BACKEND_URL } from './config';

export type Phase = 'idle' | 'connecting' | 'inCall' | 'error';

/** 'user' | 'agent' — the second half of the transcript composite key. */
export type TurnType = 'user' | 'agent';

export interface Turn {
  turnId: number;
  type: TurnType;
  text: string;
}

type ToolkitTranscript = TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>;

function turnTypeOf(item: ToolkitTranscript): TurnType {
  return item.metadata?.object === MessageType.AGENT_TRANSCRIPTION ? 'agent' : 'user';
}

export interface CallStore {
  phase: Phase;
  error: string | null;
  agentState: AgentState;
  micMuted: boolean;
  turns: Turn[];
  connect: () => Promise<void>;
  end: () => Promise<void>;
  toggleMic: () => void;
}

export function useCallStore(): CallStore {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);
  const [micMuted, setMicMuted] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  const apiRef = useRef(new BackendApi(AGENT_BACKEND_URL));
  const sessionRef = useRef<AgoraSession | null>(null);
  const agentIdRef = useRef<string | null>(null);

  /** Upsert by (turnId, type); sort by turn asc, user before agent. */
  const applyTranscript = useCallback((items: ToolkitTranscript[]) => {
    setTurns((prev) => {
      const byKey = new Map<string, Turn>();
      for (const t of prev) {
        byKey.set(`${t.turnId}-${t.type}`, t);
      }
      for (const item of items) {
        const type = turnTypeOf(item);
        byKey.set(`${item.turn_id}-${type}`, {
          turnId: item.turn_id,
          type,
          text: item.text,
        });
      }
      return [...byKey.values()].sort((a, b) => {
        if (a.turnId !== b.turnId) {
          return a.turnId - b.turnId;
        }
        return a.type === b.type ? 0 : a.type === 'user' ? -1 : 1;
      });
    });
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setTurns([]);
    setPhase('connecting');
    try {
      const cfg = await apiRef.current.getConfig();
      const session = new AgoraSession({
        onTranscript: applyTranscript,
        onState: (_uid: string, ev: StateChangeEvent) => setAgentState(ev.state),
        onError: (err: unknown) =>
          setError(err instanceof Error ? err.message : String(err)),
      });
      sessionRef.current = session;
      await session.start(cfg);
      // subscribeMessage already ran inside start(); now launch the agent.
      agentIdRef.current = await apiRef.current.startAgent(
        cfg.channelName,
        Number(cfg.agentUid),
        Number(cfg.uid),
      );
      console.log('DIAG agent.started', agentIdRef.current);
      setPhase('inCall');
    } catch (err) {
      console.log('DIAG connect.error', err);
      setError(err instanceof Error ? err.message : String(err));
      setPhase('error');
      await sessionRef.current?.stop().catch(() => {});
      sessionRef.current = null;
    }
  }, [applyTranscript]);

  const end = useCallback(async () => {
    try {
      if (agentIdRef.current) {
        await apiRef.current.stopAgent(agentIdRef.current).catch(() => {});
      }
      await sessionRef.current?.stop();
    } finally {
      agentIdRef.current = null;
      sessionRef.current = null;
      setAgentState(AgentState.IDLE);
      setMicMuted(false);
      setPhase('idle');
    }
  }, []);

  const toggleMic = useCallback(() => {
    setMicMuted((m) => {
      const next = !m;
      sessionRef.current?.setMicMuted(next);
      return next;
    });
  }, []);

  return {
    phase,
    error,
    agentState,
    micMuted,
    turns,
    connect,
    end,
    toggleMic,
  };
}
