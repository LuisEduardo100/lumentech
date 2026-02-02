import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface MapChartProps {
    data: { name: string; value: number }[]; // name should be "SP", "RJ" etc.
    themeColor: string;
    showPercentage?: boolean;
    onStateClick?: (stateName: string) => void;
    selectedState?: string | null;
}

const GEOJSON_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

export function MapChart({ data, themeColor, showPercentage = true, onStateClick, selectedState }: MapChartProps) {
    const [geoJson, setGeoJson] = useState<any>(null);

    useEffect(() => {
        let isMounted = true;
        fetch(GEOJSON_URL)
            .then(r => r.json())
            .then(json => {
                if (isMounted) {
                    echarts.registerMap('Brazil', json);
                    setGeoJson(json);
                }
            })
            .catch(err => console.error("Failed to load map", err));

        return () => { isMounted = false; };
    }, []);

    if (!geoJson) return <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading Map...</div>;

    // Calculate Top UFs
    const total = data.reduce((acc, d) => acc + d.value, 0);

    const onChartClick = (params: any) => {
        if (onStateClick && params.name) {
            const sigla = convertNameToSigla(params.name);
            onStateClick(sigla);
        }
    };

    const option = {
        tooltip: {
            trigger: 'item',
            backgroundColor: '#1E293B',
            borderColor: '#334155',
            textStyle: {
                color: '#fff'
            },
            formatter: (params: any) => {
                const val = Number.isFinite(params.value) ? params.value : 0;
                const pct = total > 0 && showPercentage ? ((val / total) * 100).toFixed(0) + '%' : '';
                return `${params.name}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val)} ${pct ? `(${pct})` : ''}`;
            }
        },
        visualMap: {
            left: 'right',
            min: 0,
            max: Math.max(...data.map(d => d.value)) || 10000,
            inRange: {
                color: [themeColor === '#f75900' ? '#fff7ed' : '#f8fafc', themeColor]
            },
            show: false
        },
        series: [
            {
                name: 'Vendas',
                type: 'map',
                map: 'Brazil',
                roam: false,
                top: 20,
                bottom: 20,
                emphasis: {
                    label: { show: true },
                    itemStyle: {
                        areaColor: themeColor
                    }
                },
                select: {
                    itemStyle: {
                        areaColor: themeColor,
                        borderColor: '#000',
                        borderWidth: 2
                    },
                    label: { show: true }
                },
                data: data.map(d => ({
                    name: convertSiglaToName(d.name),
                    value: d.value,
                    selected: selectedState === d.name
                })).map(item => {
                    if (selectedState && (item.name === convertSiglaToName(selectedState) || convertNameToSigla(item.name) === selectedState)) {
                        return {
                            ...item,
                            itemStyle: {
                                areaColor: themeColor,
                                borderColor: '#000',
                                borderWidth: 2
                            },
                            label: { show: true, fontWeight: 'bold' }
                        }
                    }
                    return item;
                })
            }
        ]
    };

    return <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        onEvents={{
            'click': onChartClick
        }}
        notMerge={true}
        lazyUpdate={true}
    />;
}

function convertSiglaToName(sigla: string) {
    const map: Record<string, string> = {
        "SP": "São Paulo", "RJ": "Rio de Janeiro", "MG": "Minas Gerais", "RS": "Rio Grande do Sul",
        "PR": "Paraná", "SC": "Santa Catarina", "BA": "Bahia", "CE": "Ceará", "PE": "Pernambuco",
        "GO": "Goiás", "DF": "Distrito Federal", "ES": "Espírito Santo", "AM": "Amazonas",
        "PA": "Pará", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul", "MA": "Maranhão",
        "PB": "Paraíba", "RN": "Rio Grande do Norte", "AL": "Alagoas", "PI": "Piauí",
        "SE": "Sergipe", "RO": "Rondônia", "TO": "Tocantins", "AC": "Acre", "AP": "Amapá", "RR": "Roraima"
    };
    return map[sigla] || sigla;
}

function convertNameToSigla(name: string) {
    const map: Record<string, string> = {
        "São Paulo": "SP", "Rio de Janeiro": "RJ", "Minas Gerais": "MG", "Rio Grande do Sul": "RS",
        "Paraná": "PR", "Santa Catarina": "SC", "Bahia": "BA", "Ceará": "CE", "Pernambuco": "PE",
        "Goiás": "GO", "Distrito Federal": "DF", "Espírito Santo": "ES", "Amazonas": "AM",
        "Pará": "PA", "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Maranhão": "MA",
        "Paraíba": "PB", "Rio Grande do Norte": "RN", "Alagoas": "AL", "Piauí": "PI",
        "Sergipe": "SE", "Rondônia": "RO", "Tocantins": "TO", "Acre": "AC", "Amapá": "AP", "Roraima": "RR"
    };
    return map[name] || name;
}
