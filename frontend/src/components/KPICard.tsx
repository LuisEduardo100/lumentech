import React from 'react';
import { ArrowUp } from 'lucide-react';

type Theme = 'orange' | 'black' | 'slate';

interface KPICardProps {
    title: string;
    value: number;
    todayValue?: number;
    monthValue?: number;
    percent?: number;
    theme: Theme;
    className?: string;
    isActive?: boolean;
    isDark?: boolean;
}

const themeColors: Record<Theme, { accent: string, bg: string, text: string }> = {
    orange: { accent: 'bg-[#f75900]', bg: 'bg-orange-50', text: 'text-orange-900' },
    black: { accent: 'bg-black', bg: 'bg-gray-100', text: 'text-gray-900' },
    slate: { accent: 'bg-slate-600', bg: 'bg-slate-100', text: 'text-slate-900' }
};

export function KPICard({ title, value, todayValue = 0, monthValue = 0, percent, theme, className, isActive, isDark }: KPICardProps) {
    const isOrange = theme === 'orange';

    // Theme configuration
    // Orange Theme: Border/Highlight is Orange (#f75900). 
    // Dark Mode adjustments:

    // Background
    const bgClass = isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white';

    // Main Text
    const accentColorClass = isOrange ? 'text-[#f75900]' : (isDark ? 'text-white' : 'text-slate-800');

    // Progress Bar
    const barFillActual = isOrange ? 'bg-[#f75900]' : (isDark ? 'bg-slate-600' : 'bg-slate-800');
    const barBgClass = isDark ? 'bg-slate-800' : 'bg-slate-100';

    // Subtext
    const labelColor = isDark ? 'text-slate-500' : 'text-slate-400';
    const valueColor = isDark ? 'text-slate-300' : 'text-slate-600';
    const subHeaderLabelColor = isDark ? 'text-slate-500' : 'text-slate-500'; // Keep consistent?

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    return (
        <div className={`p-4 rounded-xl shadow-lg flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${bgClass} ${isActive ? 'ring-2 ring-[#f75900]' : ''} ${className || 'h-40'}`}>
            {/* Header */}
            <div className="z-10 w-full flex-1 flex flex-col justify-center">
                <h3 className={`text-sm font-bold uppercase tracking-widest mb-1 ${labelColor}`}>{title}</h3>
                <div className={`text-5xl font-black ${accentColorClass} tracking-tighter leading-none my-1`}>
                    {formatCurrency(value)}
                </div>
            </div>

            {/* Sub Metrics */}
            <div className={`flex justify-between items-end z-10 pt-3 border-t mt-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="space-y-1">
                    <div className={`flex items-center gap-2 ${valueColor}`}>
                        <span className={`uppercase tracking-wide text-xs font-semibold opacity-70 ${subHeaderLabelColor}`}>No dia:</span>
                        <span className="font-bold text-lg">{formatCurrency(todayValue)}</span>
                        <ArrowUp className="w-4 h-4 text-green-500" />
                    </div>
                    <div className={`flex items-center gap-2 ${valueColor}`}>
                        <span className={`uppercase tracking-wide text-xs font-semibold opacity-70 ${subHeaderLabelColor}`}>No mês:</span>
                        <span className="font-bold text-lg">{formatCurrency(monthValue)}</span>
                        <ArrowUp className="w-4 h-4 text-green-500" />
                    </div>
                </div>

                {/* Progress Percent */}
                {percent !== undefined && (
                    <div className="flex flex-col items-end">
                        <span className={`text-3xl font-black ${isDark ? 'text-slate-700' : 'text-slate-200'}`}>{percent}%</span>
                    </div>
                )}
            </div>

            {/* Progress Bar at bottom */}
            {percent !== undefined && (
                <div className={`absolute bottom-0 left-0 w-full h-1.5 z-20 ${barBgClass}`}>
                    <div
                        className={`h-full ${barFillActual} transition-all duration-1000 ease-out`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            )}
        </div>
    );
}
