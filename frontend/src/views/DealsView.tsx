import React, { useState } from 'react';
import { SheetRow } from '../lib/types';
import { Search, Pen, Check, X, Plus } from 'lucide-react';

interface DealsViewProps {
    rows: SheetRow[];
    onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
    onOpenCreateModal: () => void;
    isDark?: boolean;
}

export function DealsView({ rows, onUpdateStatus, onOpenCreateModal, isDark }: DealsViewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempStatus, setTempStatus] = useState('');

    const filteredRows = rows.filter(r =>
        r.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditClick = (row: SheetRow) => {
        setEditingId(row.id);
        setTempStatus(row.status);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setTempStatus('');
    };

    const handleSaveEdit = async (id: string) => {
        await onUpdateStatus(id, tempStatus);
        setEditingId(null);
        setTempStatus('');
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);

    const getStatusColor = (status: string) => {
        const s = status?.toUpperCase();
        if (s === 'GANHO') return 'text-green-600 bg-green-100 border-green-200';
        if (s === 'PERDIDO') return 'text-red-600 bg-red-100 border-red-200';
        return 'text-blue-600 bg-blue-100 border-blue-200';
    };

    const tableHeaderClass = `text-left text-xs font-bold uppercase tracking-wider py-3 px-4 ${isDark ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-200'} border-b`;
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
                                <th className={tableHeaderClass}>Pedido</th>
                                <th className={tableHeaderClass}>Emissão</th>
                                <th className={tableHeaderClass}>Cliente</th>
                                <th className={tableHeaderClass}>Categoria</th>
                                <th className={tableHeaderClass}>Produto</th>
                                <th className={tableHeaderClass}>Valor</th>
                                <th className={tableHeaderClass}>Status</th>
                                <th className={tableHeaderClass}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row, idx) => (
                                <tr key={row.id || idx} className={`${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors`}>
                                    <td className={`${tableCellClass} font-mono`}>{row.id}</td>
                                    <td className={tableCellClass}>{row.data_emissao}</td>
                                    <td className={`${tableCellClass} font-semibold`}>{row.cliente}</td>
                                    <td className={tableCellClass}>{row.categoria}</td>
                                    <td className={tableCellClass} title={row.produto || ''}>{(row.produto || '').length > 30 ? (row.produto || '').substring(0, 30) + '...' : (row.produto || '')}</td>
                                    <td className={tableCellClass}>{formatCurrency(row.valor)}</td>
                                    <td className={tableCellClass}>
                                        {editingId === row.id ? (
                                            <select
                                                value={tempStatus}
                                                onChange={(e) => setTempStatus(e.target.value)}
                                                className={`p-1 rounded text-xs font-bold border ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
                                            >
                                                <option value="Em andamento">Em andamento</option>
                                                <option value="Ganho">Ganho</option>
                                                <option value="Perdido">Perdido</option>
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(row.status)}`}>
                                                {row.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className={tableCellClass}>
                                        {editingId === row.id ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleSaveEdit(row.id)} className="text-green-500 hover:text-green-600"><Check className="w-4 h-4" /></button>
                                                <button onClick={handleCancelEdit} className="text-red-500 hover:text-red-600"><X className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEditClick(row)} className={`text-slate-400 hover:text-[#f75900] transition-colors`}>
                                                <Pen className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={`p-3 text-xs text-center border-t ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                    Total de {filteredRows.length} negócios listados.
                </div>
            </div>
        </div>
    );
}
