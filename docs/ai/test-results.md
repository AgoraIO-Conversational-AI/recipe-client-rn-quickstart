# Progressive Disclosure — Test Results

> Test run for `recipe-client-rn-quickstart` progressive disclosure docs.
> Date: 2026-06-25 · Standard: AgoraIO-Community/ai-devkit progressive-disclosure.

## Step 1 — Structural checks

| Check | Result |
|-------|--------|
| `L0_repo_card.md` ≤ 50 lines | Pass (36) |
| All 8 L1 files present | Pass |
| Each L1 has purpose blockquote + Related Deep Dives | Pass |
| L1 line counts in 80–200 target | **Mixed** (42–98) — 04 and 08 below 80; see note |
| L2 `_index.md` present | Pass |
| Each L2 opens with "When to Read This" callout | Pass (2/2) |
| Relative links resolve (docs/ai/ + AGENTS.md, file targets) | Pass (31/31, 0 broken file targets; 2 directory links in AGENTS.md resolve as directories — valid on GitHub) |
| AGENTS.md has How to Load / Git Conventions / Doc Commands | Pass |

**Note on L1 line counts:** `04_conventions.md` (42) and `08_security.md` (45) are below the 80-line soft target. Both are table-dense and information-complete. The standard warns against padding, so they were left concise. Accepted deviation.

## Step 2/3 — Question runs

Questions span the five standard categories. Each answer was verified against repo source before being marked Pass. "Level" is the lowest disclosure level that fully answers the question.

### Setup & Build

