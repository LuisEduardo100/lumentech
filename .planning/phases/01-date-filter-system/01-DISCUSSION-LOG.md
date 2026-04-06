# Phase 1: Date Filter System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 01-date-filter-system
**Areas discussed:** Filter placement & style, Custom date range picker, Filter-data interaction, Date field logic, Default behavior on page load, Active filter indicator

---

## Filter Placement & Style

### Q1: How should the date filter be presented in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Pill button group | Row of pill buttons (Esta semana, Mes atual, Mes passado, Personalizado) similar to category tabs | ✓ |
| Dropdown select | Single dropdown button showing the active filter, compact | |
| Segmented control + icon | Compact segmented control with abbreviated labels and calendar icon | |

**User's choice:** Pill button group
**Notes:** Consistent with existing UI pattern (category tabs)

### Q2: Where should the date filter be placed?

| Option | Description | Selected |
|--------|-------------|----------|
| Header bar, after category tabs | Next to GERAL/ORGLIGHT/PERFIL tabs, groups all filters together | ✓ |
| Above KPI cards | Below header, above KPI row, more prominence | |
| Header bar, right side | Near theme toggle and clock | |

**User's choice:** Header bar, after category tabs
**Notes:** None

---

## Custom Date Range Picker

### Q3: What should happen when the user clicks "Personalizado"?

| Option | Description | Selected |
|--------|-------------|----------|
| Popover calendar | Small popover with start/end date inputs and "Aplicar" button | ✓ |
| Modal dialog | Full modal with calendar view | |
| Inline text inputs | Two date text inputs appearing inline | |

**User's choice:** Popover calendar
**Notes:** Lightweight, no page disruption

---

## Filter-Data Interaction

### Q4: Should date filtering happen on the frontend or backend?

| Option | Description | Selected |
|--------|-------------|----------|
| Frontend-only filtering | Filter cached rows in memory, no backend changes | ✓ |
| Backend filtering | Send filter params via WebSocket, backend returns filtered rows | |
| You decide | Let Claude choose | |

**User's choice:** Frontend-only filtering
**Notes:** Dataset small enough for browser memory; all rows already loaded via WebSocket

---

## Date Field Logic

### Q5: Which date field should the filter use for each row type?

| Option | Description | Selected |
|--------|-------------|----------|
| Split: data_emissao for orcado, data_fechamento for fechado | Matches business semantics | ✓ |
| Single field: data_emissao for everything | Simpler but may show fechado deals outside closing period | |
| Single field: data_fechamento for everything | Orcado rows may lack data_fechamento | |
| You decide | Let Claude choose | |

**User's choice:** Split by row type
**Notes:** Consultants think about when deals were quoted vs when they closed

---

## Default Behavior on Page Load

### Q6: Should the date filter state persist when switching views?

| Option | Description | Selected |
|--------|-------------|----------|
| Persist across views | Filter stays active across Dashboard/Negocios switches | ✓ |
| Reset on view switch | Filter resets to "Mes atual" on view change | |
| You decide | Let Claude pick | |

**User's choice:** Persist across views
**Notes:** Same pattern as existing category filter

---

## Active Filter Indicator

### Q7: How should the active date filter be communicated?

| Option | Description | Selected |
|--------|-------------|----------|
| Highlighted pill only | Active pill highlighted; custom range changes pill label to show dates | ✓ |
| Pill highlight + date range chip | Highlighted pill plus a separate chip showing resolved date range | |
| You decide | Let Claude choose | |

**User's choice:** Highlighted pill only
**Notes:** For custom range, pill label changes to show "01/03 - 31/03" format

---

## Claude's Discretion

- Date picker library choice
- Popover positioning and dismiss behavior
- Filter interaction with existing state (UF) map click filter

## Deferred Ideas

None — discussion stayed within phase scope.
