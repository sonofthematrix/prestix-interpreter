# Current Working State - Prestix Interpreter / RAKUS

Last updated: 2026-05-08

## Scope

Working directory (example paths; use your local clone root):

- `rakus/prestix interpreter` (this app)

This project is currently a focused Prestix Interpreter page for live English/Indonesian interpretation. It is not a full Prestix clone and should not be expanded into admin, support, booking, payments, dashboards, or a full Assistant Runtime port unless a later task explicitly asks for that.

The current rule is: preserve the working interpreter and improve it one roadmap phase at a time.

## Product vision (repository)

Strategically, this repository is **interpreter-first**: the shipping product is the live EN/ID vertolk flow (speech/text, log, natural interpretation, TTS, internal provider routing, learning memory).

**Possible future branches** (only with a separate, explicit task — not implied by roadmap phases 1–11):

- **Personal assistant** — broader conversational agent, tools, and session model; may reuse provider routing and prompt-composition ideas from the interpreter, but is a different product surface than live two-way interpretation.
- **Marketplace** — discovery, listings, trust, and transactions around interpreters, skills, or related services; out of scope until a dedicated specification exists.

Until then, treat the interpreter as the single product line; do not grow scope under the guise of “shared infrastructure” without an explicit prompt.

## Confirmed Working Pieces

- Main interpreter page: `src/app/page.tsx`
- Typed input creates conversation entries and queues translation.
- Browser SpeechRecognition is wired for speech input.
- Local faster-whisper speech input now exists as a push-to-talk alternative to browser SpeechRecognition.
- Translator toggle exists:
  - `on` = live interpreter flow
  - `off` = live assistant conversation flow using the same mic/input surface
- Translator-off entries still queue through `/api/interpreter`, but with assistant prompts instead of interpretation prompts.
- Assistant mode now has an explicit browser-mic language control (`bahasa` / `english`) with localStorage persistence.
- In assistant mode, browser-mic language resolution no longer blindly falls back to the current recognition language; it now prefers transcript markers and the last detected source language to avoid obvious EN/ID misclassification.
- Spoken output now prefers ElevenLabs server-side TTS when configured and falls back to browser speechSynthesis.
- LIVE and STORY capture modes exist.
- Speech transcript buffering exists.
- Buffered speech survives recognition restarts until it is flushed into a conversation entry.
- Manual buffer flush exists.
- Translation queue exists and tracks queue length.
- Speech output is queued separately so translation does not wait for TTS playback.
- Conversation log exists and is the primary transcript/translation view.
- Voice override controls are present but collapsed by default to keep the conversation log dominant.
- Flow log exists and keeps the last 40 technical events.
- Conversation entries include timestamp, speaker, source, mode, status, input, output, provider, fallback, and error data.
- Entry statuses include pending, translating, translated, and error.
- Manual speaker tagging exists for Speaker A, Speaker B, and Unknown.
- Active speaker selector exists.
- Active speaker selection persists in localStorage.
- Keyboard speaker shortcuts exist:
  - Alt+1: Speaker A
  - Alt+2: Speaker B
  - Alt+0: Unknown
- Conversation log persists in localStorage under `prestix-interpreter-conversation-log`.
- Stored conversation entries are normalized on load to tolerate older shapes.
- Re-labeling a conversation entry does not retrigger translation.
- `/api/interpreter` exists and validates `input` plus `mode`.
- `/api/interpreter/feedback` exists and stores learning memory.
- `/api/interpreter/transcribe` exists and shells into a local faster-whisper helper.
- Learning store exists at `src/lib/interpreter/learningStore.ts`.
- Interpreter types exist at `src/lib/interpreter/types.ts`.
- Prompt composition exists at `src/lib/interpreter/promptComposer.ts`.
- Provider router exists at `src/lib/interpreter/providerRouter.ts`.
- Provider fallback chain is internal and server-side.
- Learning memory supports correction, glossary, and style items.
- Old correction-only learning data is still accepted by the learning store.
- Learning metadata is returned by the interpreter API as non-secret telemetry.
- Natural interpreter prompts and wrong-language / too-literal retry guards exist.
- Local in-memory conversation store skeleton exists for future adapter work.

