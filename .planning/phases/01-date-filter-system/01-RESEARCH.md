# Phase 1: Date Filter System - Research

**Researched:** 2026-04-06
**Domain:** React frontend date filtering with date-fns v2, Tailwind CSS UI patterns
**Confidence:** HIGH

## Summary

Phase 1 adds a global date filter to the existing React dashboard. The architecture is entirely frontend: filter state lives in `App.tsx` via `useState`, date math uses the already-installed `date-fns` v2.30.0, and filtering slots into the existing row pipeline before `calculateMetrics()` is called. No backend changes, no new package installs are required.

The filter UI is a pill button group matching the existing category tabs (GERAL|ORGLIGHT|PERFIL). Four presets — Esta semana, Mês atual, Mês passado, Personalizado — are rendered in the header immediately after the category tabs. Clicking "Personalizado" opens a custom popover with two HTML `<input type="date">` fields and an "Aplicar" button. This avoids adding a third-party date picker library (no dayjs conflict, no bundle increase, no `@tailwindcss/forms` dependency).

The date field split is locked by D-05: `data_emissao` for orcado rows (non-GANHO, non-PERDIDO), `data_fechamento` for fechado rows (GANHO status). The existing `parseBrDate()` helper handles DD/MM/YYYY parsing. `isWithinInterval`, `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, and `subMonths` are all confirmed present in the installed date-fns v2.30.0.

**Primary recommendation:** Implement entirely in the frontend with date-fns v2 functions already installed. Use native `<input type="date">` inside a custom Tailwind popover for the custom range picker — no new npm dependencies needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Pill button group (Esta semana, Mes atual, Mes passado, Personalizado) using the same visual style as the existing category tabs (GERAL|ORGLIGHT|PERFIL)
- **D-02:** Placed in the header bar, immediately after the category tabs
- **D-03:** Clicking "Personalizado" opens a popover calendar dropping down from the pill, with start/end date inputs and an "Aplicar" button
- **D-04:** Frontend-only filtering — filter the cached rows in memory via `calculateMetrics()`. No backend changes needed.
- **D-05:** Split by row type — `data_emissao` for orcado rows (status != GANHO and != PERDIDO), `data_fechamento` for fechado rows (status == GANHO). Charts and map follow the same split logic per row type.
- **D-06:** "Mes atual" is auto-selected and visually highlighted on page load. Filter state persists across Dashboard/Negocios view switches (same pattern as existing category filter).
- **D-07:** Active filter shown via pill highlight only (no separate chip). For custom range, the "Personalizado" pill label changes to display the date range (e.g., "01/03 - 31/03").

### Claude's Discretion

- Date picker library choice (e.g., react-datepicker, custom with date-fns, or lightweight alternative)
- Exact popover positioning and dismiss behavior
- How the filter interacts with the existing state (UF) map click filter — stacking vs resetting

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILT-01 | Dashboard possui filtro global de data que afeta todos os cards | Date filter state in App.tsx flows into calculateMetrics() via filtered rows — covered by D-04 row pipeline insertion |
| FILT-02 | Filtro predefinido "Esta semana" disponível | `startOfWeek(now, {weekStartsOn: 0})` + `endOfWeek(now, {weekStartsOn: 0})` from date-fns v2 — confirmed installed |
| FILT-03 | Filtro predefinido "Mês atual" disponível (padrão) | `startOfMonth(now)` + `endOfMonth(now)` from date-fns v2 — confirmed installed; set as default in useState |
| FILT-04 | Filtro predefinido "Mês passado" disponível | `startOfMonth(subMonths(now, 1))` + `endOfMonth(subMonths(now, 1))` — confirmed installed |
| FILT-05 | Filtro de período customizado com date range picker | Native `<input type="date">` fields in a custom Tailwind popover — no new package dependency |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| date-fns | 2.30.0 (installed) | Date range calculation and comparison | Already in project; provides all needed functions |
| React | 18.2.0 (installed) | Component and state management | Existing stack |
| Tailwind CSS | 3.3.5 (installed) | Pill and popover styling | Existing stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.292.0 (installed) | Calendar icon for Personalizado pill | Already used in App.tsx for Wifi/theme icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="date">` | react-tailwindcss-datepicker | External lib adds dayjs dependency, requires @tailwindcss/forms plugin — unnecessary overhead for 2 inputs |
| Native `<input type="date">` | react-datepicker | Adds ~70KB bundle, not Tailwind-native, adds its own CSS |
| Custom popover (useState + useRef) | Radix UI Popover | Radix not installed; overkill for a single popover use case |

