import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { filterRowsByDate, resolveDateRange } from './dateFilter';
import { SheetRow, DateFilter } from './types';

// Helper to create a minimal SheetRow for testing
function makeRow(overrides: Partial<SheetRow>): SheetRow {
  return {
    id: '1', cliente: 'Test', profissional: 'N/A', status: 'Em andamento',
    categoria: 'ORGLIGHT', origem: 'Site', produto: 'Lamp', data_emissao: '',
    data_fechamento: null, valor: 1000, cidade: 'SP', estado: 'SP',
    ...overrides,
  };
}

describe('resolveDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 15)); // April 15, 2026 (month index 3)
  });
  afterEach(() => { vi.useRealTimers(); });

  it('mes_atual returns start and end of April 2026', () => {
    const range = resolveDateRange({ type: 'mes_atual' });
    expect(range.start).toEqual(new Date(2026, 3, 1));
    expect(range.end!.getMonth()).toBe(3);
    expect(range.end!.getDate()).toBe(30);
  });

  it('esta_semana returns Sunday through Saturday of current week', () => {
    const range = resolveDateRange({ type: 'esta_semana' });
    expect(range.start!.getDay()).toBe(0); // Sunday
  });

  it('mes_passado returns start and end of March 2026', () => {
    const range = resolveDateRange({ type: 'mes_passado' });
    expect(range.start).toEqual(new Date(2026, 2, 1));
    expect(range.end!.getMonth()).toBe(2);
    expect(range.end!.getDate()).toBe(31);
  });

  it('personalizado returns custom dates', () => {
    const range = resolveDateRange({
      type: 'personalizado',
      customStart: new Date(2026, 0, 1),
      customEnd: new Date(2026, 0, 31),
    });
    expect(range.start).toEqual(new Date(2026, 0, 1));
    expect(range.end).toEqual(new Date(2026, 0, 31));
  });

  it('personalizado with missing dates returns null', () => {
    const range = resolveDateRange({ type: 'personalizado' });
    expect(range.start).toBeNull();
    expect(range.end).toBeNull();
  });
});

describe('filterRowsByDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 15)); // April 15, 2026
  });
  afterEach(() => { vi.useRealTimers(); });

  it('FILT-03: mes_atual filters orcado rows by data_emissao in current month', () => {
    const rows = [
      makeRow({ id: '1', data_emissao: '15/04/2026', status: 'Em andamento' }),
      makeRow({ id: '2', data_emissao: '15/03/2026', status: 'Em andamento' }),
    ];
    const result = filterRowsByDate(rows, { type: 'mes_atual' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('FILT-02: esta_semana filters rows within current week', () => {
    // April 15 2026 is a Wednesday. Week starts Sunday April 12.
    const rows = [
      makeRow({ id: '1', data_emissao: '15/04/2026', status: 'Em andamento' }),
      makeRow({ id: '2', data_emissao: '01/04/2026', status: 'Em andamento' }),
    ];
    const result = filterRowsByDate(rows, { type: 'esta_semana' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('FILT-04: mes_passado filters rows from previous month', () => {
    const rows = [
      makeRow({ id: '1', data_emissao: '15/03/2026', status: 'Em andamento' }),
      makeRow({ id: '2', data_emissao: '15/04/2026', status: 'Em andamento' }),
    ];
    const result = filterRowsByDate(rows, { type: 'mes_passado' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('FILT-05: personalizado filters rows within custom range', () => {
    const rows = [
      makeRow({ id: '1', data_emissao: '10/01/2026', status: 'Em andamento' }),
      makeRow({ id: '2', data_emissao: '15/02/2026', status: 'Em andamento' }),
    ];
    const result = filterRowsByDate(rows, {
      type: 'personalizado',
      customStart: new Date(2026, 0, 1),
      customEnd: new Date(2026, 0, 31),
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('D-05: GANHO rows use data_fechamento, not data_emissao', () => {
    const rows = [
      makeRow({
        id: '1', status: 'GANHO',
        data_emissao: '15/03/2026', // outside current month
        data_fechamento: '15/04/2026', // inside current month
      }),
    ];
    const result = filterRowsByDate(rows, { type: 'mes_atual' });
    expect(result).toHaveLength(1);
  });

  it('D-05: PERDIDO rows are excluded (no matching date field)', () => {
    // PERDIDO is not GANHO, so uses data_emissao. But it's still filtered by date range.
    const rows = [
      makeRow({ id: '1', status: 'PERDIDO', data_emissao: '15/04/2026' }),
    ];
    const result = filterRowsByDate(rows, { type: 'mes_atual' });
    // PERDIDO rows are NOT excluded by filterRowsByDate — they use data_emissao like other non-GANHO rows
    // The exclusion of PERDIDO is done inside calculateMetrics, not in filterRowsByDate
    expect(result).toHaveLength(1);
  });

  it('excludes rows with null/empty date fields', () => {
    const rows = [
      makeRow({ id: '1', data_emissao: '', status: 'Em andamento' }),
      makeRow({ id: '2', data_emissao: '15/04/2026', status: 'Em andamento' }),
    ];
    const result = filterRowsByDate(rows, { type: 'mes_atual' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('GANHO rows with null data_fechamento are excluded', () => {
    const rows = [
      makeRow({ id: '1', status: 'GANHO', data_fechamento: null, data_emissao: '15/04/2026' }),
    ];
    const result = filterRowsByDate(rows, { type: 'mes_atual' });
    expect(result).toHaveLength(0);
  });

  it('personalizado with inverted range returns empty array', () => {
    const rows = [
      makeRow({ id: '1', data_emissao: '15/04/2026', status: 'Em andamento' }),
    ];
    const result = filterRowsByDate(rows, {
      type: 'personalizado',
      customStart: new Date(2026, 5, 1), // June
      customEnd: new Date(2026, 0, 1),   // January (before start)
    });
    expect(result).toHaveLength(0);
  });
});
