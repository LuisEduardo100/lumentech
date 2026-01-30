import { SheetRow, DashboardMetrics } from './types';
import { isSameDay, isSameMonth, parseISO } from 'date-fns';

export function calculateMetrics(rows: SheetRow[]): DashboardMetrics {
    const now = new Date();

    // Helper to parse DD/MM/YYYY
    const parseBrDate = (dateStr: string | null) => {
        if (!dateStr) return new Date(0); // Return epoch if null
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // new Date(year, monthIndex, day)
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        return parseISO(dateStr); // Fallback
    };

    // Normalize Status
    const isGanho = (s: string) => s?.toUpperCase() === "GANHO";
    const isEmAndamento = (s: string) => s?.toUpperCase() === "EM ANDAMENTO";

    // Volume Fechado: Status == "Ganho"
    const fechadoRows = rows.filter(r => isGanho(r.status) && r.data_fechamento);

    const volumeFechado = {
        total: sum(fechadoRows),
        today: trySum(fechadoRows, r => isSameDay(parseBrDate(r.data_fechamento), now)),
        month: trySum(fechadoRows, r => isSameMonth(parseBrDate(r.data_fechamento), now))
    };

    // Volume Orçado: Status == "Em andamento" OR "Ganho"
    const orcadoRows = rows.filter(r => isEmAndamento(r.status) || isGanho(r.status));

    const volumeOrcado = {
        total: sum(orcadoRows),
        today: trySum(orcadoRows, r => isSameDay(parseBrDate(r.data_emissao), now)),
        month: trySum(orcadoRows, r => isSameMonth(parseBrDate(r.data_emissao), now))
    };

    // Groupings (aggregations)
    // For Lists/Charts, usually we look at general performance. 
    // User didn't specify time filter for charts, usually it's "Current Month" or "All Time". 
    // Given "Mission Critical" usually shows "Current Month" or "YTD". 
    // For now I'll use ALL data in the sheet for the charts logic unless it looks too crowded, 
    // or maybe just the "Closed" volume for "Volume Fechado" section and "Quoted" for "Profile"?
    // Re-reading User Request: "Curva ABC - UF: Render a map... Tooltip must show % share". nothing about "Closed vs Quoted" distinction there. 
    // BUT the mockup has TWO columns: Orglight (Blue) and Perfil (Red).
    // AND the mockup shows "Volume Fechado" chart on Left, "Volume Orçado" chart on Right? 
    // Wait, looking at mockup:
    // LEFT COLUMN (Blue): "Orglight"
    // RIGHT COLUMN (Red): "Perfil"
    // Actually, the headers are "Orglight" and "Perfil". These look like Business Units or Categories?
    // User Request says: 
    // "Orglight Section (Left)... Perfil Section (Right)"
    // "KPI Cards: Display Volume Fechado and Volume Orçado" INSIDE each section?
    // Mockup shows:
    // Left Col (Orglight): Card "Volume Fechado", Card "Volume Orçado", Chart UF, Chart Origin, Chart Professional.
    // Right Col (Perfil): Card "Volume Fechado", Card "Volume Orçado", Chart UF, Chart Origin, Chart Professional.

    // AHA! "Orglight" and "Perfil" are likely values in a column?
    // Looking at Planilha.png: Column "Categoria do produto": "Pendentes e Lustres", "Iluminação Técnica".
    // Maybe "Orglight" map to one category and "Perfil" to another?
    // The User didn't explicitly say mapping.
    // User Request: "Orglight Section (Left) ... Perfil Section (Right)".
    // Is "Orglight" a company name? "Lumentech Monitor".
    // Maybe I should just treat them as two identical layouts for now, but I need to know how to split the data.
    // I will inspect the `planilha.png` closer or just ask?
    // "Category of Product" has "Pendentes e Lustres", "Iluminação Técnica".
    // "Perfil" implies "Profile" -> "Perfil de LED"?
    // "Orglight" -> "Organic Light"?
    // FOR NOW: I will creating a `calculateMetrics` that returns Global metrics, but actually I need to split the screen in two.
    // I will assume for the MVP that "Orglight" and "Perfil" are just placeholders in the mockup, OR they correspond to "Categoria".
    // I'll make the code generic: `calculateMetrics(rows)` -> returns metrics.
    // Then in App.tsx I can filter `rows` passed to it.
    // I'll assume I need to display TWO identical dashboards side-by-side.
    // I will just return the aggregation helpers here.

    // Combine for Map (Show all activity: Ganho + Em andamento)
    const activeRows = rows.filter(r => isGanho(r.status) || isEmAndamento(r.status));

    return {
        volumeFechado,
        volumeOrcado,

        // Charts (Using activeRows for Map to show full coverage)
        topStatesFechado: groupBy(activeRows, 'estado'),
        topOriginsFechado: groupBy(activeRows, 'origem'),
        topProfessionalsFechado: groupBy(activeRows, 'profissional'),

        // Charts for Orcado (Specific)
        topStatesOrcado: groupBy(orcadoRows, 'estado'),
        topOriginsOrcado: groupBy(orcadoRows, 'origem'),
        topProfessionalsOrcado: groupBy(orcadoRows, 'profissional'),
    };
}

