# recipe-client-rn-quickstart — Repo Card

> Bare React Native (TypeScript) voice-agent quickstart: two Agora engine adapters wire `agora-agent-client-toolkit` to `react-native-agora` (RTC) and `agora-react-native-rtm` (RTM), backed by a keyless Python FastAPI token service.

## Identity

| Field          | Value                                                                                 |
| -------------- | ------------------------------------------------------------------------------------- |
| Repo           | `AgoraIO-Conversational-AI/recipe-client-rn-quickstart`                               |
| Type           | `frontend-app` (React Native client + bundled token backend)                          |
| Language       | React Native 0.86 / TypeScript 5 + Python 3.12 (FastAPI token service)               |
| Deploy Target  | iOS Simulator / Android emulator or device; server/ as standalone FastAPI service     |
| Owner          | Agora Conversational AI DevEx                                                         |
| Last Reviewed  | 2026-06-25                                                                            |
| Recipe Role    | `base`                                                                                |
| Recipe Version | `1.0.0`                                                                               |
| Recipe Status  | `experimental`                                                                        |

## L1 — Summaries

The Audience column helps agents prioritise: **Use** = consuming the recipe's behavior, **Maintain** = modifying internals.

| File                                     | Purpose                                                                               | Audience       |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | -------------- |
| [01_setup](L1/01_setup.md)               | Node + npm + iOS/Android toolchain, backend venv/uv, env vars, build/run commands    | Use & Maintain |
| [02_architecture](L1/02_architecture.md) | App → token service → Agora ConvoAI topology, session lifecycle                      | Maintain       |
| [03_code_map](L1/03_code_map.md)         | `rn/src/`, `rn/ios/`, `rn/android/`, `server/src/` layout and key file duties        | Maintain       |
| [04_conventions](L1/04_conventions.md)   | RN/TypeScript idioms, custom hook state, adapter pattern, Python backend conventions | Maintain       |
| [05_workflows](L1/05_workflows.md)       | Add a screen, change token endpoint, run on iOS/Android, toggle mic, run tests       | Use            |
| [06_interfaces](L1/06_interfaces.md)     | Token-service API contract, `AgentConfig` shape, toolkit event surface               | Use & Maintain |
| [07_gotchas](L1/07_gotchas.md)           | Native autolinking, Pods, Android emulator host alias, RTM subscribe order           | Maintain       |
| [08_security](L1/08_security.md)         | Token handling, App Certificate server-only, no secrets in the RN bundle             | Maintain       |

## Recipe Profile

This repo declares `Recipe Role: base`. See [RECIPE.md](RECIPE.md) for extension points, invariants, and stable contracts before changing reusable surfaces.
