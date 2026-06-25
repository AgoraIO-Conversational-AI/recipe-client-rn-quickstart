# Agent Development Guide

For coding agents working in `recipe-client-rn-quickstart`. This repository is the
**React Native client** recipe in the Agora Conversational AI recipes family — a bare
React Native (TypeScript) app wired to a keyless Python FastAPI token backend.

## How to Load

This repository uses progressive disclosure documentation. Docs live under
`docs/ai/` in three levels.

1. Read [docs/ai/L0_repo_card.md](docs/ai/L0_repo_card.md) to identify the repo.
2. This repo declares `Recipe Role: base`; read [docs/ai/RECIPE.md](docs/ai/RECIPE.md) before changing reusable recipe contracts.
3. Load ALL 8 files in [docs/ai/L1/](docs/ai/L1/). They are small — load all upfront.
4. Follow L2 deep-dive links only when L1 isn't detailed enough. The index is at [docs/ai/L1/L2/_index.md](docs/ai/L1/L2/_index.md).

The sections below remain the canonical contributor handbook for hands-on work;
the `docs/ai/` tree is the structured summary used by AI agents.

## System shape

- **`rn/`** — React Native 0.86 / TypeScript 5 app. Two Agora engine adapters
  (`RtcEngineAdapter`, `RtmEngineAdapter`) implement the `agora-agent-client-toolkit`
  interfaces over `react-native-agora` (RTC) and `agora-react-native-rtm` (RTM 2.x).
  `AgoraSession` owns session lifecycle; `useCallStore` owns all React state.
- **`server/`** — Python FastAPI token service (:8000). Owns Agora token generation and
  a keyless cascading agent pipeline: `DeepgramSTT(nova-3)` → `OpenAI` (Agora-managed)
  → `MiniMaxTTS`. SDK: `agora-agents>=2.3.0`. No `OPENAI_API_KEY` required by default.
- Auth: Token007 from `AGORA_APP_ID` + `AGORA_APP_CERTIFICATE` in the backend.
- Transcript delivery: `data_channel="rtm"` with `advanced_features={"enable_rtm": True}`.

## Session ordering

`RTM login → RTC join → AgoraVoiceAI.init → subscribeMessage → subscribeChannel → /startAgent`

Both `ai.subscribeMessage(channel)` **and** `rtm.subscribeChannel(channel)` must run before
`/startAgent`. The TS toolkit's `subscribeMessage` only binds listeners; RTM 2.x requires
an explicit channel subscribe to deliver messages.

## Routing / ownership

- UI, RTC/RTM lifecycle, and session orchestration live in `rn/src/`.
- Token generation and agent lifecycle live in `server/src/`.
- The React Native app calls the backend directly over HTTP (no rewrite proxy — this is a
  native app, not a browser). Backend URL is hardcoded in `rn/src/config.ts`.
- Android emulator reaches the host backend at `10.0.2.2:8000`; iOS Simulator uses `localhost:8000`.

## Supported modes

- **Local:** start `server/` manually (`python src/server.py`) then run the RN app
  (`npx react-native run-android` or `run-ios`).
- **Deploy:** host the server behind HTTPS; update `AGENT_BACKEND_URL` in `rn/src/config.ts`
  and use a real device. A backend image is published to
  `ghcr.io/AgoraIO-Conversational-AI/recipe-client-rn-quickstart` on `v*` tags.

## Env vars

| Variable               | Default                | Notes |
|------------------------|------------------------|-------|
| `AGORA_APP_ID`         | —                      | **required** |
| `AGORA_APP_CERTIFICATE`| —                      | **required** — server-only, never in the app |
| `OPENAI_MODEL`         | `gpt-4o-mini`          | Agora-managed vendor model |
| `OPENAI_API_KEY`       | — (keyless)            | Optional BYO; Agora manages by default |
| `AGENT_GREETING`       | built-in line          | Override the opening utterance |

## Patterns

