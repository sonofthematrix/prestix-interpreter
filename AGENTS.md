# AGENTS.md

## Commands
- Use Bun for root work despite the checked-in `package-lock.json`; `package.json` declares `packageManager: bun@1.0.0`.
- `bun run dev` starts Next on `http://localhost:4318` with webpack; use `bun run dev:3000` only when a 3000 server is specifically needed.
- `bun run build` runs `next build --webpack`, but `next.config.mjs` ignores TypeScript build errors, so run `bun run type-check` for real TS validation.
- Run a focused Vitest file with `bun run test -- src/path/to/file.test.ts`; Vitest uses `src/__tests__/setup.ts` and a node environment.
- Run the focused Playwright suite with `bun run test:e2e:promoter`; Playwright targets `tests/e2e`, base URL `http://localhost:4318`, and starts `npm run dev` if no server is reused.
- Root `bun run lint` is `eslint . --ext .ts,.tsx`; verify the root package script before assuming package-level lint behavior.

## Architecture
- This is a Next App Router app under `src/app`; root `/` redirects via `PRIMARY_INTERPRETER_ROUTE` from `src/lib/interpreter/uiEntry.ts`, so older README auth-module copy instructions are stale.
- API routes live in `src/app/api/*`; `handlers/` contains legacy implementations imported by app routes and is not a standalone Vercel `api/` directory.
- The central ZenStack RPC endpoint is `src/app/api/model/[...zenstack]/route.ts`, which creates a user-scoped DB client for access-control rules.
- Local packages are independent package roots: `packages/smart-contracts` is Hardhat/Solidity, and `packages/reown-appkit-module` has its own `package.json` and scripts.

## Database And Schema
- `zenstack/schema.zmodel` is the schema source of truth; do not hand-edit generated `zenstack/schema.ts`, `zenstack/models.ts`, `zenstack/input.ts`, or `zenstack/~schema.prisma`.
- After schema edits, run `bun run zen:generate`; apply local DB changes with `bun run db:push` (`zen db push dev --accept-data-loss`).
- Runtime DB access should import `createClient` from `src/lib/db.ts` and pass the current user when policies matter.
- `src/lib/prisma.ts` exports a ZenStack-backed `prisma` alias only for seed scripts, CLI tools, and system-user lookup; do not use it in API routes, server actions, or RSCs.
- Local PostgreSQL URLs auto-disable SSL; remote DBs default to SSL unless `POSTGRES_SSL=false` or `sslmode=disable` is set.

## Repo Gotchas
- Several docs still mention `http://localhost:3000` and `.env.example`; the current root has no `.env.example`, and the default dev port is 4318.
- `next.config.mjs` contains required Reown/AppKit webpack aliases and TokenUtil replacement; avoid removing them as generic cleanup.
- Production Docker loads `.env.local` and `.env.production`, exposes port 3000, and depends on Redis; Postgres is present but optional/commented from the app dependency list.
- Prettier uses 4 spaces, single quotes, and print width 120.

## Smart Contracts
- Work inside `packages/smart-contracts` for Solidity tasks; compile with `bun run compile` and run one contract test with `bun run test -- test/path.spec.ts`.
- Hardhat loads `packages/smart-contracts/.env` first, then `.env.local` with override; deploy accounts prefer `TGR_DEPLOY_PRVT_KEY`, then `TGR_DEPLOY_SEED_PHRASE`, then `PRIVATE_KEY`.
- Sepolia RPC resolution prefers `SEPOLIA_URL`, then `SEPOLIA_RPC_URL`, then `NEXT_PUBLIC_SEPOLIA_RPC_URL`, then Infura/Alchemy keys, then a public fallback.
