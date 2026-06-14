# recipe-client-rn-quickstart

A **bare React Native (TypeScript)** voice-agent quickstart that talks to a
bundled, keyless Python backend and renders live transcript by **reusing the npm
`agora-agent-client-toolkit`** — no port, no vendoring. React Native runs JS, so
it consumes the same engine-agnostic toolkit the web recipes use, over two thin
Agora **engine adapters**.

```
recipe-client-rn-quickstart/
├── server/   # reused keyless Python/FastAPI backend (get_config, startAgent, stopAgent)
└── rn/       # bare React Native app (the star)
```

## How it works

- **Toolkit, reused not vendored:** `agora-agent-client-toolkit` (MIT,
  engine-agnostic) is `npm install`ed. `AgoraVoiceAI.init(...)` emits
  `TRANSCRIPT_UPDATED` / `AGENT_STATE_CHANGED`.
- **Engine adapters (the net-new work)** in `rn/src/agora/`:
  - `RtcEngineAdapter` over [`react-native-agora`](https://www.npmjs.com/package/react-native-agora)
    (RTC) — implements the toolkit's `RTCEngine` and owns the channel join with
    the **microphone published** (`ChannelMediaOptions { publishMicrophoneTrack:
    true, autoSubscribeAudio: true, clientRoleType: Broadcaster }`).
  - `RtmEngineAdapter` over [`agora-react-native-rtm`](https://www.npmjs.com/package/agora-react-native-rtm)
    (RTM 2.x) — implements the toolkit's `RTMEngine` and **carries the
    transcript** (our agent uses `data_channel:"rtm"`). It translates each native
    RTM `MessageEvent` into the `{ publisher, messageType, message }` shape the
    toolkit reads.
- **Lifecycle:** `getConfig` → RTM `login` + RTC `join` → `AgoraVoiceAI.init` →
  **`subscribeMessage(channel)` BEFORE `startAgent`** → transcript upserted by
  `(turnId, type)` and rendered in a `FlatList` keyed by `` `${turnId}-${type}` ``.
- **Render mode:** `TranscriptHelperMode.TEXT` (full-text transcript updates).
- **Zero-key:** the backend uses a managed keyless cascade — only
  `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` are required.

## Run it

### 1. Backend

```bash
cd server
uv venv venv && . venv/bin/activate
uv pip install -r requirements.txt -r requirements-dev.txt
python src/server.py        # binds 0.0.0.0:8000
```

Provide `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` via `.env.local` (see
`.env.example`).

### 2. React Native app (Android)

```bash
cd rn
npm install
npx react-native run-android   # starts Metro + installs on a running emulator/device
```

The app reaches the backend at `AGENT_BACKEND_URL = http://10.0.2.2:8000`
(`rn/src/config.ts`) — `10.0.2.2` is the Android emulator's alias for the host's
`localhost`. (For an iOS simulator, use `http://localhost:8000`.) Grant the
microphone permission when prompted, then tap **Connect** — the agent greets you
on join.

## Testing

```bash
cd rn
npx tsc --noEmit          # typecheck (pins the Agora SDK + toolkit signatures)
npm test                  # Jest unit test for BackendApi (mocked fetch)
cd android && ./gradlew assembleDebug   # native build (Agora RTC + RTM autolinking)
```

```bash
cd server && pytest -q     # backend tests
```

CI (`.github/workflows/ci.yml`) runs the server tests plus the RN typecheck,
Jest, and `assembleDebug`. `docker.yml` builds and smoke-tests the backend image.
