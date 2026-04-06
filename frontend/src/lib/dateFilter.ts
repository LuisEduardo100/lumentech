import {
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subMonths,
} from 'date-fns';
import { SheetRow, DateFilter } from './types';
import { parseBrDate } from './dashboardLogic';

export function resolveDateRange(
  filter: DateFilter
): { start: Date; end: Date } | { start: null; end: null } {
  const now = new Date();
  switch (filter.type) {
    case 'esta_semana':
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }),
        end: endOfWeek(now, { weekStartsOn: 0 }),
      };
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

export function filterRowsByDate(rows: SheetRow[], filter: DateFilter): SheetRow[] {
  const range = resolveDateRange(filter);
  if (!range.start || !range.end) return rows;

  // Guard against inverted custom range (Pitfall 2 from RESEARCH.md)
  if (range.start > range.end) return [];

  return rows.filter((row) => {
    const isGanho = row.status?.toUpperCase() === 'GANHO';
    // D-05: fechado rows use data_fechamento, all others use data_emissao
    const dateStr = isGanho ? row.data_fechamento : row.data_emissao;
    if (!dateStr) return false; // Pitfall 1: exclude rows with missing dates

    const date = parseBrDate(dateStr);
    return isWithinInterval(date, {
      start: startOfDay(range.start!),
      end: endOfDay(range.end!),
    });
  });
}
