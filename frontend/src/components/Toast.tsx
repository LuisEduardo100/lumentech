import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
    message: string;
    description?: string;
    type?: 'error' | 'success';
    onClose: () => void;
}

export function Toast({ message, description, type = 'error', onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-6 right-6 z-[100] max-w-sm w-full flex flex-col gap-1 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-right fade-in duration-300 ${type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    {type === 'error' ? <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" /> : <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />}
                    <div>
                        <p className="font-bold text-sm">{message}</p>
                        {description && <p className="text-xs opacity-90 mt-1 leading-relaxed">{description}</p>}
                    </div>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5 transition-colors -mt-1 -mr-1">
                    <X className="w-4 h-4 opacity-60" />
                </button>
            </div>
        </div>
    );
}
