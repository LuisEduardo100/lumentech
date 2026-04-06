import { useState, useRef, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { DateFilter, DateFilterType } from '../lib/types';

interface DateFilterBarProps {
    dateFilter: DateFilter;
    onDateFilterChange: (filter: DateFilter) => void;
    isDark: boolean;
}

export function DateFilterBar({ dateFilter, onDateFilterChange, isDark }: DateFilterBarProps) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // Local state for custom date inputs (stored as yyyy-MM-dd strings for <input type="date">)
    const [tempStart, setTempStart] = useState<string>(() => {
        if (dateFilter.type === 'personalizado' && dateFilter.customStart) {
            return format(dateFilter.customStart, 'yyyy-MM-dd');
        }
        return '';
    });
    const [tempEnd, setTempEnd] = useState<string>(() => {
        if (dateFilter.type === 'personalizado' && dateFilter.customEnd) {
            return format(dateFilter.customEnd, 'yyyy-MM-dd');
        }
        return '';
    });

    // Sync tempStart/tempEnd when filter changes to personalizado externally
    useEffect(() => {
        if (dateFilter.type === 'personalizado') {
            if (dateFilter.customStart) setTempStart(format(dateFilter.customStart, 'yyyy-MM-dd'));
            if (dateFilter.customEnd) setTempEnd(format(dateFilter.customEnd, 'yyyy-MM-dd'));
        }
    }, [dateFilter]);

    const popoverRef = useRef<HTMLDivElement>(null);

    // Click-outside dismiss (per RESEARCH.md Pattern 4)
    useEffect(() => {
        if (!isPopoverOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPopoverOpen]);

    // Validation: inverted dates
    const datesInverted = !!(tempStart && tempEnd && tempStart > tempEnd);
    const canApply = !!(tempStart && tempEnd && !datesInverted);

    // Dynamic PERSONALIZADO pill label (D-07)
    const personalizadoLabel =
        dateFilter.type === 'personalizado' && dateFilter.customStart && dateFilter.customEnd
            ? `${format(dateFilter.customStart, 'dd/MM')} - ${format(dateFilter.customEnd, 'dd/MM')}`
            : 'PERSONALIZADO';

    const handlePresetClick = (type: DateFilterType) => {
        onDateFilterChange({ type });
        setIsPopoverOpen(false);
    };

    const handleAplicar = () => {
        if (!canApply) return;
        onDateFilterChange({
            type: 'personalizado',
            customStart: new Date(tempStart + 'T00:00:00'),
            customEnd: new Date(tempEnd + 'T23:59:59'),
        });
        setIsPopoverOpen(false);
    };

    // Shared pill classes
    const activePillClass = 'px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all bg-slate-600 text-white shadow-md';
    const inactivePillClass = `px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${
        isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
    }`;

    return (
        <div ref={popoverRef} className="relative">
            {/* Pill group container — matches category tab group styling */}
            <div className={`flex items-center p-1 rounded-lg border transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
                {/* SEMANA pill */}
                <button
                    onClick={() => handlePresetClick('esta_semana')}
                    className={dateFilter.type === 'esta_semana' ? activePillClass : inactivePillClass}
                >
                    SEMANA
                </button>

                {/* MÊS pill */}
                <button
                    onClick={() => handlePresetClick('mes_atual')}
                    className={dateFilter.type === 'mes_atual' ? activePillClass : inactivePillClass}
                >
                    MÊS
                </button>

                {/* ANTERIOR pill */}
                <button
                    onClick={() => handlePresetClick('mes_passado')}
                    className={dateFilter.type === 'mes_passado' ? activePillClass : inactivePillClass}
                >
                    ANTERIOR
                </button>

                {/* PERSONALIZADO pill */}
                <button
                    onClick={() => setIsPopoverOpen(prev => !prev)}
                    className={`flex items-center gap-1 ${dateFilter.type === 'personalizado' ? activePillClass : inactivePillClass}`}
                >
                    <CalendarDays className="w-4 h-4" />
                    {personalizadoLabel}
                </button>
            </div>

            {/* Custom range popover */}
            {isPopoverOpen && (
                <div className={`absolute top-full mt-2 right-0 z-50 rounded-xl border shadow-xl p-4 flex flex-col gap-3 min-w-[240px] ${
                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                    {/* Start date input */}
                    <div className="flex flex-col gap-1">
                        <label className={`text-xs font-bold uppercase tracking-wide ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                            INÍCIO
                        </label>
                        <input
                            type="date"
                            value={tempStart}
                            onChange={e => setTempStart(e.target.value)}
                            className={`px-2 py-1 rounded border text-sm w-full ${
                                isDark
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-white border-slate-300 text-slate-800'
                            }`}
                        />
                    </div>

                    {/* End date input */}
                    <div className="flex flex-col gap-1">
                        <label className={`text-xs font-bold uppercase tracking-wide ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                            FIM
                        </label>
                        <input
                            type="date"
                            value={tempEnd}
                            onChange={e => setTempEnd(e.target.value)}
                            className={`px-2 py-1 rounded border text-sm w-full ${
                                isDark
                                    ? 'bg-slate-700 border-slate-600 text-white'
                                    : 'bg-white border-slate-300 text-slate-800'
                            }`}
                        />
                    </div>

                    {/* Validation error for inverted dates (Pitfall 2) */}
                    {datesInverted && (
                        <p className="text-xs text-red-500 font-semibold">
                            Data final deve ser após a data inicial.
                        </p>
                    )}

                    {/* Aplicar button */}
                    <button
                        onClick={handleAplicar}
                        disabled={!canApply}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            canApply
                                ? 'bg-slate-700 text-white hover:bg-slate-600'
                                : `${isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-200 text-slate-400'} cursor-not-allowed`
                        }`}
                    >
                        Aplicar
                    </button>
                </div>
            )}
        </div>
    );
}
