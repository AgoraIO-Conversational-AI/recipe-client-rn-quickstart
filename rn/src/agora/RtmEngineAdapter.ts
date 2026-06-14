import {
  createAgoraRtmClient,
  RTMClient,
  MessageEvent,
  PresenceEvent,
} from 'agora-react-native-rtm';
import type { RTMEngine } from 'agora-agent-client-toolkit';

type RtmListener = (...args: any[]) => void;

/**
 * Adapts `agora-react-native-rtm` (RTM 2.x) to the toolkit's `RTMEngine`.
 *
 * THIS IS THE LOAD-BEARING ADAPTER: our agent sends transcript over RTM
 * (`data_channel:"rtm"`). The toolkit's `_handleRtmMessage` reads each
 * `'message'` event as `{ publisher, messageType, message }`, then JSON-parses
 * `message` and routes on its `object` field. The RN RTM SDK emits its own
 * `MessageEvent` shape, so we translate it here:
 *
 *   MessageEvent.publisher  -> publisher   (string user id)
 *   MessageEvent.message    -> message     (the JSON transcript payload string)
 *   MessageEvent.customType -> messageType (string discriminator; the RN
 *                                           `messageType` field is a binary/string
 *                                           enum, NOT the toolkit's string type)
 *
 * The toolkit also subscribes to `'presence'` (agent state) and `'status'`
 * (link state) — we forward those events with light normalization.
 */
export class RtmEngineAdapter implements RTMEngine {
  readonly client: RTMClient;
  // Map a toolkit listener -> the native listener we registered, so we can
  // unregister the exact native function on removeEventListener.
  private bridged = new Map<string, Map<RtmListener, RtmListener>>();

  constructor(appId: string, userId: string) {
    this.client = createAgoraRtmClient({ appId, userId });
  }

  async login(token: string): Promise<void> {
    console.log('DIAG rtm.login');
    await this.client.login({ token });
  }

  /**
   * Subscribe to the RTM channel so the agent's transcript/presence messages
   * are delivered to the bound `'message'`/`'presence'` listeners. RTM 2.x does
   * NOT deliver channel messages on login alone — an explicit subscribe is
   * required. The TS toolkit's `subscribeMessage` only binds listeners; it does
   * not subscribe the channel, so the consumer must (unlike the native iOS/
   * Android toolkits, which subscribe internally).
   */
  async subscribeChannel(channelName: string): Promise<void> {
    await this.client.subscribe(channelName, {
      withMessage: true,
      withPresence: true,
      withMetadata: false,
      withLock: false,
    });
  }

  async unsubscribeChannel(channelName: string): Promise<void> {
    await this.client.unsubscribe(channelName);
  }

  async logout(): Promise<void> {
    await this.client.logout();
  }

  release(): void {
    this.client.release();
    this.bridged.clear();
  }

  // --- toolkit RTMEngine contract -----------------------------------------
  async publish(
    channelName: string,
    message: string | Uint8Array,
    _options?: { channelType?: string; customType?: string },
  ): Promise<unknown> {
    return this.client.publish(channelName, message, {
      customType: _options?.customType,
    });
  }

  addEventListener(eventName: string, listener: RtmListener): void {
    const native = this.makeNativeListener(eventName, listener);
    let perEvent = this.bridged.get(eventName);
    if (!perEvent) {
      perEvent = new Map();
      this.bridged.set(eventName, perEvent);
    }
    perEvent.set(listener, native);
    // RTM 2.x typed event names: 'message' | 'presence' | 'status'(link) etc.
    this.client.addEventListener(eventName as any, native as any);
  }

  removeEventListener(eventName: string, listener: RtmListener): void {
    const native = this.bridged.get(eventName)?.get(listener);
    if (native) {
      this.client.removeEventListener(eventName as any, native as any);
      this.bridged.get(eventName)?.delete(listener);
    }
  }

  // Translate the RN RTM native payload into the shape the toolkit expects.
  private makeNativeListener(eventName: string, listener: RtmListener): RtmListener {
    if (eventName === 'message') {
      return (event: MessageEvent) => {
        listener({
          publisher: event.publisher,
          // RN's `messageType` is the binary/string enum; the toolkit wants a
          // string discriminator, so carry `customType` (may be undefined).
          messageType: event.customType,
          message: event.message,
        });
      };
    }
    if (eventName === 'presence') {
      return (event: PresenceEvent) => {
        // The toolkit's `_handleRtmPresence` reads `presence.stateChanged =
        // { state, turn_id }` to emit AGENT_STATE_CHANGED. RN delivers the
        // agent's state as `stateItems: { key, value }[]` (a presence state
        // change), so fold them into a map and synthesize `stateChanged` —
        // matching the native iOS/Android toolkits, which read
        // states["state"] / states["turn_id"].
        const states: Record<string, string> = {};
        for (const item of event.stateItems ?? []) {
          if (item.key != null) {
            states[item.key] = item.value ?? '';
          }
        }
        const stateChanged =
          typeof states.state === 'string'
            ? { state: states.state, turn_id: states.turn_id ?? '0' }
            : undefined;
        listener({
          publisher: event.publisher,
          timestamp: event.timestamp,
          stateChanged,
        });
      };
    }
    // 'status'/'linkState' and any other event: pass through unchanged.
    return (...args: any[]) => listener(...args);
  }
}
