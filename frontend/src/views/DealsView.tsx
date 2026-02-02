import React, { useState } from 'react';
import { SheetRow } from '../lib/types';
import { Search, Pen, Check, X, Plus, Trash2 } from 'lucide-react';

interface DealsViewProps {
    rows: SheetRow[];
    onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
    onOpenCreateModal: () => void;
    onEditRow: (row: SheetRow) => void;
    onDeleteRow: (row: SheetRow) => void;
    isDark?: boolean;
}

export function DealsView({ rows, onUpdateStatus, onOpenCreateModal, onEditRow, onDeleteRow, isDark }: DealsViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    // Remove local editingId state for full edit (handled by parent modal)
    // Keep local editingId ONLY for quick status change if we want, OR remove it completely and use generic edit?
    // User requested "além de editar o status seja possível editar também os outros campos".
    // AND "lado do pincel de editar um icone de lixeira".
    // I will keep the quick status edit (select) because it's convenient, but make the PEN icon open the Full Edit Modal.
    // So I keep `editingId` for the status column inline edit logic?
    // Actually, maybe Pen should open modal, and we keep Status dropdown always usable or only in modal?
    // The current code has `editingId` toggling the row into "Edit Mode".
    // If I change Pen behavior to open Modal, then `editingId` logic is obsolete for the PEN button.
    // But maybe the `editingId` was used to switch the Status cell to a Select?
    // Let's keep Status as `Select` ONLY when generic edit is clicked? No, generic edit is a modal.
    // I will simplify: Status cell is display only or quick select? 
    // The previous code had "Edit" button toggle the row inputs.
    // I will change the "Edit" (Pen) button to calling `onEditRow`. 
    // I will remove the inline "Save/Cancel" buttons since Modal handles saving.
    // However, I can keep the Status dropdown as a "Quick Action" if desired, but user didn't explicitly ask to remove it.
    // Actually, inline editing is nice. But "Edit ALL fields" usually implies a Modal for complex table.
    // I'll make the Pen open the Modal.
    // I will keep the Status column as valid "Quick Status Change" via a direct Select (always visible? or just text?).
    // Current code: Status is text, becomes Select when `editingId` matches.
    // If I remove `editingId`, I lose inline status edit.
    // I will replace Pen behavior. Pen -> Open Modal.
    // I will Add Trash -> Open Delete Modal.
    // I will remove `editingId` state and logic to simplify, assuming Modal is the primary edit way now.

    const [sortConfig, setSortConfig] = useState<{ key: keyof SheetRow | string, direction: 'asc' | 'desc' } | null>(null);

    // Initial Filter
    const filteredRows = rows.filter(r =>
        (r.cliente?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.categoria?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    // Sorting Logic
    const sortedRows = React.useMemo(() => {
        let sortableItems = [...filteredRows];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                // @ts-ignore
                let aValue = a[sortConfig.key];
                // @ts-ignore
                let bValue = b[sortConfig.key];

                // Parse Dates
                if (sortConfig.key === 'data_emissao' || sortConfig.key === 'data_fechamento') {
                    const parseDate = (d: string) => {
                        if (!d) return 0;
                        const parts = d.split('/');
                        if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
                        return 0;
                    };
                    aValue = parseDate(aValue);
                    bValue = parseDate(bValue);
                }
                // Parse Numbers columns if needed (Valor is number)

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredRows, sortConfig]);

    const requestSort = (key: keyof SheetRow | string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Sorting Logic

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);

    const getStatusColor = (status: string) => {
        const s = status?.toUpperCase();
        if (s === 'GANHO') return 'text-green-600 bg-green-100 border-green-200';
        if (s === 'PERDIDO') return 'text-red-600 bg-red-100 border-red-200';
        return 'text-blue-600 bg-blue-100 border-blue-200';
    };

    const tableHeaderClass = `text-left text-xs font-bold uppercase tracking-wider py-3 px-4 ${isDark ? 'text-slate-400 border-slate-700 hover:text-white' : 'text-slate-500 border-slate-200 hover:text-slate-800'} border-b cursor-pointer select-none transition-colors`;
    const tableCellClass = `py-3 px-4 text-sm ${isDark ? 'text-slate-300 border-slate-800' : 'text-slate-600 border-slate-100'} border-b`;

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Toolbar */}
            <div className={`flex justify-between items-center p-4 rounded-xl shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 w-full max-w-md bg-transparent">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border w-full ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <Search className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por cliente, pedido ou categoria..."
                            className={`bg-transparent outline-none w-full text-sm ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-700 placeholder-slate-400'}`}
                        />
                    </div>
                </div>

                <button
                    onClick={onOpenCreateModal}
                    className="bg-[#f75900] hover:bg-[#d94e00] text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    NOVO PEDIDO
                </button>
            </div>

            {/* Table Container */}
            <div className={`flex-1 rounded-xl shadow-sm border overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="overflow-auto flex-1">
                    <table className="w-full whitespace-nowrap">
                        <thead className={`${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                            <tr>
                                <th onClick={() => requestSort('id')} className={tableHeaderClass}>
                                    Pedido {sortConfig?.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => requestSort('data_emissao')} className={tableHeaderClass}>
                                    Emissão {sortConfig?.key === 'data_emissao' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => requestSort('cliente')} className={tableHeaderClass}>
                                    Cliente {sortConfig?.key === 'cliente' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => requestSort('categoria')} className={tableHeaderClass}>
                                    Categoria {sortConfig?.key === 'categoria' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => requestSort('produto')} className={tableHeaderClass}>
                                    Produto {sortConfig?.key === 'produto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => requestSort('valor')} className={tableHeaderClass}>
                                    Valor {sortConfig?.key === 'valor' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => requestSort('status')} className={tableHeaderClass}>
                                    Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className={tableHeaderClass.replace('cursor-pointer', '')}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedRows.map((row, idx) => (
                                <tr key={`${row.id}-${idx}`} className={`${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}>
                                    <td className={`${tableCellClass} font-mono`}>{row.pedido_original || row.id}</td>
                                    <td className={tableCellClass}>{row.data_emissao}</td>
                                    <td className={`${tableCellClass} font-semibold`}>{row.cliente}</td>
                                    <td className={tableCellClass}>{row.categoria}</td>
                                    <td className={tableCellClass} title={row.produto || ''}>{(row.produto || '').length > 30 ? (row.produto || '').substring(0, 30) + '...' : (row.produto || '')}</td>
                                    <td className={tableCellClass}>{formatCurrency(row.valor)}</td>
                                    <td className={tableCellClass}>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(row.status)}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className={tableCellClass}>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onEditRow(row)}
                                                className="text-slate-400 hover:text-blue-500 transition-colors"
                                                title="Editar"
                                            >
                                                <Pen className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteRow(row)}
                                                className="text-slate-400 hover:text-red-500 transition-colors relative group"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={`p-3 text-xs text-center border-t ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                    Total de {sortedRows.length} negócios listados.
                </div>
            </div>
        </div>
    );
}
