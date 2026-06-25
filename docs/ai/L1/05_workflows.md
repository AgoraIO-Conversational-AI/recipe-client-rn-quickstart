# 05 · Workflows

> Common modification workflows: add a screen, change the token endpoint, run on each platform, toggle mic, run tests.

## Add a new screen

1. Create `rn/src/ui/YourScreen.tsx` as a functional component, props-only (no local state).
2. Add a new `Phase` value to `Phase` in `CallState.ts` if the screen corresponds to a new call state.
3. Extend `useCallStore()` with any actions the screen needs.
4. In `App.tsx` `AppContent`, add a branch in the `inCall`/else switch to mount your screen.
5. Run `npx tsc --noEmit` to verify.

## Change the token endpoint URL

Edit `rn/src/config.ts`:
```ts
export const AGENT_BACKEND_URL = 'http://<your-host>:8000';
```
- Android emulator → host machine: `http://10.0.2.2:8000`
- iOS Simulator → host machine: `http://localhost:8000`
- Physical device → use the host machine's LAN IP

## Run on Android

```bash
# Terminal 1
cd server && python src/server.py

# Terminal 2 — emulator or USB device
cd rn && npx react-native run-android
```

Ensure an emulator is running (`emulator -list-avds`) or a USB device is connected (`adb devices`).

## Run on iOS (macOS only)

```bash
# Install pods (first time or after npm install)
cd rn/ios && pod install

# Terminal 1
cd server && python src/server.py

# Terminal 2
cd rn && npx react-native run-ios
```

Change `AGENT_BACKEND_URL` to `http://localhost:8000` in `rn/src/config.ts` for the Simulator.

## Toggle microphone

`CallScreen` shows a **Mute / Unmute** button calling `onToggleMic`. `useCallStore.toggleMic()` calls `sessionRef.current.setMicMuted(next)` → `RtcEngineAdapter.setMicMuted(muted)` → `engine.muteLocalAudioStream(muted)`. The `micMuted` state drives the button label.

## Run TypeScript check (no toolchain needed)

```bash
cd rn && npx tsc --noEmit
```

Pins Agora SDK + toolkit signatures; runs in CI without Android/iOS toolchain.

## Run Jest unit tests

```bash
cd rn && npm test
```

Tests in `__tests__/BackendApi.test.ts` mock `fetch`; no server or device needed.

## Run backend tests (no cloud, no creds)

```bash
cd server && pytest -q
```

`conftest.py` provides `fake_env` fixture; `test_agent_construction.py` stubs the SDK session.

## Run Android native build (CI gate)

```bash
cd rn/android && ./gradlew assembleDebug
```

Requires Java 21 and Android SDK. Validates that native autolinking resolves (`react-native-agora`, `agora-react-native-rtm`).

## Change agent greeting or pipeline

Edit `server/.env.local` (or env vars):
- `AGENT_GREETING` — override the opening line
- `OPENAI_MODEL` — change the LLM model (default `gpt-4o-mini`)
- `OPENAI_API_KEY` — provide a BYO key (optional; Agora-managed by default)

To change STT/LLM/TTS vendors, edit `server/src/agent.py` in the `Agent.start()` method where `stt`, `llm`, `tts` are constructed.

## Related Deep Dives

- [native_dependency_setup.md](L2/native_dependency_setup.md) — Pods and autolinking troubleshooting.
- [rtm_adapter_and_session.md](L2/rtm_adapter_and_session.md) — session start/stop ordering.
