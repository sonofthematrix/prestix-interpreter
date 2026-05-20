---
source: Context7 API + npm registry
library: TanStack Query
package: '@tanstack/react-query'
topic: install and import guidance for Next.js App Router TypeScript
fetched: 2026-05-19T00:00:00Z
official_docs: https://tanstack.com/query/latest/docs/framework/react/overview
---

- Install: `@tanstack/react-query` (optional devtools: `@tanstack/react-query-devtools`).
- Current npm package: `@tanstack/react-query`; old `react-query` import/package is legacy and not standard for v5.
- Import pattern:
  - `import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'`
  - `import { ReactQueryDevtools } from '@tanstack/react-query-devtools'`
- Next.js App Router note: provider file must be a client component (`'use client'`) because `QueryClientProvider` uses React context.
- Compatibility signals:
  - npm peer dependency: `react: ^18 || ^19`
  - package is ESM/CJS exported with bundled types.
- Standard style check:
  - Standard now: scoped imports from `@tanstack/react-query`.
  - Non-standard / old: imports from `react-query`.
