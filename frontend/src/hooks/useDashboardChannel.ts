import { useEffect, useState } from 'react';
import { Socket } from 'phoenix';
import { SheetData } from '../lib/types';

const isProd = import.meta.env.PROD;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// No VPS, o protocolo deve ser wss (seguro) e o caminho deve incluir o /api que o Traefik gerencia
const SOCKET_URL = isProd
    ? `wss://${window.location.host}/socket`
    : `${API_URL.replace('http', 'ws')}/socket`;

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
