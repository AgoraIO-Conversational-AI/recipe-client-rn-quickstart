import {
  createAgoraRtcEngine,
  IRtcEngine,
  IRtcEngineEventHandler,
  ChannelMediaOptions,
  ClientRoleType,
  RtcConnection,
} from 'react-native-agora';
import type { RTCEngine } from 'agora-agent-client-toolkit';

type RtcListener = (...args: any[]) => void;

/**
 * Adapts `react-native-agora`'s IRtcEngine to the toolkit's `RTCEngine`
 * interface and owns the RTC channel lifecycle (join with the microphone
 * published — the iOS/Android lesson). The toolkit only consumes events; it
 * never joins, so join/leave live here.
 *
 * The toolkit subscribes to `'stream-message'` (and optionally `'audio-pts'`).
 * Our agent delivers transcript over RTM, so stream-message is rarely used, but
 * we forward it faithfully: `onStreamMessage(_, remoteUid, _, data)` →
 * `emit('stream-message', remoteUid, data)`.
 */
export class RtcEngineAdapter implements RTCEngine {
  readonly engine: IRtcEngine;
  private listeners = new Map<string, Set<RtcListener>>();
  private handler: IRtcEngineEventHandler;

  constructor() {
    this.engine = createAgoraRtcEngine();
    this.handler = {
      onStreamMessage: (
        _connection: RtcConnection,
        remoteUid: number,
        _streamId: number,
        data: Uint8Array,
        _length: number,
        _sentTs: number,
      ) => {
        this.emit('stream-message', remoteUid, data);
      },
    };
  }

  // --- toolkit RTCEngine contract -----------------------------------------
  on(eventName: string, listener: RtcListener): void {
    let set = this.listeners.get(eventName);
    if (!set) {
      set = new Set();
      this.listeners.set(eventName, set);
    }
    set.add(listener);
  }

  off(eventName: string, listener: RtcListener): void {
    this.listeners.get(eventName)?.delete(listener);
  }

  private emit(eventName: string, ...args: any[]): void {
    const set = this.listeners.get(eventName);
    if (!set) {
      return;
    }
    for (const l of set) {
      l(...args);
    }
  }

  // --- channel lifecycle ---------------------------------------------------
  async join(appId: string, token: string, channel: string, uid: number): Promise<void> {
    this.engine.initialize({ appId });
    this.engine.registerEventHandler(this.handler);
    this.engine.enableAudio();

    const options: ChannelMediaOptions = {
      publishMicrophoneTrack: true,
      autoSubscribeAudio: true,
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    };
    console.log('DIAG rtc.join', { channel, uid });
    this.engine.joinChannel(token, channel, uid, options);
  }

  setMicMuted(muted: boolean): void {
    this.engine.muteLocalAudioStream(muted);
  }

  leave(): void {
    this.engine.leaveChannel();
    this.engine.unregisterEventHandler(this.handler);
  }

  destroy(): void {
    this.engine.release();
    this.listeners.clear();
  }
}
