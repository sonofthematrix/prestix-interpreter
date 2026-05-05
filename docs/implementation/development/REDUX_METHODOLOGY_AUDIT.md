# Redux / ONE SOURCE OF TRUTH — Audit Report

**Date:** 2026-03-06  
**Scope:** Hub layout (mobile sidebar), ImageCarousel, Hub ticket detail page, useHubViewPreference.

---

## 1. Hub Layout (`src/app/hub/layout.tsx`)

### State

| State        | Current                    | Rule                                      | Verdict |
|-------------|----------------------------|-------------------------------------------|--------|
| `sidebarOpen` | `useState(false)` (local) | UI state: dialogs/sidebars in UI store    | **Violation** |

**Requirement:** “State must be centralized in domain stores… **UI stores (forms, dialogs)**.”  
The mobile hub sidebar is a UI overlay; its open/closed state should live in a single place (e.g. Redux `uiSlice`) with one write path, not in local component state.

**Recommendation:** Add `hubSidebarOpen: boolean` to `uiSlice`, export `setHubSidebarOpen`, and have the hub layout read/open/close from the store. Keeps parity with `drawerOpen` (main NavDrawer).

**Fixed (2026-03-06):** `hubSidebarOpen` and `setHubSidebarOpen` added to `uiSlice`; hub layout now uses `useAppSelector(s => s.ui.hubSidebarOpen)` and `dispatch(setHubSidebarOpen(open))`.

---

## 2. ImageCarousel (`src/components/ui/image-carousel.tsx`)

### State

| State           | Current     | Rule                                      | Verdict   |
|----------------|-------------|-------------------------------------------|-----------|
| `currentIndex` | useState    | Local presentational UI                   | **OK**    |
| `isHovered`    | useState    | Local presentational UI                   | **OK**    |
| `imageLoaded`  | useState    | Local presentational UI                   | **OK**    |
| `allImagesFit` | useState    | Local derived from DOM (layout)           | **OK**    |

**Rationale:** These are not application-level or shared; they are component-scoped UI (slide index, hover, load flags, layout fit). Methodology allows local state for purely presentational UI.

### Effects

| Effect            | Deps     | Purpose                          | Rule                                      | Verdict   |
|------------------|----------|----------------------------------|-------------------------------------------|-----------|
| ResizeObserver   | `[]`     | Mount-time setup/cleanup         | Allowed: mount-time init and cleanup      | **OK**    |
| Auto-play        | `[autoPlay, autoPlayInterval, isHovered, goToNext]` | UI timer (slide advance) | No periodic refresh of **session/wallet/user** data | **OK**    |

**ResizeObserver:** Single setup on mount, cleanup on unmount; uses ref for latest `images.length`. Compliant.

**Auto-play:** Drives carousel animation only. Methodology forbids periodic refresh of auth/wallet/user data, not UI animation timers. **OK.**

---

## 3. Hub Event Ticket Detail Page (`src/app/hub/events/tickets/[id]/page.tsx`)

### State

| State            | Current     | Rule                          | Verdict     |
|-----------------|-------------|-------------------------------|-------------|
| `ticket`        | useState    | Entity data                   | ~~**Violation**~~ **Fixed** |
| `loading`      | useState    | Request status               | ~~**Violation**~~ **Fixed** |
| `error`        | useState    | Request status               | ~~**Violation**~~ **Fixed** |
| `lightboxOpen` | useState    | Local UI (lightbox)           | **OK**      |
| `lightboxIndex`| useState    | Local UI (lightbox)           | **OK**      |

**Requirement:** “Never create local component state for **application-level data**.”  
Ticket detail is entity data; it should be loaded and held in a single source (e.g. entity/cache store or server state) and the page should read from that store, not fetch in `useEffect` and keep a local copy.

### Effects

| Effect | Deps       | Purpose              | Rule                                      | Verdict     |
|--------|------------|----------------------|-------------------------------------------|-------------|
| Fetch ticket | `[ticketId]` | Data fetching      | Forbidden: useEffect for data fetching    | ~~**Violation**~~ **Fixed** |

**Fixed (2026-03-06):** Introduced `hub-ticket-store` (Zustand) and single bridge `HubTicketDetailFetcher`. Store holds `ticket` / `loading` / `error`; `fetchTicket(ticketId)` is the single write path. The fetcher runs one `useEffect([ticketId])` to call `fetchTicket`; the page only reads from the store and no longer holds ticket/loading/error or fetches in the page.

---

## 4. useHubViewPreference (`src/hooks/useHubViewPreference.ts`)

### Effect

| Effect        | Deps              | Purpose                                  | Rule                                  | Verdict   |
|---------------|-------------------|------------------------------------------|---------------------------------------|-----------|
| Sync view mode | `[pathname, dispatch]` | Router pathname → Redux `hubListViewMode` | Forbidden: useEffect with deps for state sync | **Gray area** → **Documented** |

**Observation:** The hook is the only place that writes `hubListViewMode` from the router; it acts as the single bridge from pathname to store. The rule forbids “useEffect with dependency arrays for **state synchronization**”. Syncing external source (router) into the store is exactly that.

**Decision (2026-03-06):** Kept as-is and **documented as the single router → store bridge**. JSDoc in the hook and this audit state that this is the designated sync point; pathname is the external source and the hook is the one bridge. Alternative (pathname subscription that dispatches on change) remains optional for future refactor.

---

## Summary

| Item                    | Status      | Action |
|-------------------------|------------|--------|
| Hub layout sidebar      | **Fixed**  | Now uses Redux `ui.hubSidebarOpen` + `setHubSidebarOpen`. |
| ImageCarousel           | Compliant  | None. |
| Ticket detail page      | **Fixed**  | `hub-ticket-store` + `HubTicketDetailFetcher`; page reads ticket/loading/error from store only. |
| useHubViewPreference    | **Documented** | Documented as the single router→store bridge; optional pathname-subscription refactor later. |

---

## References

- `.cursor/rules/redux-one-source-of-truth.mdc`
- `.cursor/commands/redux-include.md`