**Installation:** No new packages needed. All required functionality is available from the installed `date-fns` v2.30.0.

---

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── App.tsx                         # Add dateFilter state + filtering logic
├── lib/
│   ├── dashboardLogic.ts           # Add filterRowsByDate() utility function
│   └── types.ts                    # Add DateFilter type
└── components/
    └── DateFilterBar.tsx           # New: pill group + custom popover
```

### Pattern 1: Date Filter State in App.tsx

**What:** A single `dateFilter` state object drives all date filtering. Presets compute their ranges lazily (at filter time, not at state time) to avoid stale dates across midnight.

**When to use:** Matches the existing `category` and `selectedState` pattern — all filter state in App.tsx, passed down to the row pipeline.

**Example:**
```typescript
// Source: matches existing App.tsx pattern (lines 18-20)
type DateFilterType = 'esta_semana' | 'mes_atual' | 'mes_passado' | 'personalizado';

interface DateFilter {
    type: DateFilterType;
    customStart?: Date;
    customEnd?: Date;
}

// Default: "Mês atual"
const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'mes_atual' });
```

### Pattern 2: Row Filtering Pipeline Insert

**What:** Date filtering happens after category filter, before `calculateMetrics()`. A `filterRowsByDate()` function in `dashboardLogic.ts` applies the split logic from D-05.

**When to use:** Consistent with how `filteredRows` is constructed today (lines 37-47 of App.tsx).

**Example:**
```typescript
// Source: dashboardLogic.ts pattern (existing parseBrDate, isWithinInterval from date-fns v2)
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export function filterRowsByDate(rows: SheetRow[], filter: DateFilter): SheetRow[] {
    const { start, end } = resolveDateRange(filter); // computes range from preset or custom
    if (!start || !end) return rows; // safety guard

    return rows.filter(row => {
        const isGanho = row.status?.toUpperCase() === 'GANHO';
        // D-05: fechado rows use data_fechamento, orcado rows use data_emissao
        const dateStr = isGanho ? row.data_fechamento : row.data_emissao;
        if (!dateStr) return false;
        const date = parseBrDate(dateStr);
        return isWithinInterval(date, { start: startOfDay(start), end: endOfDay(end) });
    });
}

function resolveDateRange(filter: DateFilter): { start: Date; end: Date } | { start: null; end: null } {
    const now = new Date();
    switch (filter.type) {
        case 'esta_semana':
            return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
        case 'mes_atual':
            return { start: startOfMonth(now), end: endOfMonth(now) };
        case 'mes_passado': {
            const lastMonth = subMonths(now, 1);
            return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        }
        case 'personalizado':
            if (!filter.customStart || !filter.customEnd) return { start: null, end: null };
            return { start: filter.customStart, end: filter.customEnd };
    }
}
```

### Pattern 3: Pill Button Group (Matching Existing Category Tabs)

**What:** A `DateFilterBar` component renders four pill buttons using the exact same Tailwind classes as the category tabs (lines 184-204 in App.tsx). Active pill gets the highlight class; inactive pills get the muted hover class.

**When to use:** D-01 locks this visual style. Reuse existing class patterns for consistency.

**Example:**
```typescript
// Source: matches App.tsx lines 184-204 category tab pattern
// Active pill class (matching GERAL tab when selected):
// isDark ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-600 text-white shadow-md'
// Inactive pill class:
// isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
```

### Pattern 4: Custom Date Range Popover

**What:** When "Personalizado" is clicked, a `<div>` popover appears below the pill using absolute positioning. It contains two `<input type="date">` fields and an "Aplicar" button. Dismiss on outside click via `useRef` + `useEffect`.

**When to use:** D-03 locks this behavior. Native `<input type="date">` works cross-browser for desktop use (the project is explicitly desktop-first per CLAUDE.md).

**Example:**
```typescript
// Source: standard React click-outside dismiss pattern
const popoverRef = useRef<HTMLDivElement>(null);
useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
            setIsPopoverOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

### Pattern 5: Dynamic Pill Label for Custom Range

**What:** When a custom date range is active, the "Personalizado" pill label changes to show the formatted range: "01/03 - 31/03". This is D-07.