## Provider And Model State

Provider routing is internal. Users should not get a model picker.

Current provider router order, when configured:

1. OpenAI
2. Gemini
3. DeepSeek
4. Local/Ollama
5. Tokenizin-compatible endpoint

The app may expose non-secret runtime metadata such as provider, model name, fallback status, learning match count, and learning types used.

Never expose:

- API keys
- Authorization headers
- Raw environment values
- Provider request headers
- Secrets from `.env.local` or any deployment environment

## Known Blockers / Constraints

- This directory does not currently appear to be a git repository from the working path; `git status` fails with `not a git repository`.
- Existing docs mention repo-wide type-check errors outside interpreter changes. Do not treat unrelated type-check failures as part of an interpreter phase unless the task explicitly asks for it.
- Browser SpeechRecognition support depends on the browser. Unsupported browsers should stay non-fatal and show a clear error.
- Browser SpeechRecognition is still fundamentally single-language at a time; assistant mode now avoids the worst fallback misclassification, but it is not true bilingual ASR/diarization.
- ElevenLabs voice requires env configuration. Without `ELEVENLABS_API_KEY` plus a voice id, the app intentionally falls back to browser speech synthesis.
- A recovered ElevenLabs API key can list voices, but current real TTS calls are still blocked upstream by ElevenLabs account policy (`detected_unusual_activity` / Free Tier disabled). Treat this as an external service blocker, not a local route bug.
- Real automatic speaker diarization is not implemented. Browser SpeechRecognition alone is not enough for reliable diarization.
- Local faster-whisper currently uses a per-request Python helper and CPU model (`base`, `int8`), so first-run/model-download latency is expected.
- Local faster-whisper is configured for higher quality (`medium` with stronger decode settings), so first-run/model-download latency is expected to be heavier than the old `base` setup.
- Conversation persistence is browser localStorage, not server/database storage.
- Learning persistence is JSON-backed at `data/interpreter-learning.json`, not database-backed.
- ZenStack adapter work is intentionally deferred.

## Files To Treat As Sensitive / High Risk

Do not casually rewrite these files because they hold the working interpreter flow:

- `src/app/page.tsx`
- `src/app/api/interpreter/route.ts`
- `src/app/api/interpreter/feedback/route.ts`
- `src/lib/interpreter/types.ts`
- `src/lib/interpreter/learningStore.ts`
- `src/lib/interpreter/promptComposer.ts`
- `src/lib/interpreter/providerRouter.ts`
- `src/lib/interpreter/conversationStore.ts`
- `src/lib/interpreterLearning.ts`
- `data/interpreter-learning.json`
- `.env.local`

If a task touches these files, preserve typed input, speech input, conversation log visibility, flow log visibility, queue behavior, speaker labels, learning memory, and provider fallback behavior.

## Features Requiring A Separate Explicit Prompt

Do not start these without a specific request:

- Full Prestix clone
- Admin/support/booking/payment features
- New dashboard from scratch
- Full Assistant Runtime port
- End-user “personal assistant” app or marketplace (beyond the interpreter page), including multi-tenant listings, payments for third parties, or general agent tooling unrelated to live interpretation
- ZenStack database activation or migration
- User-facing provider/model picker
- Automatic speaker diarization
- Authentication or per-user memory
- Production deployment
- Large UI redesign
- Secret, environment, or credential inspection/reporting

## Roadmap Position

Phase 1 is this document: freeze the current working state so future changes do not restart or replace the app.

Current practical next step: decide whether the next priority is deeper assistant UX polish or more STT quality/workflow tuning.

Full phased roadmap (including strategic branches note at the top): [`roadmap.txt`](../roadmap.txt) next to this `docs/` folder.
