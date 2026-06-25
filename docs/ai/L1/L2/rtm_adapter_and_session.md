# RTM Adapter and Session Lifecycle — Deep Dive

**When to Read This:** You are modifying transcript delivery, RTM subscribe ordering, the `RtmEngineAdapter` event translation, presence-state synthesis, or the `AgoraSession` start/stop lifecycle. This document explains *why* the adapter is shaped the way it is and where the non-obvious constraints come from.

## Why a custom `RtmEngineAdapter` is necessary

The `agora-agent-client-toolkit` defines a `RTMEngine` interface: `addEventListener`, `removeEventListener`, `publish`. The `agora-react-native-rtm` SDK provides an `RTMClient` with a different event shape. The adapter bridges them.

### `MessageEvent` translation

The toolkit's `_handleRtmMessage` reads each `'message'` event as:

```ts
{ publisher: string, messageType: string, message: string }
```

The RN SDK's `MessageEvent` has:

```ts
{
  publisher: string,
  message: string | Uint8Array,
  messageType: number,   // binary enum (0=binary, 1=string) — NOT a string discriminator
  customType: string,    // the string field the toolkit wants as `messageType`
}
```

`makeNativeListener('message')` translates this to the toolkit shape:

```ts
return (event: MessageEvent) => {
  listener({
    publisher: event.publisher,
    messageType: event.customType,   // carry customType, not the numeric enum
    message: event.message,
  });
};
```

### Presence `stateItems` synthesis

The Agora ConvoAI agent publishes its state as RTM presence state changes. The RN SDK delivers `PresenceEvent.stateItems: { key: string, value: string }[]`. The toolkit's `_handleRtmPresence` expects:

```ts
{ publisher, timestamp, stateChanged: { state: string, turn_id: string } }
```

`makeNativeListener('presence')` folds `stateItems` into a map and synthesizes `stateChanged`:

```ts
const states: Record<string, string> = {};
for (const item of event.stateItems ?? []) {
  if (item.key != null) states[item.key] = item.value ?? '';
}
const stateChanged = typeof states.state === 'string'
  ? { state: states.state, turn_id: states.turn_id ?? '0' }
  : undefined;
```

This matches the native iOS/Android toolkit behavior (which reads `states["state"]` / `states["turn_id"]`).

### Bridged listener map

To support `removeEventListener`, the adapter stores a `Map<string, Map<toolkitListener, nativeListener>>`. When the toolkit calls `removeEventListener(event, listener)`, the adapter looks up the native closure and deregisters exactly it. Without this, `removeEventListener` would do nothing (closures are unique per call).

```ts
private bridged = new Map<string, Map<RtmListener, RtmListener>>();
```

## Subscribe ordering in `AgoraSession.start()`

Order matters. Violating it silently drops transcript or greeting messages.

```
1. rtm.login(token)                       // authenticate with RTM
2. rtc.join(appId, token, channel, uid)   // join audio channel (mic published)
3. AgoraVoiceAI.init({ rtcEngine, rtmConfig, renderMode })
4. ai.on(TRANSCRIPT_UPDATED, ...)         // bind app callbacks
5. ai.on(AGENT_STATE_CHANGED, ...)
6. ai.subscribeMessage(channelName)       // bind toolkit's internal RTM listeners
7. rtm.subscribeChannel(channelName)      // activate RTM 2.x channel delivery  ← DO NOT skip
8. [caller] BackendApi.startAgent(...)    // start the agent AFTER subscribe
```

Step 6 alone is **not enough** for RTM 2.x. Unlike the native iOS/Android SDKs (where subscribe is internal), the TS toolkit only registers listeners in step 6. The channel must be subscribed explicitly (step 7) before any messages arrive.

## `AgoraSession.stop()` teardown

```
1. ai.unsubscribe()                  // remove toolkit's RTM listeners
2. rtm.unsubscribeChannel(channel)   // deactivate RTM channel delivery
3. rtc.leave()                       // leave RTC channel
4. rtm.logout()                      // logout RTM
5. ai.destroy()                      // release toolkit resources
6. rtc.destroy()                     // release RTC engine
7. rtm.release()                     // release RTM client
```

Errors are caught in a try/finally; all refs are nulled in the finally block so a failed stop doesn't leave a zombie session.

## Backend `_sessions` and stop resilience

`server/src/agent.py` stores `agent_id → session` in `_sessions`. `stop()` pops the session and calls `session.stop()`. If the session is missing (backend restarted mid-call), it falls back to `client.stop_agent(agent_id)`, which is the Agora REST stop. This prevents `stopAgent` from returning an error when called after a server restart.

## Related L1 Files

- [02_architecture.md](../02_architecture.md) — topology and session lifecycle overview.
- [04_conventions.md](../04_conventions.md) — bridged listener map and adapter pattern.
- [07_gotchas.md](../07_gotchas.md) — subscribe ordering gotchas.