**Example:**
```typescript
// Source: date-fns format function (confirmed installed in date-fns v2)
import { format } from 'date-fns';

const customLabel = dateFilter.type === 'personalizado' && dateFilter.customStart && dateFilter.customEnd
    ? `${format(dateFilter.customStart, 'dd/MM')} - ${format(dateFilter.customEnd, 'dd/MM')}`
    : 'Personalizado';
```

### Anti-Patterns to Avoid

- **Computing range at setState time:** If you store `{ start: startOfMonth(now), end: endOfMonth(now) }` at the moment the user clicks, dates go stale if the tab stays open past midnight. Store the preset type, resolve the range at filter time.
- **Filtering inside `calculateMetrics()`:** Do not add date logic inside `calculateMetrics()`. The function receives pre-filtered rows. Keep separation of concerns.
- **Applying date filter to DealsView:** The date filter should only affect Dashboard KPI metrics. DealsView (`data.rows`) shows all deals unfiltered — this is the current behavior and there is no requirement to change it.
- **Resetting selectedState on date filter change:** The map's state (UF) filter and the date filter are independent. Do not clear `selectedState` when the date filter changes (Claude's Discretion area — stack them).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Week boundary calculation | Manual `new Date()` arithmetic | `startOfWeek` / `endOfWeek` from date-fns | DST edge cases, week start configuration |
| Month boundary calculation | Manual day-count math | `startOfMonth` / `endOfMonth` from date-fns | Handles leap years, 28/30/31-day months |
| "Previous month" offset | Manual month arithmetic | `subMonths` from date-fns | Handles January wrapping to December of previous year |
| Date-in-range check | Manual `date >= start && date <= end` | `isWithinInterval` from date-fns | Handles time component edge cases when combined with startOfDay/endOfDay |

**Key insight:** date-fns v2 handles all calendar arithmetic edge cases. The project already has it installed — there is no reason to write date math by hand.

---

## Common Pitfalls

### Pitfall 1: parseBrDate Returns epoch (new Date(0)) for null/empty strings

**What goes wrong:** `parseBrDate(null)` returns `new Date(0)` (epoch 1970-01-01). If `isWithinInterval` is called with this, the row will not match any modern date range, which is the correct behavior. However, rows with missing dates are silently excluded.

**Why it happens:** The existing `parseBrDate` in `dashboardLogic.ts` has `if (!dateStr) return new Date(0)` as its null guard.

**How to avoid:** In `filterRowsByDate`, check `if (!dateStr) return false` before calling `parseBrDate` to make the intent explicit and avoid reliance on the epoch sentinel value.

**Warning signs:** KPIs suddenly show 0 when switching to a preset — check for rows with null `data_fechamento` or `data_emissao`.

### Pitfall 2: `isWithinInterval` throws if start > end

**What goes wrong:** If a user sets a custom end date before the start date, `isWithinInterval` throws `RangeError: Invalid interval: start after end`.

**Why it happens:** date-fns v2 `isWithinInterval` validates the interval and throws on invalid input.

**How to avoid:** Before calling `filterRowsByDate` with a custom range, validate `customStart <= customEnd`. Show an error state in the popover if the dates are inverted. Alternatively, swap them automatically.

**Warning signs:** Dashboard goes blank / white screen when custom range is applied.

### Pitfall 3: `data_emissao` field format inconsistency

**What goes wrong:** `types.ts` documents `data_emissao` as ISO format ("yyyy-mm-dd"), but `dashboardLogic.ts` uses `parseBrDate()` which parses DD/MM/YYYY. The actual data format from Google Sheets may vary.

**Why it happens:** The type definition and the parsing logic were written independently. The existing `parseBrDate` has a fallback to `parseISO` for non-DD/MM/YYYY strings.

**How to avoid:** Reuse the existing `parseBrDate()` helper — it already handles both formats via the ISO fallback. Do not introduce a second parsing path.

**Warning signs:** Some rows always excluded from date filter regardless of range.

### Pitfall 4: Header layout overflow from adding filter pills

**What goes wrong:** The header already has logo + navigation + status on a single row. Adding 4 more pills may cause horizontal overflow on smaller desktop screens.

**Why it happens:** CLAUDE.md constraint: "Everything must fit on screen without scrolling."

**How to avoid:** The `DateFilterBar` should only render when `view === 'dashboard'` (same as the category tabs — see App.tsx line 183). Consider `flex-wrap` or abbreviated pill labels (`Semana`, `Mês`, `Anterior`, `Custom`) if overflow occurs.

**Warning signs:** Header wraps to two rows on 1280px wide screens.

