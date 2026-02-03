import { useEffect, useState } from 'react';
import { Socket } from 'phoenix';
import { SheetData } from '../lib/types';

const isProd = import.meta.env.PROD;
const API_URL = import.meta.env.VITE_API_URL;

// Determine Socket URL:
// 1. If VITE_API_URL is defined (e.g. "https://syslumen.aled1.com"), use it (swapping http->ws).
// 2. Else if Prod, derive from window.location (relative).
// 3. Else default to localhost:4000.
const getSocketUrl = () => {
    if (API_URL) {
        return `${API_URL.replace(/^http/, 'ws')}/socket`;
    }
    if (isProd) {
        return `wss://${window.location.host}/socket`;
    }
    return `ws://localhost:4000/socket`;
};

const SOCKET_URL = getSocketUrl();

export function useDashboardChannel() {
    const [data, setData] = useState<SheetData>({ rows: [], last_updated: null });
    const [isConnected, setIsConnected] = useState(false);
    const [channel, setChannel] = useState<any>(null);

    useEffect(() => {
        console.log('🟢 [Frontend] Initializing WebSocket connection...');
        console.log('🟢 [Frontend] SOCKET_URL:', SOCKET_URL);
        console.log('🟢 [Frontend] isProd:', isProd);
        console.log('🟢 [Frontend] API_URL:', API_URL);

        const socket = new Socket(SOCKET_URL, { params: { token: "123" } });
        socket.connect();

        const chan = socket.channel("dashboard:main", {});
        setChannel(chan);

        chan.join()
            .receive("ok", (resp: SheetData) => {
                console.log("🟢 [Frontend] ✅ Joined successfully");
                console.log("🟢 [Frontend] Response type:", typeof resp);
                console.log("🟢 [Frontend] Response:", resp);
                console.log("🟢 [Frontend] Rows count:", resp?.rows?.length || 0);
                console.log("🟢 [Frontend] First row:", resp?.rows?.[0]);
                console.log("🟢 [Frontend] last_updated:", resp?.last_updated);
                setData(resp);
                setIsConnected(true);
            })
            .receive("error", (resp: any) => {
                console.error("🔴 [Frontend] ❌ Unable to join", resp);
                setIsConnected(false);
            });

        chan.on("new_data", (payload: SheetData) => {
            console.log("🟢 [Frontend] 📡 New data received via new_data event");
            console.log("🟢 [Frontend] Payload:", payload);
            console.log("🟢 [Frontend] Rows count:", payload?.rows?.length || 0);
            setData(payload);
        });

        // User requested event name
        chan.on("update_deals", (payload: SheetData) => {
            console.log("🟢 [Frontend] 📡 Update deals received");
            console.log("🟢 [Frontend] Payload:", payload);
            console.log("🟢 [Frontend] Rows count:", payload?.rows?.length || 0);
            setData(payload);
        });

        socket.onOpen(() => {
            console.log('🟢 [Frontend] Socket opened');
            setIsConnected(true);
        });
        socket.onClose(() => {
            console.error('🔴 [Frontend] Socket closed');
            setIsConnected(false);
        });
        socket.onError(() => {
            console.error('🔴 [Frontend] Socket error');
            setIsConnected(false);
        });

        return () => {
            console.log('🟢 [Frontend] Cleaning up socket connection');
            chan.leave();
            socket.disconnect();
        };
    }, []);

    const push = (event: string, payload: any) => {
        return new Promise((resolve, reject) => {
            if (!channel) return reject("Not connected");
            channel.push(event, payload)
                .receive("ok", resolve)
                .receive("error", reject)
                .receive("timeout", () => reject("Timeout"));
        });
    };

    const manualUpdate = (fn: (current: SheetData) => SheetData) => {
        setData(prev => fn(prev));
    };

    return { data, isConnected, push, manualUpdate };
}
