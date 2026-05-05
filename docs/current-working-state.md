# Current Working State - Prestix Interpreter / RAKUS

Last updated: 2026-05-01

## Scope

Working directory:

`C:\Users\sonof\Downloads\rakus\prestix.app-main`

This project is currently a focused Prestix Interpreter page for live English/Indonesian interpretation. It is not a full Prestix clone and should not be expanded into admin, support, booking, payments, dashboards, or a full Assistant Runtime port unless a later task explicitly asks for that.

The current rule is: preserve the working interpreter and improve it one roadmap phase at a time.

## Confirmed Working Pieces

- Main interpreter page: `src/app/page.tsx`
- Typed input creates conversation entries and queues translation.
- Browser SpeechRecognition is wired for speech input.
- Browser speechSynthesis is wired for spoken output.
- LIVE and STORY capture modes exist.
- Speech transcript buffering exists.
- Manual buffer flush exists.
- Translation queue exists and tracks queue length.
- Conversation log exists and is the primary transcript/translation view.
- Flow log exists and keeps the last 40 technical events.
- Conversation entries include timestamp, speaker, source, mode, status, input, output, provider, fallback, and error data.
- Entry statuses include pending, translating, translated, and error.
- Manual speaker tagging exists for Speaker A, Speaker B, and Unknown.
- Active speaker selector exists.
- Keyboard speaker shortcuts exist:
  - Alt+1: Speaker A
  - Alt+2: Speaker B
  - Alt+0: Unknown
- Conversation log persists in localStorage under `prestix-interpreter-conversation-log`.
- Stored conversation entries are normalized on load to tolerate older shapes.
- `/api/interpreter` exists and validates `input` plus `mode`.
- `/api/interpreter/feedback` exists and stores learning memory.
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

1. Tokenizin-compatible OpenAI endpoint
2. DeepSeek
3. OpenAI
4. Local/Ollama

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
- Real automatic speaker diarization is not implemented. Browser SpeechRecognition alone is not enough for reliable diarization.
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
- ZenStack database activation or migration
- User-facing provider/model picker
- Automatic speaker diarization
- Authentication or per-user memory
- Production deployment
- Large UI redesign
- Secret, environment, or credential inspection/reporting

## Roadmap Position

Phase 1 is this document: freeze the current working state so future changes do not restart or replace the app.

Next roadmap phase should be Phase 2: stabilize runtime flow so capture never waits for translation and input is never lost.
