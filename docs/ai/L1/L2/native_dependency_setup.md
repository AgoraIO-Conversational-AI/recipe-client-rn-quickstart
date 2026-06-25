# Native Dependency Setup — Deep Dive

**When to Read This:** You are setting up the iOS build for the first time, troubleshooting missing native modules at runtime, upgrading `react-native-agora` or `agora-react-native-rtm`, or diagnosing a failed `assembleDebug`.

## How native linking works in this project

React Native 0.86 uses **autolinking** — no manual `MainApplication.java` registration required. Both `react-native-agora` and `agora-react-native-rtm` ship native modules that are automatically linked.

| Platform | Mechanism | When it runs |
|----------|-----------|-------------|
| iOS | CocoaPods (`use_native_modules!` in Podfile) | `pod install` |
| Android | Gradle autolinking (`react-native.gradle`) | `./gradlew assembleDebug` |

## iOS — CocoaPods

### Install pods

```bash
cd rn/ios
pod install
```

Must be run:
- After initial `npm install`
- After upgrading `react-native-agora` or `agora-react-native-rtm`
- After any `npm install` that changes native packages

### What the Podfile does

`rn/ios/Podfile` calls `use_native_modules!` (resolves native packages from `node_modules`) and `use_react_native!` (installs the RN core pods). `react_native_post_install` patches minimum deployment targets.

The Agora RTC and RTM SDKs include prebuilt XCFrameworks — CocoaPods downloads them from the Agora CDN. This can be slow on first install (~300 MB).

### Common iOS errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Module 'AgoraRtcNg' could not be found` | `pod install` not run after `npm install` | `cd ios && pod install` |
| `Unable to find a specification for 'AgoraRtcEngine_iOS'` | CocoaPods cache stale | `pod repo update && pod install` |
| Build fails on arm64 (Apple Silicon) | Rosetta or arch mismatch | `arch -x86_64 pod install` or ensure CocoaPods is native arm64 |
| `min_ios_version_supported` conflict | Pods require a higher iOS deployment target than RN default | Update target in Podfile (`platform :ios, '14.0'`) if needed |

## Android — Gradle autolinking

### How autolinking resolves native packages

At build time, Gradle's `react-native.gradle` plugin scans `node_modules` for packages with `android` native code and generates `PackageList.java`. Both `react-native-agora` and `agora-react-native-rtm` register their native modules here automatically.

### Required permissions

`rn/android/app/src/main/AndroidManifest.xml` declares:
- `INTERNET` — required for Agora SDK network connectivity
- `RECORD_AUDIO` — declared statically; requested at runtime via `PermissionsAndroid`

### Cleartext traffic

`android:usesCleartextTraffic="${usesCleartextTraffic}"` — in debug builds this is `true` (via `build.gradle` `manifestPlaceholders`), allowing HTTP to `10.0.2.2:8000`.

### Common Android errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Could not find com.agora.example:...` | Agora Maven repo not in `build.gradle` | Check that `react-native-agora`'s `build.gradle` adds the Agora Maven repo; usually autolinking handles this |
| `Duplicate class` on `agora-react-native-rtm` + `react-native-agora` | Shared native transitive deps | Check for `exclude group:` rules in `rn/android/app/build.gradle` |
| `RECORD_AUDIO: Permission denied` at runtime | User denied permission | App handles in `LandingScreen.ensureMicPermission()` — check return value |
| `./gradlew: Permission denied` | gradle wrapper not executable | `chmod +x rn/android/gradlew` |

### Clean build

If autolinking seems stale after a package upgrade:

```bash
cd rn/android && ./gradlew clean && ./gradlew assembleDebug
```

## Java version requirement

CI uses JDK 21 (Temurin). Gradle 8.x bundled with RN 0.86 requires JDK 17+. JDK 21 is the verified combination. Check with:

```bash
java -version   # should report 21.x
```

## Related L1 Files

- [01_setup.md](../01_setup.md) — prerequisite list and install commands.
- [07_gotchas.md](../07_gotchas.md) — Pods gotcha and cleartext traffic note.
