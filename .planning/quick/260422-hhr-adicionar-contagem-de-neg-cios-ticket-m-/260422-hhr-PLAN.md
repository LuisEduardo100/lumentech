---
phase: 260422-hhr-quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/lib/types.ts
  - frontend/src/lib/dashboardLogic.ts
  - frontend/src/components/KPICard.tsx
  - frontend/src/views/DealsView.tsx
  - frontend/src/App.tsx
autonomous: true
requirements:
  - QUICK-260422-01
  - QUICK-260422-02
  - QUICK-260422-03

must_haves:
  truths:
    - "VOLUME FECHADO card shows deal count and average ticket (ticket médio)"
    - "VOLUME ORÇADO card shows deal count and average ticket (ticket médio)"
    - "DealsView shows quick filter pills for status: Todos, Ganho, Em Andamento, Perdido"
    - "Clicking a status pill filters the table to only show rows with that status"
    - "Todos pill returns table to unfiltered (status) state"
    - "Deal count updates reactively when global date filter, category, or UF filter changes"
  artifacts:
    - path: "frontend/src/lib/types.ts"
      provides: "DashboardMetrics.volumeFechado/volumeOrcado with count and ticketMedio fields"
      contains: "count: number"
    - path: "frontend/src/lib/dashboardLogic.ts"
      provides: "calculateMetrics populates count (length of rows) and ticketMedio (sum/count)"
      contains: "ticketMedio"
    - path: "frontend/src/components/KPICard.tsx"
      provides: "Optional count and ticketMedio props rendered in the sub-metrics section"
      contains: "count?"
    - path: "frontend/src/views/DealsView.tsx"
      provides: "statusFilter state + pill buttons + filter application in filteredRows"
      contains: "statusFilter"
  key_links:
    - from: "frontend/src/App.tsx"
      to: "frontend/src/components/KPICard.tsx"
      via: "count and ticketMedio props on both KPICard instances"
      pattern: "count=\\{kpiMetrics\\.(volumeFechado|volumeOrcado)\\.count\\}"
    - from: "frontend/src/views/DealsView.tsx"
      to: "filteredRows computation"
      via: "statusFilter applied after searchTerm filter"
      pattern: "statusFilter"
---

<objective>
Enrich the two main KPI cards (VOLUME FECHADO and VOLUME ORÇADO) with deal count and
average ticket (ticket médio), and add a quick status filter pill bar to the
Negócios (DealsView) table.

Purpose: Give consultants at-a-glance volume breakdown (how many deals produced the
displayed amount and the average deal size), and a one-click way to slice the deals
table by status without typing in search.

Output:
- types.ts: `count` and `ticketMedio` on `volumeFechado` and `volumeOrcado`
- dashboardLogic.ts: fills those fields in `calculateMetrics`
- KPICard.tsx: renders optional count and ticketMedio in the sub-metrics area
- DealsView.tsx: renders status pill bar (Todos | Ganho | Em Andamento | Perdido) and
  filters `filteredRows` accordingly
- App.tsx: passes the new props to both KPICard instances
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@frontend/src/lib/types.ts
@frontend/src/lib/dashboardLogic.ts
@frontend/src/components/KPICard.tsx
@frontend/src/views/DealsView.tsx
@frontend/src/App.tsx

<interfaces>
<!-- Current shapes to extend. Executor should not re-explore the codebase. -->

From frontend/src/lib/types.ts (current):
```typescript
export interface DashboardMetrics {
    volumeFechado: { total: number; today: number; month: number; };
    volumeOrcado: { total: number; today: number; month: number; };
    // ...topStates/Origins/Professionals fields
}
```

