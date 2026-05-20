---
source: Radix UI official docs + npm registry
library: Radix UI React Primitives
package: '@radix-ui/react-*'
topic: install and import guidance for selected primitives in Next.js App Router TypeScript
fetched: 2026-05-19T00:00:00Z
official_docs: https://www.radix-ui.com/primitives/docs/overview/introduction
---

- Radix docs recommend either:
  - unified package: `radix-ui`
  - or individual packages (still officially documented and very common in TS/Next shared UI code).
- For the components you listed, install the individual packages:
  - `@radix-ui/react-accordion`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-radio-group`
  - `@radix-ui/react-scroll-area`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-slider`
  - `@radix-ui/react-switch`
  - `@radix-ui/react-tooltip`
- Standard import pattern for individual packages:
  - `import * as Accordion from '@radix-ui/react-accordion'`
  - `import * as Progress from '@radix-ui/react-progress'`
  - `import * as RadioGroup from '@radix-ui/react-radio-group'`
  - `import * as ScrollArea from '@radix-ui/react-scroll-area'`
  - `import * as Separator from '@radix-ui/react-separator'`
  - `import * as Slider from '@radix-ui/react-slider'`
  - `import * as Switch from '@radix-ui/react-switch'`
  - `import * as Tooltip from '@radix-ui/react-tooltip'`
- Alternative documented import style with unified package:
  - `import { Accordion, Slider, Tooltip } from 'radix-ui'`
- Compatibility signals:
  - official docs target React primitives; npm peer dependencies for packages like accordion include React/React DOM `^16.8 || ^17 || ^18 || ^19 || ^19-rc`.
  - interactive primitives used in App Router wrappers should be client components.
- Standard style check:
  - In most Next/TypeScript component libraries, the scoped `@radix-ui/react-*` imports above are the standard/common style.
  - `radix-ui` unified imports are documented, but less common in existing shadcn-style repos.
