---
recipe_version: 1.0.0
recipe_status: experimental
extension_points:
  - id: app.screens
    name: React Native screens and navigation
  - id: app.backend-url
    name: Token service URL in rn/src/config.ts
  - id: agent.pipeline
    name: STT/LLM/TTS vendors and pipeline parameters in server/src/agent.py
  - id: agent.greeting
    name: Agent opening utterance via AGENT_GREETING env var
invariants:
  - id: secrets.server-only
    summary: AGORA_APP_CERTIFICATE and OPENAI_API_KEY (BYO) stay in the Python backend; the app receives only the derived Token007.
  - id: rtm.subscribe-before-start
    summary: RTM channel subscription (subscribeMessage + subscribeChannel) must complete before /startAgent is called.
  - id: rtm.explicit-subscribe
    summary: agora-react-native-rtm 2.x requires explicit client.subscribe(channel); the TS toolkit's subscribeMessage alone does not activate message delivery.
  - id: data-channel.rtm
    summary: Backend always sets data_channel="rtm" and advanced_features.enable_rtm=True; the toolkit depends on this for transcript/state.
stable_contracts:
  - id: env.required
    summary: AGORA_APP_ID and AGORA_APP_CERTIFICATE are required; OPENAI_API_KEY is optional (Agora-managed keyless by default).
  - id: api.core-routes
    summary: GET /get_config, POST /startAgent, and POST /stopAgent are the stable token-service endpoints.
  - id: response.envelope
    summary: Successful responses use { code: 0, msg: "success", data: ... }; data is omitted on stopAgent.
  - id: agent-config.shape
    summary: getConfig returns { app_id, token, uid (string), channel_name, agent_uid (string) }.
---

# Recipe Contract

This base recipe defines the reusable surface for a React Native (TypeScript) Agora Conversational AI quickstart using `agora-agent-client-toolkit` with two engine adapters.

## Recipe Role

- Role: `base` recipe (self-contained, clone-and-run; no `Extends` pin).
- Target audience: developers building a React Native voice-agent app backed by a keyless Agora Conversational AI pipeline.
- Reuse model: clone, set `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` in `server/.env.local`, run the server, run the app, then customize screens or pipeline.

## Recipe Scope

- Python FastAPI token generation and agent lifecycle (Deepgram STT → OpenAI → MiniMaxTTS, Agora-managed).
- Two React Native engine adapters (`RtcEngineAdapter`, `RtmEngineAdapter`) wrapping `react-native-agora` and `agora-react-native-rtm`.
- `AgoraSession` orchestrating RTM login → RTC join → toolkit init → subscribe → startAgent.
- `useCallStore` React hook owning all call state.
- `LandingScreen` + `CallScreen` minimal UI.

## Baseline Implementation Guidance

Use this repo's adapter implementations as the starting point for any RN client. The RTM event translation, presence synthesis, and subscribe ordering are non-obvious — do not recreate from memory. Copy verified patterns from `rn/src/agora/`.

## Extension Points

| ID | Surface | How to extend | Required follow-up |
|----|---------|---------------|--------------------|
| `app.screens` | `rn/src/ui/`, `rn/src/CallState.ts`, `rn/App.tsx` | Add screens, add Phase values, add actions to `useCallStore` | Run `npx tsc --noEmit`; verify Android with `assembleDebug` |
| `app.backend-url` | `rn/src/config.ts` | Change `AGENT_BACKEND_URL` for real device or remote backend | Update README with the correct host alias |
| `agent.pipeline` | `server/src/agent.py` `Agent.start()` | Swap `DeepgramSTT`, `OpenAI`, `MiniMaxTTS` for other vendors | Run `cd server && pytest -q`; verify `data_channel="rtm"` is preserved |
| `agent.greeting` | `AGENT_GREETING` env var or `server/.env.local` | Set a custom opening utterance | No code change needed |

## Invariants

- `AGORA_APP_CERTIFICATE` lives only in `server/.env.local`; never expose it to the RN app.
- RTM channel must be subscribed (both `ai.subscribeMessage` and `rtm.subscribeChannel`) before `startAgent` is called.
- `data_channel="rtm"` and `advanced_features={"enable_rtm": True}` must remain set on the backend agent; the toolkit depends on them.
- The `agora-react-native-rtm` 2.x SDK requires explicit channel subscribe — the TS toolkit does not subscribe internally.

## Stable Contracts

| Contract | Stable shape |
|----------|-------------|
| Required backend env | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` |
| Optional backend env | `OPENAI_MODEL`, `OPENAI_API_KEY`, `AGENT_GREETING` |
| `GET /get_config` | Returns `data.app_id`, `data.token`, `data.uid` (string), `data.channel_name`, `data.agent_uid` (string) |
| `POST /startAgent` | Body `{ channelName, rtcUid, userUid, parameters? }`; returns `data.agent_id`, `data.channel_name`, `data.status` |
| `POST /stopAgent` | Body `{ agentId }`; returns `{ code: 0, msg: "success" }` |
| Success envelope | `{ "code": 0, "msg": "success", "data": ... }` |

## Internal / Subject to Change

- Visual layout, StyleSheet values, and button labels in `rn/src/ui/`.
- Exact STT model (`nova-3`), LLM model (`gpt-4o-mini`), TTS voice, as long as `data_channel="rtm"` is preserved.
- In-memory `_sessions` dict details; the stable behavior is start-by-channel and stop-by-returned-`agent_id`.
- `agora-agents` SDK minor-version behavior; this recipe lower-bounds `>=2.3.0`.

## Related Progressive Disclosure Docs

- `L1/01_setup.md` — install, env, and run commands.
- `L1/02_architecture.md` — topology and session lifecycle.
- `L1/06_interfaces.md` — route, AgentConfig, and toolkit event contracts.
- `L1/L2/rtm_adapter_and_session.md` — RTM adapter and subscribe ordering in depth.
- `L1/L2/native_dependency_setup.md` — CocoaPods and Android autolinking.
