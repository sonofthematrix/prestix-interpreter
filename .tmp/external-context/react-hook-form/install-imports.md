---
source: Context7 API + npm registry
library: React Hook Form
package: react-hook-form
topic: install and import guidance for Next.js App Router TypeScript
fetched: 2026-05-19T00:00:00Z
official_docs: https://react-hook-form.com/docs
---

- Install: `react-hook-form`
- Import pattern:
  - `import { useForm, Controller, FormProvider, useFormContext, type SubmitHandler } from 'react-hook-form'`
- TypeScript pattern:
  - `useForm<FormValues>()`
  - `Controller` is standard for controlled UI primitives/components.
- Compatibility signals:
  - npm peer dependency: `react: ^16.8 || ^17 || ^18 || ^19`
  - package exports types and a `react-server` build, but interactive forms/hooks belong in client components in App Router.
- Standard style check:
  - Standard: all imports from `'react-hook-form'`.
  - TS2307 usually means the package is missing, not that the import syntax is unusual.