From frontend/src/lib/dashboardLogic.ts (current, excerpt):
```typescript
const fechadoRows = rows.filter(r => isGanho(r.status) && r.data_fechamento);
const volumeFechado = {
    total: sum(fechadoRows),
    today: trySum(fechadoRows, r => isSameDay(parseBrDate(r.data_fechamento), now)),
    month: trySum(fechadoRows, r => isSameMonth(parseBrDate(r.data_fechamento), now))
};
const orcadoRows = rows.filter(r => !isGanho(r.status) && r.status?.toUpperCase() !== "PERDIDO");
const volumeOrcado = {
    total: sum(orcadoRows),
    today: trySum(orcadoRows, r => isSameDay(parseBrDate(r.data_emissao), now)),
    month: trySum(orcadoRows, r => isSameMonth(parseBrDate(r.data_emissao), now))
};
```

From frontend/src/components/KPICard.tsx (current props):
```typescript
interface KPICardProps {
    title: string;
    value: number;
    todayValue?: number;
    monthValue?: number;
    percent?: number;
    theme: Theme;
    className?: string;
    isActive?: boolean;
    isDark?: boolean;
}
```

From frontend/src/views/DealsView.tsx (current state + filter):
```typescript
const [searchTerm, setSearchTerm] = useState('');
const filteredRows = rows.filter(r =>
    (r.cliente?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (r.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (r.categoria?.toLowerCase() || '').includes(searchTerm.toLowerCase())
);
```

Status values used in the system (from existing code):
- "GANHO" (case-insensitive via `.toUpperCase()`)
- "EM ANDAMENTO"
- "PERDIDO"

Reuse the existing `getStatusColor` helper in DealsView for pill active-state styling.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend metrics types + calculation with count and ticketMedio</name>
  <files>frontend/src/lib/types.ts, frontend/src/lib/dashboardLogic.ts</files>
  <action>
In `frontend/src/lib/types.ts`, extend both KPI shapes on `DashboardMetrics`:

```typescript
volumeFechado: {
    total: number;
    today: number;
    month: number;
    count: number;         // NEW: number of deals contributing to `total`
    ticketMedio: number;   // NEW: total / count (0 when count === 0)
};
volumeOrcado: {
    total: number;
    today: number;
    month: number;
    count: number;
    ticketMedio: number;
};
```

In `frontend/src/lib/dashboardLogic.ts`, update `calculateMetrics`:

- For `volumeFechado`, set `count: fechadoRows.length` and
  `ticketMedio: fechadoRows.length > 0 ? sum(fechadoRows) / fechadoRows.length : 0`.
  Reuse the already-computed `sum(fechadoRows)` via a local const to avoid double
  iteration:
  ```typescript
  const fechadoTotal = sum(fechadoRows);
  const volumeFechado = {
      total: fechadoTotal,
      today: trySum(fechadoRows, r => isSameDay(parseBrDate(r.data_fechamento), now)),
      month: trySum(fechadoRows, r => isSameMonth(parseBrDate(r.data_fechamento), now)),
      count: fechadoRows.length,
      ticketMedio: fechadoRows.length > 0 ? fechadoTotal / fechadoRows.length : 0,
  };
  ```
- Do the same for `volumeOrcado` using `orcadoRows` and `sum(orcadoRows)`.

Do NOT change the behavior of any other field (`topStates*`, etc.). Do NOT touch
`parseBrDate`, `groupBy`, or `normalizeStateName`.

Rationale: `count` is plain `.length` (no date-window filtering) so it matches the
`total` amount the card displays. The app-level filters (category, date, UF) are
already applied before `calculateMetrics` is called in `App.tsx`, so `count` and
`ticketMedio` automatically react to user filters.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit</automated>
  </verify>
  <done>
- `DashboardMetrics.volumeFechado` and `volumeOrcado` have `count: number` and `ticketMedio: number` fields
- `calculateMetrics` populates both correctly, with division-by-zero guarded
- `npx tsc --noEmit` passes in `frontend/`
  </done>
</task>

