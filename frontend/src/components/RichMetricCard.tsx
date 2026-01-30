import React from 'react';

interface RichMetricCardProps {
    title: string;
    subtitle: string;
    value: number;
    themeColor: string; // Hex color for the Value text
    children: React.ReactNode; // The Chart
    footer?: React.ReactNode; // "Top UFs: ..."
    onClick?: () => void;
    className?: string;
}

export function RichMetricCard({
    title,
    subtitle,
    value,
    themeColor,
    children,
    footer,
    onClick,
    className
}: RichMetricCardProps) {

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    return (
        <div
            className={`bg-white rounded-xl shadow-sm p-4 flex flex-col relative overflow-hidden transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${className || 'h-40'}`}
            onClick={onClick}
        >
            {/* Top Row: Title */}
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h4>

            <div className="flex flex-1 min-h-0 w-full">
                {/* Left Col: Info & Value */}
                <div className="flex flex-col justify-center w-[40%] pr-2 z-10 shrink-0">
                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-0.5 leading-tight">
                        {subtitle}
                    </div>
                    <div
                        className="text-2xl lg:text-3xl xl:text-4xl font-black tracking-tight leading-none mb-2"
                        style={{ color: themeColor }}
                    >
                        {formatCurrency(value)}
                    </div>

                    {/* Compact Footer (Top lists) */}
                    {footer && (
                        <div className="text-[9px] text-slate-500 leading-tight line-clamp-3 mt-auto">
                            {footer}
                        </div>
                    )}
                </div>

                {/* Right Col: Chart - Grow to fill space */}
                <div className="flex-1 w-[60%] h-full relative min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
