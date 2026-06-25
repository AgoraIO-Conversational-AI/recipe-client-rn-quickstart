# 02 · Architecture

> React Native app calls the token backend directly over HTTP, then uses two Agora engine adapters to join both RTC (audio) and RTM (transcript) channels via `agora-agent-client-toolkit`.

## Topology

```
React Native App (rn/)
  │  HTTP fetch
  ▼
Token Backend (server/, :8000)
  │  GET /get_config  →  returns app_id, token, uid, channelName, agentUid
  │  POST /startAgent →  starts the Agora ConvoAI agent in the channel
  │  POST /stopAgent  →  stops the agent
  ▼
Agora ConvoAI Cloud
  │  user audio (RTC)   →  DeepgramSTT → OpenAI (Agora-managed) → MiniMaxTTS
  │  agent audio (RTC)  →  back to user's channel
  │  transcript (RTM)   →  MessageEvent delivered to RtmEngineAdapter
  ▼
agora-agent-client-toolkit (AgoraVoiceAI)
  │  TRANSCRIPT_UPDATED  →  CallState.useCallStore → CallScreen FlatList
  │  AGENT_STATE_CHANGED →  CallState.agentState badge
```

## Key components

| Component | Location | Role |
|-----------|----------|------|
| `BackendApi` | `rn/src/BackendApi.ts` | HTTP fetch wrapper for the three token-service endpoints |
| `AgoraSession` | `rn/src/agora/AgoraSession.ts` | Orchestrates `RtcEngineAdapter` + `RtmEngineAdapter` + `AgoraVoiceAI`; owns session lifecycle |
| `RtcEngineAdapter` | `rn/src/agora/RtcEngineAdapter.ts` | Adapts `react-native-agora` `IRtcEngine` to the toolkit's `RTCEngine` interface |
| `RtmEngineAdapter` | `rn/src/agora/RtmEngineAdapter.ts` | Adapts `agora-react-native-rtm` `RTMClient` to the toolkit's `RTMEngine` interface; translates native `MessageEvent` shape |
| `useCallStore` | `rn/src/CallState.ts` | React custom hook owning `phase`, `turns`, `agentState`, `micMuted`; drives `AgoraSession` |
| `LandingScreen` | `rn/src/ui/LandingScreen.tsx` | Pre-call UI; requests Android microphone permission |
| `CallScreen` | `rn/src/ui/CallScreen.tsx` | In-call UI: transcript `FlatList` + mute/end controls |
| `server/src/agent.py` | `server/` | Agora-managed cascading pipeline (Deepgram STT → OpenAI → MiniMaxTTS) via `agora-agents>=2.3.0` |

## Session lifecycle

1. `useCallStore.connect()` → `BackendApi.getConfig()` → receives `{appId, token, uid, channelName, agentUid}`.
2. `AgoraSession.start(config)` → `RtmEngineAdapter.login(token)` → `RtcEngineAdapter.join(...)` (mic published, role Broadcaster).
3. `AgoraVoiceAI.init({ rtcEngine, rtmConfig, renderMode: TEXT })`.
4. `ai.subscribeMessage(channelName)` binds toolkit listeners; `rtm.subscribeChannel(channelName)` activates RTM 2.x delivery — **both required, in this order**.
5. `BackendApi.startAgent(channelName, agentUid, uid)` → Agora ConvoAI cloud starts the agent.
6. Agent greets user; RTM `MessageEvent` → `RtmEngineAdapter` → `AgoraVoiceAI` → `TRANSCRIPT_UPDATED` → `CallScreen` re-renders.
7. `end()` → `stopAgent(agentId)` → `AgoraSession.stop()` (RTM unsubscribe + logout, RTC leave).

## Pipeline (server side)

`DeepgramSTT(nova-3, en)` → `OpenAI` (Agora-managed, keyless) → `MiniMaxTTS` — no `llm/` service; single-process cascade. Data channel is `"rtm"` with `enable_rtm: True`; transcript/state/metrics ride RTM.

## Tech decisions

- **Engine adapters** — `agora-agent-client-toolkit` is engine-agnostic; adapters translate native RN SDK event shapes to the toolkit's `RTCEngine`/`RTMEngine` interfaces.
- **RTM 2.x explicit subscribe** — the TS toolkit's `subscribeMessage` only binds listeners; `client.subscribe(channel)` must be called separately (unlike the native iOS/Android toolkits which subscribe internally).
- **Keyless pipeline** — no third-party LLM key required; Agora manages the OpenAI vendor. `OPENAI_API_KEY` is optional BYO.
- **Android emulator alias** — `10.0.2.2` is the emulator's route to the host `localhost:8000`.

## Related Deep Dives

- [rtm_adapter_and_session.md](L2/rtm_adapter_and_session.md) — RTM event translation, presence-state synthesis, subscribe ordering.