function sum(rows: SheetRow[]) {
    return rows.reduce((acc, r) => acc + r.valor, 0);
}

function trySum(rows: SheetRow[], predicate: (r: SheetRow) => boolean) {
    return rows.reduce((acc, r) => predicate(r) ? acc + r.valor : acc, 0);
}



function normalizeStateName(input: string): string {
    if (!input) return "";
    const upper = input.toUpperCase().trim();

    // Map of common variations to Title Case expected by MapChart
    const map: Record<string, string> = {
        "AC": "Acre", "ACRE": "Acre",
        "AL": "Alagoas", "ALAGOAS": "Alagoas",
        "AP": "Amapá", "AMAPA": "Amapá",
        "AM": "Amazonas", "AMAZONAS": "Amazonas",
        "BA": "Bahia", "BAHIA": "Bahia",
        "CE": "Ceará", "CEARA": "Ceará", "CEARÁ": "Ceará",
        "DF": "Distrito Federal", "DISTRITO FEDERAL": "Distrito Federal",
        "ES": "Espírito Santo", "ESPIRITO SANTO": "Espírito Santo",
        "GO": "Goiás", "GOIAS": "Goiás",
        "MA": "Maranhão", "MARANHAO": "Maranhão",
        "MT": "Mato Grosso", "MATO GROSSO": "Mato Grosso",
        "MS": "Mato Grosso do Sul", "MATO GROSSO DO SUL": "Mato Grosso do Sul",
        "MG": "Minas Gerais", "MINAS GERAIS": "Minas Gerais",
        "PA": "Pará", "PARA": "Pará",
        "PB": "Paraíba", "PARAIBA": "Paraíba",
        "PR": "Paraná", "PARANA": "Paraná",
        "PE": "Pernambuco", "PERNAMBUCO": "Pernambuco",
        "PI": "Piauí", "PIAUI": "Piauí",
        "RJ": "Rio de Janeiro", "RIO DE JANEIRO": "Rio de Janeiro",
        "RN": "Rio Grande do Norte", "RIO GRANDE DO NORTE": "Rio Grande do Norte",
        "RS": "Rio Grande do Sul", "RIO GRANDE DO SUL": "Rio Grande do Sul",
        "RO": "Rondônia", "RONDONIA": "Rondônia",
        "RR": "Roraima", "RORAIMA": "Roraima",
        "SC": "Santa Catarina", "SANTA CATARINA": "Santa Catarina",
        "SP": "São Paulo", "SAO PAULO": "São Paulo",
        "SE": "Sergipe", "SERGIPE": "Sergipe",
        "TO": "Tocantins", "TOCANTINS": "Tocantins"
    };

    return map[upper] || input; // Return mapped value or original
}

function groupBy(rows: SheetRow[], key: keyof SheetRow) {
    const map = new Map<string, number>();
    rows.forEach(r => {
        let val = r[key] as string;

        // Normalize state names if grouping by 'estado'
        if (key === 'estado') {
            val = normalizeStateName(val);
        }

        if (val) {
            const current = map.get(val) || 0;
            map.set(val, current + r.valor);
        }
    });
    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}
