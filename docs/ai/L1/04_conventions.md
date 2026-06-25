# 04 · Conventions

> TypeScript/React Native idioms, the adapter pattern, React state conventions, and Python backend patterns.

## React Native / TypeScript

| Convention | Detail |
|------------|--------|
| Single entry custom hook | `useCallStore()` in `CallState.ts` owns all session state and returns a `CallStore` type; screens receive only what they display |
| Phase enum | `Phase = 'idle' \| 'connecting' \| 'inCall' \| 'error'` — `App.tsx` switches on `phase` to mount `LandingScreen` or `CallScreen` |
| Transcript composite key | Turns are upserted by `` `${turnId}-${type}` `` (Map keyed by this string); `type = 'user' \| 'agent'` discriminated from `item.metadata.object` |
| `useRef` for objects | `apiRef`, `sessionRef`, `agentIdRef` use `useRef` — stable across re-renders, not reactive |
| Android permission before connect | `LandingScreen` calls `PermissionsAndroid.request(RECORD_AUDIO)` on Connect press; iOS is handled by native Info.plist |
| `DIAG` log prefix | Diagnostic `console.log` lines use `'DIAG'` prefix throughout; safe to remove in production |
| `AUTO_CONNECT` flag | `src/config.ts` — `false` by default; set `true` for CI logcat gating without manual tap |

## Adapter pattern

Each native Agora SDK has a different event / method shape. The adapters (`RtcEngineAdapter`, `RtmEngineAdapter`) wrap the native SDK and implement the toolkit's `RTCEngine` / `RTMEngine` interfaces. This keeps `AgoraSession` and the toolkit free from native SDK specifics.

| Interface | Adapter | Native SDK |
|-----------|---------|------------|
| `RTCEngine` | `RtcEngineAdapter` | `react-native-agora` (`IRtcEngine`) |
| `RTMEngine` | `RtmEngineAdapter` | `agora-react-native-rtm` (`RTMClient`) |

- **Bridged listener map** — `RtmEngineAdapter` stores `toolkitListener → nativeListener` in `bridged` so `removeEventListener` can deregister the exact native closure.
- **No toolkit join** — the toolkit does not join channels; `AgoraSession` calls `rtc.join(...)` directly.

## Python backend

| Convention | Detail |
|------------|--------|
| `{ code, msg, data }` envelope | All success responses; `data` present only when there is a payload |
| Error mapping | `ValueError→400`, `RuntimeError→500`, else 500 via `_to_http_error` |
| `Agent()` raises on missing creds | `__init__` raises `ValueError` if `AGORA_APP_ID`/`AGORA_APP_CERTIFICATE` absent; server catches and sets `agent = None` |
| `_sessions` in-memory dict | Maps `agent_id → session`; `stop()` falls back to `client.stop_agent(agent_id)` if the session is missing (restart resilience) |
| camelCase request fields | `StartAgentRequest` uses `channelName`, `rtcUid`, `userUid` to match the RN client's JSON |
| `data_channel: "rtm"` | Always set; required for transcript delivery to the toolkit |

## Related Deep Dives

- [rtm_adapter_and_session.md](L2/rtm_adapter_and_session.md) — bridged listener map and event translation in depth.
