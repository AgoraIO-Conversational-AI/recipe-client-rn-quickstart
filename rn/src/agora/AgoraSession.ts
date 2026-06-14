import {
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  TranscriptHelperMode,
  type TranscriptHelperItem,
  type UserTranscription,
  type AgentTranscription,
  type StateChangeEvent,
} from 'agora-agent-client-toolkit';
import { RtcEngineAdapter } from './RtcEngineAdapter';
import { RtmEngineAdapter } from './RtmEngineAdapter';
import type { AgentConfig } from '../BackendApi';

type Transcript = TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>;

export interface SessionCallbacks {
  onTranscript: (items: Transcript[]) => void;
  onState: (agentUserId: string, event: StateChangeEvent) => void;
  onError?: (err: unknown) => void;
}

/**
 * Wires the toolkit (`AgoraVoiceAI`) to the two RN engine adapters and owns the
 * session lifecycle. Lesson order pre-applied: RTM login + RTC join (mic
 * published) happen here, and `subscribeMessage(channel)` is called BEFORE the
 * caller's `/startAgent` request.
 */
export class AgoraSession {
  private rtc?: RtcEngineAdapter;
  private rtm?: RtmEngineAdapter;
  private ai?: AgoraVoiceAI;
  private channel?: string;

  constructor(private cb: SessionCallbacks) {}

  /** Create + connect both engines, init the toolkit, and subscribe. */
  async start(config: AgentConfig): Promise<void> {
    const uid = Number(config.uid);
    this.channel = config.channelName;

    this.rtc = new RtcEngineAdapter();
    this.rtm = new RtmEngineAdapter(config.appId, config.uid);

    // RTM carries transcript — log in first.
    await this.rtm.login(config.token);

    // RTC join with the microphone published.
    await this.rtc.join(config.appId, config.token, config.channelName, uid);
    console.log('DIAG rtc.joined', { channel: config.channelName, uid });

    this.ai = await AgoraVoiceAI.init({
      rtcEngine: this.rtc,
      rtmConfig: { rtmEngine: this.rtm },
      renderMode: TranscriptHelperMode.TEXT,
    });

    this.ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (items) => {
      console.log('DIAG TRANSCRIPT_UPDATED', items.length);
      this.cb.onTranscript(items);
    });
    this.ai.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (agentUserId, event) => {
      console.log('DIAG AGENT_STATE_CHANGED', agentUserId, event.state);
      this.cb.onState(agentUserId, event);
    });
    this.ai.on(AgoraVoiceAIEvents.AGENT_ERROR, (agentUserId, error) => {
      console.log('DIAG AGENT_ERROR', agentUserId, error?.message);
      this.cb.onError?.(error);
    });

    // Subscribe BEFORE /startAgent so we don't miss the greeting.
    this.ai.subscribeMessage(config.channelName);
    console.log('DIAG ai.subscribed', config.channelName);
  }

  setMicMuted(muted: boolean): void {
    this.rtc?.setMicMuted(muted);
  }

  async stop(): Promise<void> {
    try {
      this.ai?.unsubscribe();
      this.rtc?.leave();
      await this.rtm?.logout();
      this.ai?.destroy();
      this.rtc?.destroy();
      this.rtm?.release();
    } catch (err) {
      console.log('DIAG session.stop.error', err);
      this.cb.onError?.(err);
    } finally {
      this.ai = undefined;
      this.rtc = undefined;
      this.rtm = undefined;
      this.channel = undefined;
    }
  }
}