### Pitfall 5: Popover z-index conflict with map chart

**What goes wrong:** The MapChart component is inside a `relative` container. A popover with insufficient z-index will appear behind the map.

**Why it happens:** ECharts canvas elements can sit above absolutely positioned DOM elements if z-index is not set.

**How to avoid:** Set `z-50` or `z-[100]` on the popover `<div>`. The existing state filter indicator already uses `z-10`.

---

## Code Examples

Verified patterns from the installed codebase:

### date-fns v2 functions confirmed installed (verified via node_modules)
```typescript
// All confirmed present in frontend/node_modules/date-fns/
import {
    isWithinInterval,  // range check
    startOfWeek,       // week boundary
    endOfWeek,         // week boundary
    startOfMonth,      // month boundary
    endOfMonth,        // month boundary
    startOfDay,        // normalize time to 00:00:00
    endOfDay,          // normalize time to 23:59:59
    subMonths,         // previous month
    format             // date formatting for pill label
} from 'date-fns';
```

### Existing category tab pill (App.tsx lines 184-204) — exact pattern to replicate
```typescript
// Active state class pattern from App.tsx:
// Geral active: isDark ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-600 text-white shadow-md'
// Inactive: isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'

// Container class from App.tsx line 184:
// `flex items-center p-1 rounded-lg border transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`
```

### Existing row filter pipeline (App.tsx lines 37-54)
```typescript
// Current pipeline — date filter inserts here:
const categoryRows = data.rows.filter(r => { /* category logic */ });
// NEW: const dateFilteredRows = filterRowsByDate(categoryRows, dateFilter);
const filteredRows = selectedState
    ? categoryRows.filter(r => r.estado === selectedState)  // → use dateFilteredRows
    : categoryRows;                                          // → use dateFilteredRows
const mapMetrics = calculateMetrics(categoryRows);  // map always uses all dates? TBD per D-05
const kpiMetrics = calculateMetrics(filteredRows);  // → use date+state filtered rows
```

### Native date input for popover (no library needed)
```typescript
// HTML5 date input, desktop-first project — no library dependency
<input
    type="date"
    value={customStart ? format(customStart, 'yyyy-MM-dd') : ''}
    onChange={e => setCustomStart(e.target.value ? new Date(e.target.value) : undefined)}
    className={`px-2 py-1 rounded border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `isWithinRange` | `isWithinInterval` | date-fns v2.0.0 | API renamed; takes `{start, end}` object |
| Two separate date arguments | Single `interval` object parameter | date-fns v2.0.0 | `isWithinInterval(date, { start, end })` |

**Deprecated/outdated:**
- `isWithinRange`: Removed in date-fns v2. The installed version (2.30.0) uses `isWithinInterval` — confirmed.

---

## Open Questions

1. **Does the map (MapChart) respect the date filter?**
   - What we know: D-05 says "Charts and map follow the same split logic per row type." Currently `mapMetrics = calculateMetrics(categoryRows)` uses unfiltered rows.
   - What's unclear: D-04 says filter is global — does "all cards" in FILT-01 include the map visualization, or just KPI number cards?
   - Recommendation: Apply the date filter to map rows as well (makes "global" mean global). The planner should treat map metrics as also receiving date-filtered rows.

2. **Does the date filter apply in DealsView (Negócios tab)?**
   - What we know: FILT-01 says "all cards". DealsView shows a table of deals, not KPI cards.
   - What's unclear: No requirement explicitly mentions DealsView date filtering.
   - Recommendation: Do NOT filter DealsView — it shows the full deal list regardless of date filter. The filter is dashboard-only. The planner should keep `rows={data.rows}` in DealsView unchanged.

3. **Week start day for "Esta semana"**
   - What we know: Brazil week typically starts on Sunday (weekStartsOn: 0) but some business contexts use Monday (weekStartsOn: 1).
   - What's unclear: No decision was made in CONTEXT.md.
   - Recommendation: Default to Sunday (weekStartsOn: 0) as this is the standard calendar week in Brazil.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build | ✓ | v24.14.1 | — |
| npm | Package management | ✓ | 11.11.0 | — |
| TypeScript (tsc) | Type checking | ✓ | via node_modules | — |
| date-fns | Date range logic | ✓ | 2.30.0 | — |
| Tailwind CSS | Pill/popover styling | ✓ | 3.3.5 | — |
| lucide-react | Calendar icon | ✓ | 0.292.0 | Any text label |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

