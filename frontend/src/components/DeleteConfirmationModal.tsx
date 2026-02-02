import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    itemName: string;
    isDark?: boolean;
}

export function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName, isDark }: DeleteConfirmationModalProps) {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) setInputValue('');
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (inputValue !== 'CONFIRMAR') return;
        setIsLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Erro ao excluir.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 text-center ${isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white text-slate-800'}`}>

                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600">
                    <AlertTriangle className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold mb-2">Tem certeza?</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Você está prestes a excluir o pedido <strong>{itemName}</strong>. Esta ação não pode ser desfeita.
                </p>

                <div className="mb-6 text-left">
                    <label className="text-xs font-bold uppercase tracking-wide mb-1 block opacity-70">Digite <span className="text-red-500">CONFIRMAR</span> (em maiúsculas) para autorizar</label>
                    <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className={`w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-red-500 font-bold tracking-widest text-center uppercase ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                        placeholder="CONFIRMAR"
                    />
                </div>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 rounded-lg font-bold border ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                        CANCELAR
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={inputValue !== 'CONFIRMAR' || isLoading}
                        className="flex-1 py-2.5 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        EXCLUIR
                    </button>
                </div>
            </div>
        </div>
    );
}
