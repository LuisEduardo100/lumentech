export interface SheetRow {
    id: string; // Composite ID "PEDIDO-PRODUTO"
    pedido_original?: string; // Original ID "PEDIDO" for display
    cliente: string;
    profissional: string;
    status: string; // "Em andamento" | "Ganho" | "Perdido"
    categoria: string;
    origem: string;
    produto: string; // New field
    data_emissao: string; // ISO Date "yyyy-mm-dd"
    data_fechamento: string | null; // ISO Date "yyyy-mm-dd"
    valor: number;
    cidade: string;
    estado: string;
}

export interface SheetData {
    rows: SheetRow[];
    last_updated: string | null;
}

export interface DashboardMetrics {
    volumeFechado: {
        total: number;
        today: number;
        month: number;
    };
    volumeOrcado: {
        total: number;
        today: number;
        month: number;
    };
    // Generic (optional or deprecated)
    topStates?: { name: string; value: number }[];
    topOrigins?: { name: string; value: number }[];
    topProfessionals?: { name: string; value: number }[];

    // Fechado
    topStatesFechado: { name: string; value: number }[];
    topOriginsFechado: { name: string; value: number }[];
    topProfessionalsFechado: { name: string; value: number }[];

    // Orcado
    topStatesOrcado: { name: string; value: number }[];
    topOriginsOrcado: { name: string; value: number }[];
    topProfessionalsOrcado: { name: string; value: number }[];
}