<task type="auto">
  <name>Task 2: Surface count + ticketMedio on KPICard and wire from App.tsx</name>
  <files>frontend/src/components/KPICard.tsx, frontend/src/App.tsx</files>
  <action>
**In `frontend/src/components/KPICard.tsx`:**

Extend `KPICardProps` with two optional props:

```typescript
count?: number;
ticketMedio?: number;
```

Destructure them in the component signature alongside the existing props.

Render them inside the existing "Sub Metrics" block, as a new row beneath the
existing "No dia:" / "No mês:" lines in the same `.space-y-1` column. Only render
the row when `count !== undefined` (treat `count === 0` as renderable, showing
"0 negócios" and "R$ 0" — do not hide on zero).

Use the existing label/value tailwind classes (`subHeaderLabelColor`,
`valueColor`, `uppercase tracking-wide text-xs font-semibold opacity-70`,
`font-bold text-lg`) so styling stays consistent with "No dia:" / "No mês:".

Suggested markup (append as a third line in the left column `.space-y-1` div):

```tsx
{count !== undefined && (
    <div className={`flex items-center gap-2 flex-wrap ${valueColor}`}>
        <span className={`uppercase tracking-wide text-xs font-semibold opacity-70 ${subHeaderLabelColor}`}>Negócios:</span>
        <span className="font-bold text-lg">{count}</span>
        {ticketMedio !== undefined && (
            <>
                <span className={`uppercase tracking-wide text-xs font-semibold opacity-70 ml-2 ${subHeaderLabelColor}`}>Ticket médio:</span>
                <span className="font-bold text-lg">{formatCurrency(ticketMedio)}</span>
            </>
        )}
    </div>
)}
```

Reuse the existing local `formatCurrency` inside KPICard (already defined with
`maximumFractionDigits: 0`).

Do NOT add a second `ArrowUp` icon here — the count/ticket line is neutral info.
Do NOT change the card height logic; the new row sits inside the existing
sub-metrics block which already has `flex-col justify-between` on the card root.

**In `frontend/src/App.tsx`:**

Pass the new props to BOTH `KPICard` instances inside the dashboard view:

- Volume Fechado card: add
  `count={kpiMetrics.volumeFechado.count}`
  `ticketMedio={kpiMetrics.volumeFechado.ticketMedio}`
- Volume Orçado card: add
  `count={kpiMetrics.volumeOrcado.count}`
  `ticketMedio={kpiMetrics.volumeOrcado.ticketMedio}`

No other App.tsx changes.

Visual note: The card currently has `h-40` default but App.tsx passes
`className="h-full shadow-xl"` inside an `h-48` grid. The extra line fits within
`h-48`. If overflow is observed, the executor may bump the KPI row container
from `h-48` to `h-52` in App.tsx — but only if overflow is actually visible after
running the dev server. Default: do nothing to height.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit</automated>
  </verify>
  <done>
- `KPICard` accepts optional `count` and `ticketMedio` props and renders a "Negócios: N  Ticket médio: R$ X" row when `count !== undefined`
- Both `KPICard` usages in `App.tsx` pass the new props from `kpiMetrics`
- TypeScript compiles clean (`npx tsc --noEmit`)
  </done>
</task>

<task type="auto">
  <name>Task 3: Add status quick-filter pills to DealsView</name>
  <files>frontend/src/views/DealsView.tsx</files>
  <action>
In `frontend/src/views/DealsView.tsx`:

1. Add a `statusFilter` state alongside `searchTerm`:

```typescript
type StatusFilter = 'TODOS' | 'GANHO' | 'EM ANDAMENTO' | 'PERDIDO';
const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');
```

2. Extend the `filteredRows` computation to apply the status filter AFTER the
   search filter:

```typescript
const filteredRows = rows.filter(r => {
    const matchesSearch =
        (r.cliente?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.categoria?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'TODOS') return true;
    return (r.status || '').toUpperCase() === statusFilter;
});
```

