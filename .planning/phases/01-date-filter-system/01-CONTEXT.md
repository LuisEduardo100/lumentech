# Phase 1: Date Filter System - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Consultants can filter the entire dashboard by date range using predefined periods (Esta semana, Mes atual, Mes passado) or a custom date range picker. The filter is global — when applied, all cards, charts, and metrics update. "Mes atual" is the default on page load.

</domain>

<decisions>
## Implementation Decisions

### Filter Placement & Style
- **D-01:** Pill button group (Esta semana, Mes atual, Mes passado, Personalizado) using the same visual style as the existing category tabs (GERAL|ORGLIGHT|PERFIL)
- **D-02:** Placed in the header bar, immediately after the category tabs

### Custom Date Range Picker
- **D-03:** Clicking "Personalizado" opens a popover calendar dropping down from the pill, with start/end date inputs and an "Aplicar" button

### Filter-Data Interaction
- **D-04:** Frontend-only filtering — filter the cached rows in memory via `calculateMetrics()`. No backend changes needed. The dataset is small enough to hold in browser memory (all rows already loaded via WebSocket).

### Date Field Logic
- **D-05:** Split by row type — `data_emissao` for orcado rows (status != GANHO and != PERDIDO), `data_fechamento` for fechado rows (status == GANHO). Charts and map follow the same split logic per row type.

### Default Behavior & Persistence
- **D-06:** "Mes atual" is auto-selected and visually highlighted on page load. Filter state persists across Dashboard/Negocios view switches (same pattern as existing category filter).

### Active Filter Indicator
- **D-07:** Active filter shown via pill highlight only (no separate chip). For custom range, the "Personalizado" pill label changes to display the date range (e.g., "01/03 - 31/03").

### Claude's Discretion
- Date picker library choice (e.g., react-datepicker, custom with date-fns, or lightweight alternative)
- Exact popover positioning and dismiss behavior
- How the filter interacts with the existing state (UF) map click filter — stacking vs resetting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — FILT-01 through FILT-05 define the filter requirements for this phase

### Roadmap
- `.planning/ROADMAP.md` — Phase 1 success criteria (5 items) define what must be TRUE

### Existing Code (key files to understand)
- `frontend/src/App.tsx` — Root component with existing category/state filtering, KPI card rendering, header layout
- `frontend/src/lib/dashboardLogic.ts` — `calculateMetrics()` function that needs date range parameter; already uses `date-fns`
- `frontend/src/lib/types.ts` — `SheetRow` interface with `data_emissao` and `data_fechamento` fields
- `frontend/src/components/KPICard.tsx` — KPI card component (no changes expected, just data flow)
- `frontend/src/hooks/useDashboardChannel.ts` — WebSocket hook providing `data.rows` (no changes needed)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `date-fns` already installed and used in `dashboardLogic.ts` for `isSameDay`, `isSameMonth`, `parseISO`
- `parseBrDate()` helper in `dashboardLogic.ts` handles DD/MM/YYYY parsing
- Category tab button group in `App.tsx` (lines 184-204) — exact same pill/tab pattern to replicate for date filter
- Existing state filter chip in header (lines 211-218) — reference for dismissible filter UI patterns

### Established Patterns
- State management via `useState` in App.tsx — date filter state follows the same pattern
- Row filtering pipeline: `data.rows` -> category filter -> state filter -> `calculateMetrics()` — date filter inserts into this pipeline
- Tailwind utility classes with dark mode conditional: `isDark ? 'bg-slate-...' : 'bg-white'`
- Theme-aware styling throughout all components

### Integration Points
- `App.tsx` header section (line 154) — date filter pills insert after category tabs div
- `calculateMetrics(rows)` call sites (lines 51, 54) — need to pass date-filtered rows
- The `filteredRows` variable (line 45) — date filter applies before or alongside this existing filter chain

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-date-filter-system*
*Context gathered: 2026-04-06*
