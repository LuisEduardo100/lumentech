import { useState, useRef, useEffect, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateFilter, DateFilterType } from '../lib/types';

interface DateFilterBarProps {
    dateFilter: DateFilter;
    onDateFilterChange: (filter: DateFilter) => void;
    isDark: boolean;
}

function CalendarMonth({
    month,
    selectionStart,
    selectionEnd,
    hoverDate,
    onDayClick,
    onDayHover,
    onPrev,
    onNext,
    isDark,
}: {
    month: Date;
    selectionStart: Date | null;
    selectionEnd: Date | null;
    hoverDate: Date | null;
    onDayClick: (date: Date) => void;
    onDayHover: (date: Date | null) => void;
    onPrev?: () => void;
    onNext?: () => void;
    isDark: boolean;
}) {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const weeks: Date[][] = [];
    let day = calStart;
    while (day <= calEnd) {
        const week: Date[] = [];
        for (let i = 0; i < 7; i++) {
            week.push(day);
            day = addDays(day, 1);
        }
        weeks.push(week);
    }

    const rangeEnd = selectionEnd || hoverDate;
    const hasRange = selectionStart && rangeEnd;

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    return (
        <div className="flex flex-col gap-1">
            {/* Month header with nav arrows */}
            <div className="flex items-center justify-between px-1 mb-1">
                {onPrev ? (
                    <button onClick={onPrev} className={`p-0.5 rounded hover:bg-slate-200 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'text-slate-500'}`}>
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                ) : <div className="w-5" />}
                <span className={`text-sm font-bold capitalize ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {format(month, 'MMMM yyyy', { locale: ptBR })}
                </span>
                {onNext ? (
                    <button onClick={onNext} className={`p-0.5 rounded hover:bg-slate-200 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'text-slate-500'}`}>
                        <ChevronRight className="w-4 h-4" />
                    </button>
                ) : <div className="w-5" />}
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0">
                {weekDays.map((d, i) => (
                    <div key={i} className={`text-center text-[10px] font-bold py-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-0">
                    {week.map((d, di) => {
                        const isCurrentMonth = isSameMonth(d, month);
                        const isStart = selectionStart && isSameDay(d, selectionStart);
                        const isEnd = rangeEnd && isSameDay(d, rangeEnd);
                        const inRange = hasRange && isWithinInterval(d, {
                            start: isBefore(selectionStart!, rangeEnd!) ? selectionStart! : rangeEnd!,
                            end: isAfter(selectionStart!, rangeEnd!) ? selectionStart! : rangeEnd!,
                        });

                        let dayClass = '';
                        if (isStart || isEnd) {
                            dayClass = 'bg-slate-600 text-white font-bold';
                        } else if (inRange && isCurrentMonth) {
                            dayClass = isDark ? 'bg-slate-700/50 text-slate-200' : 'bg-slate-200 text-slate-700';
                        } else if (!isCurrentMonth) {
                            dayClass = isDark ? 'text-slate-700' : 'text-slate-300';
                        } else {
                            dayClass = isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100';
                        }

                        // Round corners for range start/end
                        let roundClass = 'rounded';
                        if (isStart && !isEnd) roundClass = 'rounded-l';
                        if (isEnd && !isStart) roundClass = 'rounded-r';
                        if (isStart && isEnd) roundClass = 'rounded';

                        return (
                            <button
                                key={di}
                                onClick={() => isCurrentMonth && onDayClick(d)}
                                onMouseEnter={() => isCurrentMonth && onDayHover(d)}
                                onMouseLeave={() => onDayHover(null)}
                                className={`w-8 h-7 text-xs text-center transition-colors cursor-pointer ${roundClass} ${dayClass}`}
                                disabled={!isCurrentMonth}
                            >
                                {format(d, 'd')}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export function DateFilterBar({ dateFilter, onDateFilterChange, isDark }: DateFilterBarProps) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    // Dual calendar state
    const [leftMonth, setLeftMonth] = useState(() => new Date());
    const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

    // Selection state: null = nothing, Date = start selected, waiting for end
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    // Sync selection state when popover opens with existing custom dates
    useEffect(() => {
        if (isPopoverOpen && dateFilter.type === 'personalizado' && dateFilter.customStart && dateFilter.customEnd) {
            setSelectionStart(dateFilter.customStart);
            setSelectionEnd(dateFilter.customEnd);
            setLeftMonth(startOfMonth(dateFilter.customStart));
        } else if (isPopoverOpen) {
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    }, [isPopoverOpen]);

    const popoverRef = useRef<HTMLDivElement>(null);

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

    const handleDayClick = (date: Date) => {
        if (!selectionStart || selectionEnd) {
            // First click or restart: set start
            setSelectionStart(date);
            setSelectionEnd(null);
        } else {
            // Second click: set end (ensure start < end)
            if (isBefore(date, selectionStart)) {
                setSelectionEnd(selectionStart);
                setSelectionStart(date);
            } else {
                setSelectionEnd(date);
            }
        }
    };

    const canApply = !!(selectionStart && selectionEnd);

    const handleAplicar = () => {
        if (!canApply) return;
        onDateFilterChange({
            type: 'personalizado',
            customStart: selectionStart!,
            customEnd: selectionEnd!,
        });
        setIsPopoverOpen(false);
    };

    // Dynamic PERSONALIZADO pill label
    const personalizadoLabel =
        dateFilter.type === 'personalizado' && dateFilter.customStart && dateFilter.customEnd
            ? `${format(dateFilter.customStart, 'dd/MM')} - ${format(dateFilter.customEnd, 'dd/MM')}`
            : 'PERSONALIZADO';

    const handlePresetClick = (type: DateFilterType) => {
        onDateFilterChange({ type });
        setIsPopoverOpen(false);
    };

    const activePillClass = 'px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all bg-slate-600 text-white shadow-md';
    const inactivePillClass = `px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all ${
        isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
    }`;

    return (
        <div ref={popoverRef} className="relative">
            <div className={`flex items-center p-1 rounded-lg border transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
            }`}>
                <button
                    onClick={() => handlePresetClick('mes_atual')}
                    className={dateFilter.type === 'mes_atual' ? activePillClass : inactivePillClass}
                >
                    MÊS
                </button>

                <button
                    onClick={() => handlePresetClick('esta_semana')}
                    className={dateFilter.type === 'esta_semana' ? activePillClass : inactivePillClass}
                >
                    SEMANA
                </button>

                <button
                    onClick={() => handlePresetClick('mes_passado')}
                    className={dateFilter.type === 'mes_passado' ? activePillClass : inactivePillClass}
                >
                    ANTERIOR
                </button>

                <button
                    onClick={() => setIsPopoverOpen(prev => !prev)}
                    className={`flex items-center gap-1 ${dateFilter.type === 'personalizado' ? activePillClass : inactivePillClass}`}
                >
                    <CalendarDays className="w-4 h-4" />
                    {personalizadoLabel}
                </button>
            </div>

            {/* Dual calendar popover */}
            {isPopoverOpen && (
                <div className={`absolute top-full mt-2 right-0 z-50 rounded-xl border shadow-xl p-4 flex flex-col gap-3 ${
                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                    {/* Selection hint */}
                    <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {!selectionStart ? 'Selecione a data inicial' : !selectionEnd ? 'Selecione a data final' : 'Intervalo selecionado'}
                    </p>

                    {/* Two calendars side by side */}
                    <div className="flex gap-4">
                        <CalendarMonth
                            month={leftMonth}
                            selectionStart={selectionStart}
                            selectionEnd={selectionEnd}
                            hoverDate={!selectionEnd ? hoverDate : null}
                            onDayClick={handleDayClick}
                            onDayHover={setHoverDate}
                            onPrev={() => setLeftMonth(prev => subMonths(prev, 1))}
                            isDark={isDark}
                        />
                        <CalendarMonth
                            month={rightMonth}
                            selectionStart={selectionStart}
                            selectionEnd={selectionEnd}
                            hoverDate={!selectionEnd ? hoverDate : null}
                            onDayClick={handleDayClick}
                            onDayHover={setHoverDate}
                            onNext={() => setLeftMonth(prev => addMonths(prev, 1))}
                            isDark={isDark}
                        />
                    </div>

                    {/* Selected range display */}
                    {selectionStart && (
                        <div className={`text-xs text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {format(selectionStart, 'dd/MM/yyyy')}
                            {selectionEnd ? ` — ${format(selectionEnd, 'dd/MM/yyyy')}` : ' — ...'}
                        </div>
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
