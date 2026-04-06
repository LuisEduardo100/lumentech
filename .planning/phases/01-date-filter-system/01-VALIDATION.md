---
phase: 1
slug: date-filter-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (to be installed in Wave 0) |
| **Config file** | `frontend/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `cd frontend && npx vitest run src/lib/dashboardLogic.test.ts` |
| **Full suite command** | `cd frontend && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run src/lib/dashboardLogic.test.ts`
- **After every plan wave:** Run `cd frontend && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | FILT-01..05 | setup | `cd frontend && npx vitest run` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | FILT-01 | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | FILT-02 | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | FILT-03 | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | FILT-04 | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-05 | 02 | 1 | FILT-05 | unit | `npx vitest run src/lib/dashboardLogic.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/vitest.config.ts` — vitest configuration with jsdom environment
- [ ] `frontend/src/lib/dashboardLogic.test.ts` — unit test stubs for filterRowsByDate() covering FILT-01 through FILT-05
- [ ] Framework install: `cd frontend && npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pill button visual style matches category tabs | FILT-01 | CSS visual match | Inspect pill buttons next to GERAL/ORGLIGHT/PERFIL tabs |
| Custom date popover positioning | FILT-05 | Layout/positioning | Click "Personalizado", verify popover drops below pill |
| Filter persists across view switches | FILT-01 | Component lifecycle | Select filter, switch Dashboard↔Negocios, verify filter retained |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