Step 2.6: No external dependencies beyond already-installed frontend packages. Phase is purely frontend code changes.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no vitest.config.*, jest.config.*, or test files found |
| Config file | None — must be created in Wave 0 |
| Quick run command | `cd frontend && npx vitest run --reporter=verbose` (after Wave 0 setup) |
| Full suite command | `cd frontend && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILT-01 | filterRowsByDate() returns subset of rows matching date range | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ Wave 0 |
| FILT-02 | "Esta semana" preset returns rows within current week boundaries | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ Wave 0 |
| FILT-03 | "Mês atual" preset is default and returns current month rows | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ Wave 0 |
| FILT-04 | "Mês passado" preset returns rows from prior month | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ Wave 0 |
| FILT-05 | Custom range filters rows within supplied start/end dates | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd /home/luis-eduardo/sysled-projects/lumentech/frontend && npx vitest run src/lib/dashboardLogic.test.ts`
- **Per wave merge:** `cd /home/luis-eduardo/sysled-projects/lumentech/frontend && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/vitest.config.ts` — vitest configuration file
- [ ] `frontend/src/lib/dashboardLogic.test.ts` — unit tests for `filterRowsByDate()` covering all 5 presets (FILT-01 through FILT-05), including D-05 split logic and edge cases (null dates, inverted interval)
- [ ] Framework install: `cd frontend && npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom`

---

## Project Constraints (from CLAUDE.md)

The planner must verify all tasks comply with these directives:

| Constraint | Directive | Impact on Phase 1 |
|------------|-----------|-------------------|
| Tech stack | Must use existing Elixir/Phoenix + React stack | No new backend. React + date-fns only. |
| Layout | Everything must fit on screen without scrolling | DateFilterBar must not cause header overflow |
| Data source | Google Sheets remains the data source | No data source changes needed |
| Compatibility | Must not break existing dashboard functionality | Category filter and state filter must continue working |
| No backend changes | D-04 locks frontend-only | Zero backend files touched |
| Naming: React components | PascalCase files | `DateFilterBar.tsx` |
| Naming: hook files | camelCase | N/A for this phase |
| Naming: handler functions | prefix `handle` | `handleDateFilterChange`, `handleCustomApply` |
| Error handling: tuple returns | N/A for frontend | N/A |
| Theme support | All components must respect `isDark` prop | DateFilterBar receives `isDark` from App.tsx |
| GSD workflow | Do not make direct repo edits outside a GSD workflow | Enforced by this planning process |

---

## Sources

### Primary (HIGH confidence)
- Installed `frontend/node_modules/date-fns/` — direct filesystem verification of all 8 functions (`isWithinInterval`, `startOfWeek`, `endOfWeek`, `startOfMonth`, `endOfMonth`, `startOfDay`, `endOfDay`, `subMonths`)
- `frontend/package.json` + `frontend/package-lock.json` — confirmed date-fns 2.30.0, no date picker library installed
- `frontend/src/App.tsx` — direct code read, category tab pattern lines 184-204, filter pipeline lines 37-54
- `frontend/src/lib/dashboardLogic.ts` — direct code read, `parseBrDate()` helper, `isSameMonth`/`isSameDay` usage
- `frontend/src/lib/types.ts` — `SheetRow` fields confirmed: `data_emissao: string`, `data_fechamento: string | null`
- `.planning/phases/01-date-filter-system/01-CONTEXT.md` — all locked decisions D-01 through D-07

### Secondary (MEDIUM confidence)
- [date-fns npm](https://www.npmjs.com/package/date-fns) — v2 API verified via web search, cross-referenced with installed module
- [date-fns startOfWeek (Snyk)](https://snyk.io/advisor/npm-package/date-fns/functions/date-fns.startOfWeek) — `weekStartsOn` option confirmed for v2

### Tertiary (LOW confidence)
- [react-tailwindcss-datepicker](https://github.com/onesine/react-tailwindcss-datepicker) — considered and rejected (adds dayjs dependency, requires @tailwindcss/forms)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in installed node_modules and package.json
- Architecture: HIGH — based on direct code read of App.tsx, dashboardLogic.ts, types.ts
- Pitfalls: HIGH — identified from direct code inspection of parseBrDate behavior, isWithinInterval semantics, and existing header layout
- date-fns function availability: HIGH — verified via filesystem check of node_modules directory

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable library versions, no fast-moving APIs)
