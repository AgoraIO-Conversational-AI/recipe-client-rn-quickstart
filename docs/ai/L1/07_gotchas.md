# 07 · Gotchas

> Non-obvious platform pitfalls: native linking, Pods, Android emulator networking, RTM subscribe ordering, and backend quirks.

## RTM 2.x requires an explicit channel subscribe

The TypeScript toolkit's `subscribeMessage(channelName)` only registers event listeners — it does **not** subscribe the RTM channel. Unlike the native iOS/Android toolkits (which subscribe internally), the TS version on React Native requires:

```ts
ai.subscribeMessage(channelName);          // bind listeners first
await rtm.subscribeChannel(channelName);   // then activate delivery
```

Reversing the order or omitting `subscribeChannel` silently drops all transcript messages.

## Subscribe BEFORE `/startAgent`

`AgoraSession.start()` calls `subscribeMessage` + `subscribeChannel` before returning, so the caller must fire `startAgent` only after `session.start()` resolves. The agent's greeting arrives immediately on join; missing the subscribe means missing the first transcript turn.

## Android emulator host alias

The backend binds `0.0.0.0:8000` on the host machine. From inside an Android emulator, `localhost` and `127.0.0.1` refer to the emulator itself — not the host. Use `10.0.2.2` (the emulator's route to the host loopback). This is hardcoded in `rn/src/config.ts`. For an iOS Simulator, `localhost` works because the Simulator shares the host network stack.

## iOS CocoaPods must be run after `npm install`

`react-native-agora` and `agora-react-native-rtm` ship native code installed via CocoaPods. After any `npm install` that changes these packages, run:

```bash
cd rn/ios && pod install
```

Failing to do so results in missing native modules at runtime (`RCTBridge: Module 'AgoraRtcNg' could not be found`). There is no `pod install` equivalent for Android — autolinking handles it at Gradle build time.

## Android autolinking requires a fresh Gradle build

Autolinking for `react-native-agora` and `agora-react-native-rtm` is applied at `./gradlew assembleDebug` time. If you install a new version of either package:

```bash
cd rn/android && ./gradlew clean && ./gradlew assembleDebug
```

## `RECORD_AUDIO` permission on Android

The `LandingScreen` calls `PermissionsAndroid.request(RECORD_AUDIO)` at connect time. If the user denies it, `RtcEngineAdapter.join()` still calls `engine.enableAudio()` and `joinChannel()`, but no audio will be captured. Guard on the return value of `ensureMicPermission()` (the screen already does this).

## Presence `stateItems` shape difference

The agent publishes its state (e.g. `state: "speaking"`) as RTM presence state. The RN RTM SDK delivers this as `PresenceEvent.stateItems: { key, value }[]`, not as a flat object. `RtmEngineAdapter.makeNativeListener('presence')` folds `stateItems` into a map and synthesizes `stateChanged: { state, turn_id }` — the shape the toolkit's `_handleRtmPresence` expects. Do not bypass this translation.

## `agent` is `None` after server startup if env vars are missing

`server.py` catches `ValueError` from `Agent()` and sets `agent = None`. All routes guard `if agent is None → 500`. The server still starts but every API call returns 500. Check `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` in `.env.local`.

## Cleartext traffic on Android

`AndroidManifest.xml` sets `android:usesCleartextTraffic="${usesCleartextTraffic}"`. In debug builds (`build.gradle` defaultConfig) this is `true`, allowing HTTP to `10.0.2.2:8000`. In release builds use HTTPS or configure a Network Security Config.

## Related Deep Dives

- [native_dependency_setup.md](L2/native_dependency_setup.md) — detailed CocoaPods and autolinking resolution.
- [rtm_adapter_and_session.md](L2/rtm_adapter_and_session.md) — subscribe ordering and event translation.
