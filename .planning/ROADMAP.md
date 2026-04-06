# Roadmap: Lumentech Dashboard KPI Enhancement

## Overview

Three phases that progressively enhance the existing dashboard: first establishing the date filter infrastructure that gates everything else, then adding annual KPI cards on top of the filter system, and finally delivering percentage comparisons and the final no-scroll layout. Each phase leaves the dashboard fully functional and deployable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Date Filter System** - Global date filter with predefined and custom range options
- [ ] **Phase 2: Annual KPI Cards** - Annual orçado and fechado aggregations driven by filter state
- [ ] **Phase 3: Percentage Comparisons and Layout Polish** - Month-over-month % indicators and no-scroll layout

## Phase Details

### Phase 1: Date Filter System
**Goal**: Consultants can filter the entire dashboard by date range using predefined or custom periods
**Depends on**: Nothing (first phase)
**Requirements**: FILT-01, FILT-02, FILT-03, FILT-04, FILT-05
**Success Criteria** (what must be TRUE):
  1. A date filter control is visible on the dashboard and affects all cards simultaneously
  2. Consultant can select "Mês atual" (which loads by default on page open)
  3. Consultant can select "Esta semana" and all card values recalculate
  4. Consultant can select "Mês passado" and all card values recalculate
  5. Consultant can open a date range picker, select a custom start and end date, and all cards update
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Test infrastructure + DateFilter types + filterRowsByDate logic (TDD)
- [ ] 01-02-PLAN.md — DateFilterBar UI component + App.tsx wiring + visual verification

**UI hint**: yes

### Phase 2: Annual KPI Cards
**Goal**: Consultants can see the annual orçado and fechado totals (Jan-Dec current year) alongside the monthly cards
**Depends on**: Phase 1
**Requirements**: KPI-01, KPI-02, KPI-03
**Success Criteria** (what must be TRUE):
  1. Dashboard shows a card displaying total volume orçado for the current calendar year (Jan-Dec)
  2. Dashboard shows a card displaying total volume fechado for the current calendar year (Jan-Dec)
  3. When a date filter is applied, both annual cards update to reflect the filtered period
**Plans**: TBD
**UI hint**: yes

### Phase 3: Percentage Comparisons and Layout Polish
**Goal**: Monthly volume cards show month-over-month percentage change and the entire dashboard fits on screen without scrolling
**Depends on**: Phase 2
**Requirements**: COMP-01, COMP-02, COMP-03, LAYOUT-01, LAYOUT-02
**Success Criteria** (what must be TRUE):
  1. The monthly volume orçado card displays a percentage change relative to the previous month
  2. The monthly volume fechado card displays a percentage change relative to the previous month
  3. Positive percentage change is shown in green, negative in red
  4. The complete dashboard — all cards, filter, and charts — is visible without vertical scrolling on a standard consultant screen
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Date Filter System | 0/2 | Planning complete | - |
| 2. Annual KPI Cards | 0/? | Not started | - |
| 3. Percentage Comparisons and Layout Polish | 0/? | Not started | - |