3. Render a pill bar inside the existing toolbar div (same row as the search
   input and NOVO PEDIDO button). Insert it between the search input wrapper
   and the NOVO PEDIDO button. Use the existing `getStatusColor` helper for the
   active pill's color so each status keeps its semantic color when selected.

```tsx
const statusPills: { key: StatusFilter; label: string }[] = [
    { key: 'TODOS', label: 'Todos' },
    { key: 'GANHO', label: 'Ganho' },
    { key: 'EM ANDAMENTO', label: 'Em Andamento' },
    { key: 'PERDIDO', label: 'Perdido' },
];
```

```tsx
<div className="flex items-center gap-2">
    {statusPills.map(p => {
        const active = statusFilter === p.key;
        const activeClass = p.key === 'TODOS'
            ? (isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800 text-white border-slate-800')
            : getStatusColor(p.key);
        const inactiveClass = isDark
            ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800';
        return (
            <button
                key={p.key}
                onClick={() => setStatusFilter(p.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? activeClass : inactiveClass}`}
            >
                {p.label}
            </button>
        );
    })}
</div>
```

4. Update the footer count text to reflect the new filter automatically — no
   change needed, it already reads `sortedRows.length`, which derives from
   `filteredRows`.

5. Do NOT modify sorting logic, table columns, edit/delete handlers, or the
   search input.

Layout note: The toolbar currently uses `flex justify-between items-center`.
With three sibling groups (search, pills, NOVO PEDIDO) it may get tight on
narrow viewports. If needed, wrap the toolbar inner content in
`flex flex-wrap gap-3`. Otherwise leave the toolbar structure as-is and add the
pill group as a middle sibling — keeping the existing `justify-between` behavior
spreads search (left), pills (center), button (right) naturally.

Accessibility: each pill is a native `<button>`; no extra aria needed for MVP.
  </action>
  <verify>
    <automated>cd frontend && npx tsc --noEmit</automated>
  </verify>
  <done>
- `DealsView` renders four pill buttons: Todos | Ganho | Em Andamento | Perdido
- Clicking a pill filters the table to rows whose `status.toUpperCase()` matches
- "Todos" returns the table to the unfiltered-by-status state
- Pills reflect the active selection (colored when active, neutral otherwise)
- Search filter still works and composes with the status filter
- TypeScript compiles clean (`npx tsc --noEmit`)
  </done>
</task>

</tasks>

<verification>
After all three tasks:

1. `cd frontend && npx tsc --noEmit` — zero errors
2. Start the frontend dev server (`cd frontend && npm run dev`), open the
   dashboard:
   - VOLUME FECHADO card shows "Negócios: N" and "Ticket médio: R$ X" in the
     sub-metrics area
   - VOLUME ORÇADO card shows the same
   - Changing the global date filter, category tab, or clicking a UF on the map
     updates count and ticket médio reactively
3. Switch to NEGÓCIOS view:
   - Four pills visible: Todos, Ganho, Em Andamento, Perdido
   - Clicking "Ganho" shows only rows with status GANHO
   - Clicking "Em Andamento" shows only EM ANDAMENTO rows
   - Clicking "Perdido" shows only PERDIDO rows
   - Clicking "Todos" returns to the full (search-filtered) list
   - Footer count "Total de N negócios listados." updates accordingly
4. No regressions: create/edit/delete modals still open, search still works,
   column sorting still works.
</verification>

<success_criteria>
- Two KPI cards on the dashboard display deal count and average ticket
- DealsView has a working status pill bar with four options
- All TypeScript compiles with zero errors
- No existing functionality (create/edit/delete, date filter, category tabs,
  UF filter, map, search, sort) is broken
- Count and ticket médio react to all existing filters (category + date + UF)
</success_criteria>

<output>
After completion, create `.planning/quick/260422-hhr-adicionar-contagem-de-neg-cios-ticket-m-/260422-hhr-SUMMARY.md`
</output>
