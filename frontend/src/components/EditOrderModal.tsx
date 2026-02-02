import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { SheetRow } from '../lib/types';

interface EditOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: string, data: any) => Promise<void>;
    initialData: SheetRow | null;
    isDark?: boolean;
}

export function EditOrderModal({ isOpen, onClose, onSubmit, initialData, isDark }: EditOrderModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        data_emissao: '',
        cliente: '',
        categoria: '',
        origem: '',
        produto: '',
        valor: '',
        status: '',
        data_fechamento: '',
        cidade: '',
        estado: ''
    });

    useEffect(() => {
        if (initialData) {
            // Format valor back to string with comma if it's a number?
            // The SheetRow stores formatted string or number. Backend `update_row` expects string/number.
            // Typically form inputs use string "1.234,56".
            // SheetRow.valor is number. Convert to PT-BR string for input.
            const valorStr = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(initialData.valor);

            setFormData({
                id: initialData.id,
                data_emissao: initialData.data_emissao,
                cliente: initialData.cliente,
                categoria: initialData.categoria,
                origem: initialData.origem,
                produto: initialData.produto,
                valor: valorStr,
                status: initialData.status,
                data_fechamento: initialData.data_fechamento || '',
                cidade: initialData.cidade,
                estado: initialData.estado
            });
        }
    }, [initialData]);

    if (!isOpen || !initialData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'valor') {
            // Currency Mask
            let v = value.replace(/\D/g, '');
            v = (Number(v) / 100).toFixed(2) + '';
            v = v.replace('.', ',');
            v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
            setFormData(prev => ({ ...prev, [name]: v }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // map back to backend format
            const rowMap = {
                id: formData.id,
                data_emissao: formData.data_emissao,
                cliente: formData.cliente,
                categoria: formData.categoria,
                origem: formData.origem,
                produto: formData.produto,
                valor: formData.valor,
                status: formData.status,
                data_fechamento: formData.data_fechamento,
                cidade: formData.cidade,
                estado: formData.estado
            };

            await onSubmit(initialData.id, rowMap);
            onClose();
        } catch (error) {
            console.error("Error updating order:", error);
            alert("Erro ao atualizar pedido. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = `w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-[#f75900] ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'}`;
    const labelClass = `block text-xs font-bold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
                {/* Header */}
                <div className={`px-6 py-4 flex justify-between items-center border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Editar Pedido #{initialData.id}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100/10 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Nº Pedido *</label>
                        <input name="id" readOnly disabled value={formData.id} className={`${inputClass} opacity-50 cursor-not-allowed`} />
                    </div>
                    <div>
                        <label className={labelClass}>Data Emissão *</label>
                        <input name="data_emissao" required value={formData.data_emissao} onChange={handleChange} className={inputClass} placeholder="DD/MM/YYYY" />
                    </div>

                    <div className="col-span-2">
                        <label className={labelClass}>Cliente *</label>
                        <input name="cliente" required value={formData.cliente} onChange={handleChange} className={inputClass} />
                    </div>

                    <div>
                        <label className={labelClass}>Categoria *</label>
                        <select name="categoria" required value={formData.categoria} onChange={handleChange} className={inputClass}>
                            <option value="ILUMINAÇÃO TÉCNICA">ILUMINAÇÃO TÉCNICA</option>
                            <option value="ORGLIGHT">ORGLIGHT</option>
                            <option value="PERFIL">PERFIL</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Origem *</label>
                        <input name="origem" required value={formData.origem} onChange={handleChange} className={inputClass} />
                    </div>

                    <div className="col-span-2">
                        <label className={labelClass}>Produto *</label>
                        <input name="produto" required value={formData.produto} onChange={handleChange} className={inputClass} />
                    </div>

                    <div>
                        <label className={labelClass}>Valor (R$) *</label>
                        <input name="valor" required value={formData.valor} onChange={handleChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Status *</label>
                        <select name="status" required value={formData.status} onChange={handleChange} className={inputClass}>
                            <option value="Em andamento">Em andamento</option>
                            <option value="Ganho">Ganho</option>
                            <option value="Perdido">Perdido</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Data Fechamento</label>
                        <input name="data_fechamento" value={formData.data_fechamento} onChange={handleChange} className={inputClass} placeholder="DD/MM/YYYY" />
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className={labelClass}>Cidade *</label>
                            <input name="cidade" required value={formData.cidade} onChange={handleChange} className={inputClass} />
                        </div>
                        <div className="w-20">
                            <label className={labelClass}>UF *</label>
                            <input name="estado" required value={formData.estado} onChange={handleChange} className={inputClass} placeholder="XX" maxLength={2} />
                        </div>
                    </div>

                    <div className="col-span-2 mt-4 flex justify-end gap-3 border-t pt-4 border-slate-100/10">
                        <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg font-semibold ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}>Cancelar</button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-[#f75900] hover:bg-[#d94e00] text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {isLoading ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
