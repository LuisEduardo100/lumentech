import React, { useEffect, useState } from 'react';
import { useDashboardChannel } from './hooks/useDashboardChannel';
import { calculateMetrics } from './lib/dashboardLogic';
import { KPICard } from './components/KPICard';
import { MapChart } from './components/charts/MapChart';
import { Wifi, WifiOff, Moon, Sun, LayoutGrid, List } from 'lucide-react';
import { CreateOrderModal } from './components/CreateOrderModal';
import { DealsView } from './views/DealsView';

function App() {
    const { data, isConnected, push, manualUpdate } = useDashboardChannel();
    const [time, setTime] = useState(new Date());

    // State
    const [view, setView] = useState<'dashboard' | 'deals'>('dashboard');
    const [category, setCategory] = useState<'Geral' | 'Orglight' | 'Perfil'>('Geral');
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter Logic
    const categoryRows = data.rows.filter(r => {
        if (category === 'Geral') return true;
        if (category === 'Orglight') return r.categoria === 'ORGLIGHT';
        if (category === 'Perfil') return r.categoria === 'PERFIL';
        return true;
    });

    // filteredRows is for KPIs (affected by State selection)
    const filteredRows = selectedState
        ? categoryRows.filter(r => r.estado === selectedState)
        : categoryRows;

    // Calculate metrics twice:
    // 1. For the Map (Should always show ALL states data for the current category, regardless of state selection)
    const mapMetrics = calculateMetrics(categoryRows);

    // 2. For the KPIs (Should reflect the specific state if selected)
    const kpiMetrics = calculateMetrics(filteredRows);

    // Theme Colors
    const isDark = themeMode === 'dark';
    const bgColor = isDark ? 'bg-slate-900' : 'bg-slate-50'; // Darker background for body
    const textColor = isDark ? 'text-white' : 'text-slate-800';

    // Theme helpers based on category
    const getThemeColor = () => {
        if (category === 'Orglight') return 'orange';
        if (category === 'Perfil') return 'black';
        return 'slate'; // Geral
    }
    const cardTheme = getThemeColor();
    const mapTheme = category === 'Orglight' ? '#f75900' : (category === 'Perfil' ? '#475569' : '#1E293B'); // Slate-800 for Geral

    // Handlers
    const handleCreateOrder = async (orderData: any) => {
        // orderData is { row: [...] }
        const r = orderData.row;
        // Optimistic Update
        const newRow = {
            id: r[0], data_emissao: r[1], cliente: r[2], categoria: r[3], origem: r[4],
            produto: r[5], valor: parseFloat(r[6].replace(/\./g, '').replace(',', '.')),
            status: r[7], data_fechamento: r[8], cidade: r[9], estado: r[10], profissional: "N/A"
        };

        manualUpdate(prev => ({ ...prev, rows: [newRow, ...prev.rows] }));

        try {
            await push("add_order", orderData);
            // Optionally show success toast
        } catch (e) {
            console.error("Failed to create order", e);
            // Rollback? complex. For MVP just alert.
            alert("Erro ao criar pedido. Recarregue a página.");
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        // Optimistic Update
        manualUpdate(prev => ({
            ...prev,
            rows: prev.rows.map(r => r.id === id ? { ...r, status: newStatus } : r)
        }));

        try {
            await push("update_status", { id, status: newStatus });
        } catch (e) {
            console.error("Failed to update status", e);
            alert("Erro ao atualizar status.");
        }
    };

    return (
        <div className={`h-screen w-full flex flex-col overflow-hidden font-sans transition-colors duration-500 ${bgColor} ${textColor}`}>

            {/* Header */}
            <header className={`px-8 py-4 flex justify-between items-center shrink-0 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} border-b shadow-sm transition-colors duration-300`}>
                <div className="flex items-center gap-8">
                    <h1 className="text-2xl font-black tracking-tighter uppercase italic">
                        <span className="text-[#f75900]">Lumen</span>tech
                    </h1>

                    {/* View Switcher */}
                    <div className={`flex items-center p-1 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        <button
                            onClick={() => setView('dashboard')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'dashboard' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-slate-800 shadow') : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            DASHBOARD
                        </button>
                        <button
                            onClick={() => setView('deals')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'deals' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-slate-800 shadow') : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <List className="w-4 h-4" />
                            NEGÓCIOS
                        </button>
                    </div>

                    {/* Category Tabs (Only show in Dashboard view) */}
                    {view === 'dashboard' && (
                        <div className={`hidden md:flex p-1 rounded-lg transition-colors ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                            <button
                                onClick={() => { setCategory('Geral'); setSelectedState(null); }}
                                className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all ${category === 'Geral' ? (isDark ? 'bg-slate-600 text-white shadow-md' : 'bg-slate-600 text-white shadow-md') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                            >
                                GERAL
                            </button>
                            <button
                                onClick={() => { setCategory('Orglight'); setSelectedState(null); }}
                                className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all ${category === 'Orglight' ? 'bg-[#f75900] text-white shadow-md' : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                            >
                                ORGLIGHT
                            </button>
                            <button
                                onClick={() => { setCategory('Perfil'); setSelectedState(null); }}
                                className={`px-6 py-1.5 rounded-md text-sm font-bold transition-all ${category === 'Perfil' ? (isDark ? 'bg-slate-700 text-white shadow-md' : 'bg-black text-white shadow-md') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                            >
                                PERFIL
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-6">
                    {/* State Filter Indicator */}
                    {selectedState && view === 'dashboard' && (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-[#f75900]/20 border-[#f75900]/30 text-orange-100' : 'bg-[#f75900]/10 text-[#f75900] border-[#f75900]/20'}`}>
                            <span className="text-xs font-bold">FILTRO: {selectedState}</span>
                            <button onClick={() => setSelectedState(null)} className={`rounded-full p-0.5 ${isDark ? 'hover:bg-[#f75900]/30' : 'hover:bg-[#f75900]/20'}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-4 border-l border-slate-700/10 pl-6">
                        {/* Theme Toggle */}
                        <button onClick={() => setThemeMode(isDark ? 'light' : 'dark')} className={`p-2 rounded-full transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {/* Wifi Status */}
                        <div className="flex items-center gap-2" title={isConnected ? "Conectado" : "Desconectado"}>
                            {isConnected
                                ? <Wifi className="w-5 h-5 text-green-500" />
                                : <WifiOff className="w-5 h-5 text-red-500 animate-pulse" />
                            }
                        </div>

                        {/* Clock */}
                        <div className={`text-xl font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} opacity-90`}>
                            {time.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col p-6 gap-6 min-h-0 container mx-auto max-w-7xl">

                {view === 'dashboard' ? (
                    <>
                        {/* KPI Row */}
                        <div className="grid grid-cols-2 gap-6 shrink-0 h-48">
                            <KPICard
                                title="VOLUME FECHADO"
                                value={kpiMetrics.volumeFechado.total}
                                todayValue={kpiMetrics.volumeFechado.today}
                                monthValue={kpiMetrics.volumeFechado.month}
                                // percent removed
                                theme={cardTheme}
                                className="h-full shadow-xl"
                                isDark={isDark}
                            />
                            <KPICard
                                title="VOLUME ORÇADO"
                                value={kpiMetrics.volumeOrcado.total}
                                todayValue={kpiMetrics.volumeOrcado.today}
                                monthValue={kpiMetrics.volumeOrcado.month}
                                percent={kpiMetrics.volumeOrcado.total > 0 ? Math.round((kpiMetrics.volumeFechado.total / kpiMetrics.volumeOrcado.total) * 100) : 0}
                                theme={cardTheme}
                                className="h-full shadow-xl"
                                isDark={isDark}
                            />
                        </div>

                        {/* Map Section */}
                        <div className={`flex-1 rounded-2xl overflow-hidden shadow-2xl relative border transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                            <div className="absolute top-4 left-6 z-10 pointer-events-none">
                                <h3 className={`text-lg font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Performance por Estado</h3>
                                <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Clique no estado para filtrar</p>
                            </div>

                            <div className="w-full h-full p-4">
                                <MapChart
                                    data={mapMetrics.topStatesFechado}
                                    themeColor={mapTheme}
                                    onStateClick={(uf) => setSelectedState(uf === selectedState ? null : uf)}
                                    selectedState={selectedState}
                                    showPercentage={false}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <DealsView
                        rows={data.rows}
                        onUpdateStatus={handleUpdateStatus}
                        onOpenCreateModal={() => setIsCreateModalOpen(true)}
                        isDark={isDark}
                    />
                )}

            </main>

            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateOrder}
                isDark={isDark}
            />
        </div>
    );
}

export default App;