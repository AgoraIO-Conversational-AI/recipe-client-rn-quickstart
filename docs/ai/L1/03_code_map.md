# 03 · Code Map

> Directory layout for `rn/` (React Native app) and `server/` (Python token service).

## Top-level layout

```
recipe-client-rn-quickstart/
├── rn/                     # React Native app (TypeScript)
├── server/                 # Python FastAPI token/agent backend
├── Dockerfile              # builds the server/ backend image
└── .github/workflows/
    ├── ci.yml              # server pytest + RN tsc/jest/assembleDebug
    └── docker.yml          # build + smoke-test the backend image
```

## `rn/` — React Native app

```
rn/
├── App.tsx                         # root component; renders LandingScreen or CallScreen
├── index.js                        # RN entry point (registers AppRegistry)
├── src/
│   ├── config.ts                   # AGENT_BACKEND_URL + AUTO_CONNECT flag
│   ├── BackendApi.ts               # HTTP fetch wrapper (getConfig, startAgent, stopAgent)
│   ├── CallState.ts                # useCallStore custom hook — phase, turns, agentState, micMuted
│   ├── agora/
│   │   ├── AgoraSession.ts         # session orchestrator (RTM login → RTC join → toolkit init → subscribe)
│   │   ├── RtcEngineAdapter.ts     # react-native-agora → toolkit RTCEngine adapter
│   │   └── RtmEngineAdapter.ts     # agora-react-native-rtm → toolkit RTMEngine adapter + event translation
│   └── ui/
│       ├── LandingScreen.tsx       # pre-call screen; requests Android RECORD_AUDIO permission
│       └── CallScreen.tsx          # in-call screen: agent state badge, transcript FlatList, mute/end
├── __tests__/
│   └── BackendApi.test.ts          # Jest unit test (mocked fetch) for envelope decoding
├── android/
│   └── app/src/main/
│       └── AndroidManifest.xml     # INTERNET + RECORD_AUDIO permissions
├── ios/
│   ├── Podfile                     # CocoaPods: use_native_modules! + react_native_post_install
│   └── RnQuickstart.xcodeproj/
├── package.json                    # deps: react-native-agora, agora-react-native-rtm, agora-agent-client-toolkit
├── tsconfig.json                   # extends @react-native/typescript-config
├── metro.config.js                 # default Metro config
└── babel.config.js
```

## `server/` — Python FastAPI token service

```
server/
├── src/
│   ├── server.py       # FastAPI app; GET /get_config, POST /startAgent, POST /stopAgent
│   └── agent.py        # Agent class; cascading Deepgram→OpenAI→MiniMax pipeline; sessions dict
├── tests/
│   ├── conftest.py             # fake env fixture (AGORA_APP_ID, AGORA_APP_CERTIFICATE)
│   ├── test_config.py          # basic Agent construction smoke
│   └── test_agent_construction.py  # AgoraAgent construction + FakeSession integration
├── scripts/
│   └── run_fake_server.py      # local dev helper (not CI gate)
├── requirements.txt            # fastapi, uvicorn, agora-agents>=2.3.0, python-dotenv, socksio
├── requirements-dev.txt        # pytest
└── .env.example                # template: AGORA_APP_ID, AGORA_APP_CERTIFICATE, optional vars
```

## Key file responsibilities

| File | What it owns |
|------|-------------|
| `rn/src/agora/RtmEngineAdapter.ts` | Native `MessageEvent` → toolkit `{publisher, messageType, message}` translation; presence `stateItems[]` → `stateChanged` synthesis |
| `rn/src/agora/AgoraSession.ts` | RTM-before-RTC ordering; `subscribeMessage` + `subscribeChannel` ordering pre-`startAgent` |
| `rn/src/CallState.ts` | Turn upsert by `(turnId, type)` composite key; all React state |
| `server/src/agent.py` | Agora-managed STT/LLM/TTS cascade; `_sessions` dict for stop-by-id; `data_channel="rtm"` |
| `server/src/server.py` | Token generation (`generate_convo_ai_token`), route dispatch, error mapping |

## Related Deep Dives

- [rtm_adapter_and_session.md](L2/rtm_adapter_and_session.md) — adapter internals in detail.
- [native_dependency_setup.md](L2/native_dependency_setup.md) — Pods and Android autolinking.