| # | Question | Expected answer | Source of truth | Level | Status |
|---|----------|-----------------|-----------------|-------|--------|
| 1 | How do I run this locally? | Start `server/` with `python src/server.py`; run the RN app with `npx react-native run-android` or `run-ios` | `L1/01_setup.md` ↔ `README.md` | L1 | Pass |
| 2 | Which env vars are required? | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` — no LLM key needed (keyless pipeline) | `L1/01_setup.md`, `06_interfaces.md` ↔ `server/.env.example`, `agent.py` | L1 | Pass |
| 3 | Is there a TypeScript check I can run without a device? | Yes: `cd rn && npx tsc --noEmit` — ran in CI without Android/iOS toolchain | `L1/01_setup.md` ↔ CI `ci.yml` | L1 | Pass (ran: 0 errors) |

### Test & Run

| # | Question | Expected answer | Source of truth | Level | Status |
|---|----------|-----------------|-----------------|-------|--------|
| 4 | How do I run Jest tests without a server? | `cd rn && npm test` — mocks `fetch`; no server or device needed | `L1/01_setup.md` ↔ `__tests__/BackendApi.test.ts` | L1 | Pass (ran: 2 passed) |
| 5 | How do I run backend tests without cloud credentials? | `cd server && pytest -q` with `venv_test` (agora-agents 2.3.0); `conftest.py` provides fake env | `L1/01_setup.md` ↔ `server/tests/conftest.py` | L1 | Pass (ran with venv_test: 2 passed; note: `venv` has stale 2.2.0 — see note below) |
| 6 | What does the CI gate run for the RN job? | `npm ci` → `tsc --noEmit` → `npm test --ci` → `assembleDebug` (JDK 21 + Android SDK) | `L1/01_setup.md` ↔ `.github/workflows/ci.yml` | L1 | Pass |

**Note on backend venv:** The repo ships two venvs. `venv/` has `agora-agents 2.2.0` (stale); `venv_test/` has `2.3.0` (correct). The `test_agent_construction.py` test fails with 2.2.0 due to the 2.3.x constructor change. This is a pre-existing local state issue, not a docs issue. Use `venv_test` or recreate `venv` with `uv pip install -r requirements.txt`.

### Conventions

| # | Question | Expected answer | Source of truth | Level | Status |
|---|----------|-----------------|-----------------|-------|--------|
| 7 | What response shape does the backend use? | `{ code: 0, msg: "success", data: {...} }`; `data` omitted on stopAgent | `L1/04_conventions.md`, `06_interfaces.md` ↔ `server.py` | L1 | Pass |
| 8 | How does turn-type discrimination work for transcript? | `item.metadata.object === MessageType.AGENT_TRANSCRIPTION` → `'agent'`, else `'user'`; composite key `` `${turnId}-${type}` `` | `L1/04_conventions.md` ↔ `CallState.ts` | L1 | Pass |
| 9 | What are the commit/branch conventions? | Conventional commits `type: description`; branches `type/short-description`; no AI tool names | `AGENTS.md` Git Conventions | L0 | Pass |

### Development

| # | Question | Expected answer | Source of truth | Level | Status |
|---|----------|-----------------|-----------------|-------|--------|
| 10 | How do I add a new screen? | Create `rn/src/ui/YourScreen.tsx`; add Phase value in `CallState.ts`; add action in `useCallStore`; branch in `App.tsx AppContent` | `L1/05_workflows.md` ↔ `App.tsx`, `CallState.ts` | L1 | Pass |
| 11 | How do I change the token endpoint URL? | Edit `AGENT_BACKEND_URL` in `rn/src/config.ts`; Android emulator = `10.0.2.2:8000`, iOS Simulator = `localhost:8000` | `L1/05_workflows.md`, `07_gotchas.md` ↔ `config.ts` | L1 | Pass |
| 12 | Where does token generation live and what must stay server-side? | `server/src/server.py` `generate_convo_ai_token`; `AGORA_APP_CERTIFICATE` must never reach the RN app | `L1/02_architecture.md`, `08_security.md` ↔ `server.py` | L1 | Pass |

### Deep Dive

| # | Question | Expected answer | Source of truth | Level | Status |
|---|----------|-----------------|-----------------|-------|--------|
| 13 | Why must `subscribeChannel` be called separately from `subscribeMessage`? | TS toolkit's `subscribeMessage` only binds listeners; RTM 2.x requires `client.subscribe(channel)` to activate message delivery (unlike native iOS/Android toolkits) | `L2/rtm_adapter_and_session.md` ↔ `RtmEngineAdapter.ts`, `AgoraSession.ts` | L2 | Pass |
| 14 | How is the RN RTM `PresenceEvent` translated for the toolkit? | `stateItems: {key,value}[]` folded into a map; `stateChanged: {state, turn_id}` synthesized | `L2/rtm_adapter_and_session.md` ↔ `RtmEngineAdapter.ts` | L2 | Pass |
| 15 | Why must CocoaPods be re-run after `npm install` changes? | `react-native-agora` and `agora-react-native-rtm` ship native code installed via Pods; JS-side package changes are not reflected until `pod install` re-runs | `L2/native_dependency_setup.md` ↔ `ios/Podfile`, `07_gotchas.md` | L2 | Pass |

## Step 4 — Analysis

- All 15 questions answered at the expected disclosure level (12 at L1, 3 at L2).
- No missing-coverage findings; no broken file references.
- Two soft deviations: `04_conventions.md` and `08_security.md` line counts below 80 (accepted; concise/table-dense).
- Pre-existing local state issue: `venv/` contains stale `agora-agents 2.2.0`; `venv_test/` has the correct `2.3.0`. Backend tests pass with the correct venv. Documented but not a docs correctness issue.

## Step 5 — Summary

| Category | Questions | Pass | Notes |
|----------|:---------:|:----:|-------|
| Setup & Build | 3 | 3 | `tsc --noEmit` executed: 0 errors |
| Test & Run | 3 | 3 | Jest: 2 passed; backend pytest (venv_test): 2 passed |
| Conventions | 3 | 3 | — |
| Development | 3 | 3 | — |
| Deep Dive | 3 | 3 | resolved at L2 as designed |
| **Total** | **15** | **15** | — |

## Step 6 — Fixes / Retest

No failing questions; no fixes required. Evidence executed during this run:

- `cd rn && npx tsc --noEmit` → 0 errors.
- `cd rn && npm test --ci` → 2 passed.
- `cd server && pytest -q` (venv_test, agora-agents 2.3.0) → 2 passed.
- Relative link check → 33 checked, 0 broken file targets (2 directory links in AGENTS.md are valid GitHub directory links).
