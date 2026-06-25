# 06 · Interfaces

> Token-service API contract, `AgentConfig` shape, `BackendApi` client, Agora toolkit event surface, and env vars.

## Token-service API (server/, port 8000)

The RN app calls these directly (no rewrite proxy — this is a native app, not a browser).

### `GET /get_config`

- Query (optional): `channel?: string`, `uid?: int` (≤ 0 or missing → server generates one).
- Returns `data`: `{ app_id, token, uid (string), channel_name, agent_uid (string) }`.
- Token is a Token007 RTC+RTM token, expiry 3600 s, for a concrete non-zero UID.

### `POST /startAgent`

- Body: `{ channelName: string, rtcUid: int, userUid: int, parameters?: object }`.
  - `parameters.output_audio_codec?: string` is the only honored parameter field.
- Returns `data`: `{ agent_id, channel_name, status: "started" }`.
- Returns 500 if `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` are absent (`agent` is `None`).

### `POST /stopAgent`

- Body: `{ agentId: string }`.
- Returns `{ code: 0, msg: "success" }` (no `data`).

## Response envelope

```json
{ "code": 0, "msg": "success", "data": { ... } }
```

`data` is omitted when the route has no payload. Non-zero `code` = error.

## `AgentConfig` (RN app)

Returned by `BackendApi.getConfig()`:

```ts
interface AgentConfig {
  appId: string;
  token: string;
  uid: string;        // user UID as string
  channelName: string;
  agentUid: string;   // agent UID as string
}
```

## `BackendApi` client (`rn/src/BackendApi.ts`)

| Method | Call |
|--------|------|
| `getConfig()` | `GET /get_config?uid=0` → `AgentConfig` |
| `startAgent(channelName, rtcUid, userUid)` | `POST /startAgent` → `agent_id: string` |
| `stopAgent(agentId)` | `POST /stopAgent` → `void` |

## Toolkit events (`agora-agent-client-toolkit`)

`AgoraVoiceAI` emits these events via `AgoraVoiceAIEvents`:

| Event | Payload | Consumed by |
|-------|---------|-------------|
| `TRANSCRIPT_UPDATED` | `TranscriptHelperItem[]` | `AgoraSession` → `useCallStore.applyTranscript` |
| `AGENT_STATE_CHANGED` | `(agentUserId: string, event: StateChangeEvent)` | `useCallStore` → `agentState` |
| `AGENT_ERROR` | `(agentUserId: string, error: Error)` | `useCallStore` → `error` state |

`AgoraVoiceAI.init()` parameters:

| Field | Value |
|-------|-------|
| `rtcEngine` | `RtcEngineAdapter` instance |
| `rtmConfig.rtmEngine` | `RtmEngineAdapter` instance |
| `renderMode` | `TranscriptHelperMode.TEXT` |

## Environment variables — backend

| Variable               | Required | Default       | Notes                                        |
| ---------------------- | :------: | ------------- | -------------------------------------------- |
| `AGORA_APP_ID`         |    ✅    | —             | Agora project App ID                         |
| `AGORA_APP_CERTIFICATE`|    ✅    | —             | Agora project App Certificate                |
| `OPENAI_MODEL`         |          | `gpt-4o-mini` | OpenAI model for Agora-managed vendor        |
| `OPENAI_API_KEY`       |          | — (keyless)   | Optional BYO; Agora manages key by default   |
| `AGENT_GREETING`       |          | built-in      | Override opening utterance                   |
| `PORT`                 |          | `8000`        | Server port (env only; do not add to .env.example) |

## Related Deep Dives

- [rtm_adapter_and_session.md](L2/rtm_adapter_and_session.md) — `RTMEngine` contract in depth.
