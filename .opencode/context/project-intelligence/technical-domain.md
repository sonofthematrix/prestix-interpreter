<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.2 | Updated: 2026-05-19 -->

# Technical Domain

**Purpose**: Tech stack and patterns for Prestix — a voice-driven translating personal assistant.
**Last Updated**: 2026-05-19

## What This Is
A **voice-first personal assistant** with translation capabilities. Root `/` redirects to the interpreter.
The venue/promoter/booking schema in `zenstack/` is scaffolding — ignore it.

## Primary Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, webpack) |
| Language | TypeScript 5.3+ (strict) |
| Styling | Tailwind CSS 3 + Radix UI |
| Runtime | Bun 1.0+ |
| Testing | Vitest (unit), Playwright (e2e) |
| Voice | Whisper (`.venv-whisper/`) |

## Active Code

### Interpreter Core (`src/lib/interpreter/`)
| File | Role |
|------|------|
| `uiEntry.ts` | Primary route; root `/` redirects here |
| `providerRouter.ts` | Routes requests to AI providers |
| `promptComposer.ts` | Builds system/user prompts |
| `translatorToggle.ts` | Language switching / translation |
| `browserVoice.ts` | Browser voice capture & playback |
| `voiceDock.ts` | Voice UI dock |
| `voiceFallback.ts` | Fallback when voice unavailable |
| `voicePresence.ts` | Voice activity detection |
| `controlRoomUi.ts` | Main control room interface |
| `guardrails.ts` | Content safety |
| `conversationStore.ts` | Conversation state |
| `learningStore.ts` | Learning/adaptation |
| `assistantGreeting.ts` | Greeting logic |
| `assistantUx.ts` | UX behaviors |
| `branding.ts` | Product metadata |

### Interpreter API (`src/app/api/interpreter/`)
- `route.ts` — main endpoint
- `transcribe/route.ts` — Whisper transcription
- `voice/route.ts` — voice processing
- `feedback/route.ts` — user feedback

### Test files
All in `src/lib/interpreter/*.test.ts` — Vitest, node environment. Run with:
```
bun run test -- src/lib/interpreter/browserVoice.test.ts
```

## Code Patterns

### Component
```typescript
'use client';
import { cn } from '@/lib/utils';

interface Props { title: string; className?: string; }

export function Card({ title, className }: Props) {
  return <div className={cn('rounded-lg border p-4', className)}>{title}</div>;
}
```

**Rules**: Named exports, `interface Props`, `cn()` for classes, Radix primitives.

### Cinematic HUD
The layout uses cinematic fonts (Orbitron, Share Tech Mono) for a voice-assistant aesthetic.
See `src/app/layout.tsx` for font setup.

## Naming
| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | voice-dock.tsx, prompt-composer.ts |
| Components | PascalCase | VoiceDock, TranslatorToggle |
| Functions | camelCase | getCurrentUser, createClient |
| Tests | *.test.ts (Vitest), *.spec.ts (Playwright) | |

## Standards
- TypeScript strict mode
- Prettier: 4 spaces, single quotes, print width 120
- Named exports over default exports
- Build ignores TS errors — run `bun run type-check` separately
- `'use client'` only where needed

## Key Commands
```
bun run dev                    # Start on :3001 (webpack)
bun run dev:3000               # Start on :3000
bun run test -- path/to/file   # Single Vitest file
bun run test:e2e:promoter      # Focused Playwright suite
bun run type-check             # Real TS validation (build skips it)
```

## 📂 Codebase References
**Interpreter**: `src/lib/interpreter/` (core), `src/app/api/interpreter/` (API)
**UI**: `src/components/interpreter/`, `src/app/voice/`, `src/app/layout.tsx`
**Config**: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`
**Voice**: `.venv-whisper/` (Python transcription)
**Auth**: `src/lib/auth.ts`, `src/app/auth/v1/` (SIWE wallet login)
