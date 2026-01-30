import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    isDark?: boolean;
}

export function CreateOrderModal({ isOpen, onClose, onSubmit, isDark }: CreateOrderModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        data_emissao: new Date().toLocaleDateString('pt-BR'), // Default today
        cliente: '',
        categoria: 'Projetos', // Default
        origem: '',
        produto: '',
        valor: '',
        status: 'Em andamento',
        data_fechamento: '',
        cidade: '',
        estado: ''
    });

    if (!isOpen) return null;

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
            // Prepare payload matching A-K
            // [id, emission, client, category, origin, product, value, status, closing, city, state]
            // We need to pass the raw array expected by SheetClient logic
            // But wait, the hook passes an object 'row' which is the array?
            // Yes, backend expects `row` as list.

            const row = [
                formData.id,
                formData.data_emissao,
                formData.cliente,
                formData.categoria,
                formData.origem,
                formData.produto,
                formData.valor, // Send formatted string "1.000,00" -> backend handles it? Backend `parse_float` handles "1.000,00"
                formData.status,
                formData.data_fechamento,
                formData.cidade,
                formData.estado
            ];

            await onSubmit({ row });
            onClose();
            // Reset form?
            setFormData({
                id: '', data_emissao: new Date().toLocaleDateString('pt-BR'), cliente: '', categoria: 'Projetos',
                origem: '', produto: '', valor: '', status: 'Em andamento', data_fechamento: '', cidade: '', estado: ''
            });
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Erro ao criar pedido. Tente novamente.");
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
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Cadastrar Novo Pedido</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100/10 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Nº Pedido *</label>
                        <input name="id" required value={formData.id} onChange={handleChange} className={inputClass} placeholder="Ex: 12345" />
                    </div>
                    <div>
                        <label className={labelClass}>Data Emissão *</label>
                        <input name="data_emissao" required value={formData.data_emissao} onChange={handleChange} className={inputClass} placeholder="DD/MM/YYYY" />
                    </div>

                    <div className="col-span-2">
                        <label className={labelClass}>Cliente *</label>
                        <input name="cliente" required value={formData.cliente} onChange={handleChange} className={inputClass} placeholder="Nome do Cliente" />
                    </div>

                    <div>
                        <label className={labelClass}>Categoria *</label>
                        <select name="categoria" required value={formData.categoria} onChange={handleChange} className={inputClass}>
                            <option value="Projetos">Projetos</option>
                            <option value="Iluminação Técnica">Iluminação Técnica</option>
                            <option value="Pendentes e Lustres">Pendentes e Lustres</option>
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
                        <input name="valor" required value={formData.valor} onChange={handleChange} className={inputClass} placeholder="0,00" />
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
                            {isLoading ? 'Salvando...' : 'CADASTRAR'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
