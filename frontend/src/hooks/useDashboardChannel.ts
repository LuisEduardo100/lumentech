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
        const socket = new Socket(SOCKET_URL, { params: { token: "123" } });
        socket.connect();

        const chan = socket.channel("dashboard:main", {});
        setChannel(chan);

        chan.join()
            .receive("ok", (resp: SheetData) => {
                console.log("Joined successfully", resp);
                setData(resp);
                setIsConnected(true);
            })
            .receive("error", (resp: any) => {
                console.log("Unable to join", resp);
                setIsConnected(false);
            });

        chan.on("new_data", (payload: SheetData) => {
            console.log("New data received", payload);
            setData(payload);
        });

        // User requested event name
        chan.on("update_deals", (payload: SheetData) => {
            console.log("Update deals received", payload);
            setData(payload);
        });

        socket.onOpen(() => setIsConnected(true));
        socket.onClose(() => setIsConnected(false));
        socket.onError(() => setIsConnected(false));

        return () => {
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
