import React from 'react';
import ReactECharts from 'echarts-for-react';

interface OriginPieChartProps {
    data: { name: string; value: number }[];
    themeColor: string;
}

export function OriginPieChart({ data, themeColor }: OriginPieChartProps) {
    // Specific colors requested by user
    const getColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('instagram')) return '#3b82f6'; // Blue
        if (n.includes('facebook')) return '#ec4899'; // Pink
        if (n.includes('website') || n.includes('site')) return '#ef4444'; // Red
        if (n.includes('google')) return '#eab308'; // Yellow/Gold
        if (n.includes('email') || n.includes('e-mail')) return '#64748b'; // Slate
        if (n.includes('evento')) return '#f97316'; // Orange
        if (n.includes('indica')) return '#22c55e'; // Green
        return themeColor; // Fallback
    };

    const coloredData = data.map(d => ({
        ...d,
        itemStyle: { color: getColor(d.name) }
    }));

    const option = {
        tooltip: {
            trigger: 'item'
        },
        legend: {
            show: false // User requested to disable legend
        },
        series: [
            {
                name: 'Origem',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 5,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: coloredData,
            }
        ]
    };

    return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
}

// Simple helper to darken/lighten hex (very rough)
function adjustColor(color: string, amount: number) {
    return color; // Placeholder, ECharts has auto palette, or we can use fixed palette.
}
