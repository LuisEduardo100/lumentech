# Requirements: Lumentech Dashboard KPI Enhancement

**Defined:** 2026-04-06
**Core Value:** Consultants can see both monthly and annual financial performance at a glance, with flexible date filtering, without scrolling.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### KPI Cards Anuais

- [ ] **KPI-01**: Dashboard exibe card de volume orçado anual (soma Jan-Dez do ano corrente)
- [ ] **KPI-02**: Dashboard exibe card de volume fechado anual (soma Jan-Dez do ano corrente)
- [ ] **KPI-03**: Cards anuais atualizam quando filtro de data global é aplicado

### Filtros de Data

- [x] **FILT-01**: Dashboard possui filtro global de data que afeta todos os cards
- [x] **FILT-02**: Filtro predefinido "Esta semana" disponível
- [x] **FILT-03**: Filtro predefinido "Mês atual" disponível (padrão)
- [x] **FILT-04**: Filtro predefinido "Mês passado" disponível
- [x] **FILT-05**: Filtro de período customizado com date range picker

### Comparação Percentual

- [ ] **COMP-01**: Card de volume orçado mensal exibe variação % em relação ao mês anterior
- [ ] **COMP-02**: Card de volume fechado mensal exibe variação % em relação ao mês anterior
- [ ] **COMP-03**: Variação positiva exibida em verde, negativa em vermelho

### Layout

- [ ] **LAYOUT-01**: Dashboard inteiro cabe na tela sem necessidade de scroll vertical
- [ ] **LAYOUT-02**: Cards reorganizados para acomodar novos elementos mantendo legibilidade

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Análises Avançadas

- **ADV-01**: Comparação ano atual vs ano anterior
- **ADV-02**: Gráficos de tendência mensal
- **ADV-03**: Export de dados do dashboard para PDF/Excel
- **ADV-04**: Filtros por consultor individual

## Out of Scope

| Feature | Reason |
|---------|--------|
| Filtros independentes por card | Global filter escolhido para UX mais simples |
| Ano fiscal customizado | Ano corrente Jan-Dez atende a necessidade |
| Dashboard responsivo mobile | Desktop-first, foco na tela do consultor |
| Notificações de metas | Feature separada, não solicitada |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| KPI-01 | Phase 2 | Pending |
| KPI-02 | Phase 2 | Pending |
| KPI-03 | Phase 2 | Pending |
| FILT-01 | Phase 1 | Complete |
| FILT-02 | Phase 1 | Complete |
| FILT-03 | Phase 1 | Complete |
| FILT-04 | Phase 1 | Complete |
| FILT-05 | Phase 1 | Complete |
| COMP-01 | Phase 3 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 3 | Pending |
| LAYOUT-01 | Phase 3 | Pending |
| LAYOUT-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 — traceability mapped to 3 phases*
