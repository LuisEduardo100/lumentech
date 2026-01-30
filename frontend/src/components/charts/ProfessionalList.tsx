import React from 'react';

interface ProfessionalListProps {
    data: { name: string; value: number }[];
    totalValue: number;
}

export function ProfessionalList({ data, totalValue }: ProfessionalListProps) {
    const top3 = data.slice(0, 3); // Reduced from 5 to 3 for better fit in cards

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="flex flex-col justify-center h-full overflow-hidden gap-1.5">
            {top3.map((item, idx) => {
                const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                return (
                    <div key={idx} className="flex items-center gap-2">
                        {/* Removed Avatar to save space */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[10px] font-medium text-slate-600 truncate mr-2" title={item.name}>{item.name}</span>
                                <span className="text-[10px] font-bold text-slate-800">{formatCurrency(item.value)}</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-400/80 rounded-full"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )
            })}
            {data.length > 3 && (
                <div className="text-[8px] text-center text-slate-400 italic">
                    + {data.length - 3} outros...
                </div>
            )}
        </div>
    );
}
