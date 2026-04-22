---
phase: 260422-hhr-quick
plan: "01"
subsystem: frontend
tags: [kpi, metrics, filter, deals-view, react]
dependency_graph:
  requires: []
  provides: [count-and-ticket-medio-on-kpi-cards, status-pill-filter-in-deals-view]
  affects: [frontend/src/lib/types.ts, frontend/src/lib/dashboardLogic.ts, frontend/src/components/KPICard.tsx, frontend/src/views/DealsView.tsx, frontend/src/App.tsx]
tech_stack:
  added: []
  patterns: [optional-props-rendering, composed-filter-state]
key_files:
  modified:
    - frontend/src/lib/types.ts
    - frontend/src/lib/dashboardLogic.ts
    - frontend/src/components/KPICard.tsx
    - frontend/src/views/DealsView.tsx
    - frontend/src/App.tsx
decisions:
  - count uses rows.length (no date-window) so it matches the total amount displayed on the card
  - StatusFilter type defined inline in DealsView component scope for co-location with state
metrics:
  duration: "2 minutes"
  completed: "2026-04-22"
  tasks_completed: 3
  files_modified: 5
---

# Phase 260422-hhr Plan 01: Adicionar Contagem de Negócios e Ticket Médio — Summary

**One-liner:** Deal count and average ticket (ticket médio) added to both KPI cards, plus a four-pill status filter bar in the Negócios (DealsView) table.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend metrics types + calculation with count and ticketMedio | f8fbb8c | types.ts, dashboardLogic.ts |
| 2 | Surface count + ticketMedio on KPICard and wire from App.tsx | 1e461a6 | KPICard.tsx, App.tsx |
| 3 | Add status quick-filter pills to DealsView | a0ab7b8 | DealsView.tsx |

## What Was Built

### Task 1 — Types and Logic

Extended `DashboardMetrics.volumeFechado` and `volumeOrcado` in `types.ts` with two new fields: `count: number` and `ticketMedio: number`.

In `dashboardLogic.ts`, updated `calculateMetrics` to:
- Cache `sum(fechadoRows)` in `fechadoTotal` (avoids double iteration)
- Set `count: fechadoRows.length` and `ticketMedio: fechadoTotal / count` (guarded against division-by-zero)
- Same pattern for `orcadoRows`

Since `calculateMetrics` receives already-filtered rows from `App.tsx` (category + date + UF applied upstream), count and ticketMedio automatically react to all existing filters.

### Task 2 — KPICard Component + App.tsx wiring

Added optional `count?: number` and `ticketMedio?: number` props to `KPICardProps`. The component renders a new row in the sub-metrics section only when `count !== undefined` (count=0 is renderable). Uses existing `formatCurrency`, `valueColor`, and `subHeaderLabelColor` classes for consistency with "No dia:" / "No mês:" rows.

Both `KPICard` instances in `App.tsx` now pass `count` and `ticketMedio` from `kpiMetrics`.

### Task 3 — DealsView Status Pill Filter

Added `StatusFilter` type and `statusFilter` state (default `'TODOS'`) to `DealsView`.

`filteredRows` now composes two conditions: search match AND status match. The toolbar gained a pill group between the search input and the NOVO PEDIDO button. Active pills use `getStatusColor` for semantic colors (green/red/blue); the "Todos" pill uses a neutral slate style. The footer count ("Total de N negócios listados.") updates automatically since it reads `sortedRows.length`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired from real computed metrics and live row state.

## Threat Flags

None — changes are pure frontend display/filter logic, no new network endpoints or auth paths.

## Self-Check: PASSED

All 5 modified files confirmed present. All 3 task commits (f8fbb8c, 1e461a6, a0ab7b8) confirmed in git log.
