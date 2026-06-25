# 08 · Security

> Token handling, App Certificate server-side enforcement, no secrets in the RN bundle, microphone permissions, and CORS.

## App Certificate stays in the backend

`AGORA_APP_CERTIFICATE` is used only in `server/src/server.py` to call `generate_convo_ai_token()`. It is never passed to the React Native app. The app receives only the derived, short-lived Token007 (expiry 3600 s). Never embed the App Certificate or App ID + Certificate together in the RN bundle.

## Token007 is the only credential the app holds

`BackendApi.getConfig()` returns `token` (a Token007 string) plus `appId`. The `appId` is considered public (needed by the SDK to initialize). The token grants access to a specific channel for a specific UID with a fixed expiry. It is:
- stored only in `AgoraSession` memory (not persisted to AsyncStorage or disk)
- discarded on `AgoraSession.stop()`

## No secrets in the RN bundle

| What | Location | Why it's safe |
|------|----------|---------------|
| `AGORA_APP_CERTIFICATE` | `server/.env.local` | backend-only; never sent to app |
| `OPENAI_API_KEY` (BYO) | `server/.env.local` | backend-only; never sent to app |
| Token007 | in-memory `AgoraSession` | short-lived, single-channel, single-UID |
| `AGENT_BACKEND_URL` | `rn/src/config.ts` | URL of the backend; not a credential |

Do not add certificate, LLM keys, or any persistent secrets to `rn/src/config.ts`, `app.json`, or native Info.plist/AndroidManifest.

## `OPENAI_API_KEY` is optional (keyless default)

The pipeline uses the Agora-managed OpenAI vendor by default — no user-supplied LLM key is required. If `OPENAI_API_KEY` is set in `server/.env.local`, it is passed to the `OpenAI` vendor as a BYO key. It is **never** transmitted to the RN app.

## Microphone permission

- **Android**: `AndroidManifest.xml` declares `RECORD_AUDIO`; `LandingScreen` calls `PermissionsAndroid.request(RECORD_AUDIO)` at runtime before `connect()`.
- **iOS**: `Info.plist` must contain `NSMicrophoneUsageDescription` (the bare RN project scaffold includes this). The system prompts on first `joinChannel`.

## CORS

`server.py` adds `CORSMiddleware` with `allow_origins=["*"]`. Because this is a native app (not a browser), CORS does not gate access to the token service. For production deployments, restrict `allow_origins` to known origins if the backend is also exposed to web clients.

## Cleartext HTTP in debug

The Android app reaches `10.0.2.2:8000` over plain HTTP (`usesCleartextTraffic=true` in debug). For production builds, host the backend behind HTTPS and remove the cleartext allowance.

## Related Deep Dives

- None. Token issuance details are in [06_interfaces](06_interfaces.md).
