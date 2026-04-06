# Lumentech Dashboard KPI Enhancement

## What This Is

Enhancement of the existing Lumentech monitoring/CRM dashboard to add annual KPI cards (budget/closed), date filters, and month-over-month percentage comparisons. The system is used by consultants to track sales performance and business metrics.

## Core Value

Consultants can see both monthly and annual financial performance at a glance, with flexible date filtering, without scrolling.

## Requirements

### Validated

- ✓ Monthly budget (orçado) KPI card — existing
- ✓ Monthly closed (fechado) KPI card — existing
- ✓ Dashboard with business metrics — existing
- ✓ Google Sheets data integration — existing
- ✓ Elixir/Phoenix backend with React frontend — existing

### Active

- [ ] Annual budget (orçado) KPI card — sum of Jan-Dec current year
- [ ] Annual closed (fechado) KPI card — sum of Jan-Dec current year
- [ ] Global date filter — affects all dashboard cards
- [ ] Predefined filter: "Esta semana"
- [ ] Predefined filter: "Mês passado"
- [ ] Predefined filter: "Mês atual" (default)
- [ ] Custom date range picker
- [ ] Month-over-month % comparison on monthly volume closed card
- [ ] Month-over-month % comparison on monthly volume budget card
- [ ] Dashboard layout fits entirely on screen without scrolling

### Out of Scope

- Year-over-year comparison — not requested, keep scope focused
- Export dashboard data — separate feature, not in this scope
- Per-card independent date filters — global filter chosen instead
- Mobile-responsive dashboard redesign — desktop-first for now

## Context

- Backend: Elixir/Phoenix serving API endpoints
- Frontend: React with TypeScript, dashboard logic in `dashboardLogic.ts`
- Data source: Google Sheets integration via `google_sheets.ex` adapter
- Current dashboard already has monthly KPI cards for orçado and fechado
- Consultants are the primary users — they need quick visual overview of performance
- Comparison % applies only to volume fechado and volume orçado monthly cards
- Annual cards always show Jan-Dec of the current calendar year
- Date filters are global — when applied, all cards update

## Constraints

- **Tech stack**: Must use existing Elixir/Phoenix + React stack
- **Layout**: Everything must fit on screen without scrolling
- **Data source**: Google Sheets remains the data source
- **Compatibility**: Must not break existing dashboard functionality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Global date filter (not per-card) | Simpler UX, consistent view for consultants | — Pending |
| Annual KPI = Jan-Dec current year | Standard calendar year, not fiscal or rolling 12mo | — Pending |
| % comparison only on volume cards | Other cards don't need month comparison | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after initialization*
