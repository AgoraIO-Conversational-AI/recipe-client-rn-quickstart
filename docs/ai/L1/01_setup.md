# 01 · Setup

> Install the React Native toolchain, the Python token backend, configure env vars, and run the app on Android or iOS.

## Prerequisites

| Tool | Minimum | Notes |
|------|---------|-------|
| Node.js | 22.11.0 | enforced in `rn/package.json` `engines` field |
| npm | bundled with Node | used in `rn/`; npm ci in CI |
| Java (JDK) | 21 (temurin) | Android build (`assembleDebug`) |
| Android SDK | API 33+ | via `android-actions/setup-android` in CI; locally via Android Studio |
| Xcode | latest | iOS Simulator; macOS only |
| CocoaPods | system | iOS native dependency install (`pod install`) |
| Python | 3.12 recommended (3.10+ supported) | backend venv |
| uv | any | recommended for venv/install; `pip` also works |

Agora App ID and App Certificate are required (no third-party LLM key — the pipeline is Agora-managed/keyless).

## Install — backend

```bash
cd server
uv venv venv && . venv/bin/activate
uv pip install -r requirements.txt -r requirements-dev.txt
```

Copy env template and fill credentials:

```bash
cp .env.example .env.local
# edit .env.local: set AGORA_APP_ID and AGORA_APP_CERTIFICATE
```

## Install — React Native app

```bash
cd rn
npm install

# iOS only — install native pods
cd ios && pod install && cd ..
```

## Configure env — backend

Backend env file: `server/.env.local` (template: `server/.env.example`).

| Variable               | Required | Default                              | Notes                                          |
| ---------------------- | :------: | ------------------------------------ | ---------------------------------------------- |
| `AGORA_APP_ID`         |    ✅    | —                                    | Agora Console → Project → App ID               |
| `AGORA_APP_CERTIFICATE`|    ✅    | —                                    | Agora Console → Project → App Certificate      |
| `OPENAI_MODEL`         |          | `gpt-4o-mini`                        | OpenAI model used by the Agora-managed vendor  |
| `OPENAI_API_KEY`       |          | — (keyless by default)               | BYO only — Agora manages the key by default    |
| `AGENT_GREETING`       |          | `"Hi there! How can I help you today?"` | Override the agent's opening line           |

## Configure — app backend URL

`rn/src/config.ts` exports `AGENT_BACKEND_URL`. Default is `http://10.0.2.2:8000` (Android emulator host alias for `localhost`). For the iOS Simulator change to `http://localhost:8000`.

## Run

```bash
# Terminal 1 — backend
cd server && python src/server.py      # binds 0.0.0.0:8000

# Terminal 2 — Android
cd rn && npx react-native run-android  # starts Metro + installs on emulator/device

# Terminal 2 — iOS
cd rn && npx react-native run-ios      # requires macOS + Xcode + pod install done
```

Grant microphone permission when prompted, then tap **Connect**.

## Quick test commands

```bash
cd rn && npx tsc --noEmit              # TypeScript compile check (no native toolchain needed)
cd rn && npm test                      # Jest unit tests (mocked fetch — no server needed)
cd rn/android && ./gradlew assembleDebug   # native Android build smoke
cd server && pytest -q                 # backend unit tests (no cloud, no creds)
```

## Related Deep Dives

- [native_dependency_setup.md](L2/native_dependency_setup.md) — CocoaPods, Android autolinking, and Pods troubleshooting.