- Keep `AGORA_APP_CERTIFICATE` in `server/.env.local`; never pass it to the RN app.
- Keep `data_channel="rtm"` and `advanced_features={"enable_rtm": True}` in the backend agent.
- Always call both `ai.subscribeMessage(channel)` and `rtm.subscribeChannel(channel)` before `/startAgent`.
- Use the `(turnId, type)` composite key for transcript upserts — `CallState.ts` owns this.

## Anti-patterns

- Do not embed `AGORA_APP_CERTIFICATE` or `OPENAI_API_KEY` in `rn/src/config.ts`, `app.json`, or native plists/manifests.
- Do not remove `data_channel="rtm"` or `enable_rtm: True` — transcript delivery will silently stop.
- Do not call `/startAgent` before `subscribeChannel` resolves — the agent greeting will be missed.
- Do not skip `pod install` after `npm install` changes native packages on iOS.

## Commands

```bash
# Backend
cd server && python src/server.py

# RN app
cd rn && npx react-native run-android   # Android
cd rn && npx react-native run-ios       # iOS (requires pod install first)

# Tests
cd rn && npx tsc --noEmit               # TypeScript check (no toolchain needed)
cd rn && npm test                       # Jest unit tests (no server needed)
cd rn/android && ./gradlew assembleDebug   # native Android build
cd server && pytest -q                  # backend unit tests (no cloud, no creds)
```

## Done criteria

1. Run `npx tsc --noEmit` (always) and `npm test` for any RN source change.
2. For native dependency changes: run `pod install` (iOS) or `./gradlew assembleDebug` (Android).
3. For backend changes: run `cd server && pytest -q`.
4. If you change required env vars or setup steps, update the root README, `server/README.md`, and `server/.env.example` together.
5. If the change touches workflows, interfaces, gotchas, or security details, update the matching file under [docs/ai/L1/](docs/ai/L1/) and bump `Last Reviewed` in [docs/ai/L0_repo_card.md](docs/ai/L0_repo_card.md).

## Git Conventions

### Commit messages — conventional commits

- **Format:** `type: description` or `type(scope): description`
- **Types:** `feat:` (new feature), `fix:` (bug fix), `chore:` (maintenance, version bumps), `test:` (test additions/changes), `docs:` (documentation)
- **Scoped variant:** `feat(scope):`, `fix(scope):` — e.g. `fix(rn): correct rtm subscribe order`
- **Lowercase after prefix** — `feat: add feature`, not `feat: Add feature`
- **Present tense** — "add feature", not "added feature"

### Branch names

- **Format:** `type/short-description` — lowercase, hyphen-separated
- **Types match commit types:** `feat/`, `fix/`, `chore/`, `test/`, `docs/`
- **Examples:** `feat/add-settings-screen`, `fix/rtm-subscribe-order`, `docs/progressive-disclosure`

### General rules

- **Repo-local `AGENTS.md` is the authoritative source for repo conventions.**
- **No AI tool names** — never mention claude, cursor, copilot, cody, aider, gemini, codex, chatgpt, or gpt-3/4 in commit messages or PR descriptions.
- **No Co-Authored-By trailers** — omit AI attribution lines.
- **No `--no-verify`** — let git hooks run normally.
- **No git config changes** — do not modify `user.name` or `user.email`.

## Doc Commands

| Command       | When to use                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| generate docs | No `docs/ai/` directory exists yet                                           |
| update docs   | Code changed since the `Last Reviewed` date in L0                            |
| test docs     | Verify docs give agents the right context (writes `docs/ai/test-results.md`) |
| fix docs      | Close findings from a docs review or test run                                |

See the [progressive disclosure standard](https://github.com/AgoraIO-Community/ai-devkit/blob/main/docs/standard/progressive-disclosure-standard.md) and [workflows](https://github.com/AgoraIO-Community/ai-devkit/blob/main/docs/workflows/progressive-disclosure-docs.md) for the full specification.
