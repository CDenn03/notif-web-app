"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";

type Notification = { title: string; body: string };
type ConnectionStatus = "connecting" | "open" | "closed" | "error";

const WS_URL =
    typeof window !== "undefined" && process.env.NODE_ENV === "production"
        ? "wss://your-project.deno.dev"
        : "ws://localhost:8000";

const NotificationContext = createContext<{
    notifications: Notification[];
    status: ConnectionStatus;
    clearNotifications: () => void;
}>({ 
    notifications: [], 
    status: "closed",
    clearNotifications: () => {}
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [status, setStatus] = useState<ConnectionStatus>("closed");
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const mountedRef = useRef(true);
    const shouldConnectRef = useRef(true);

    const MAX_RECONNECTS = 5;
    const BASE_DELAY = 1000; // ms

    // Memoized clear function
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Ref to store the connect function for recursive calls
    const connectRef = useRef<(() => void) | null>(null);

    // Connect function that can be called recursively
    const connect = useCallback(() => {
        // Prevent connection if not mounted or already connecting
        if (!mountedRef.current || !shouldConnectRef.current || wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        shouldConnectRef.current = false; // Reset flag
        setStatus("connecting");
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            if (!mountedRef.current) {
                ws.close();
                return;
            }
            
            console.log("WebSocket connected");
            setStatus("open");
            reconnectAttempts.current = 0;
            toast.success("Connected to notifications");
        };

        ws.onmessage = (e) => {
            if (!mountedRef.current) return;
            
            try {
                const data = JSON.parse(e.data);
                if (data.type === "notification") {
                    const notif = { title: data.title, body: data.body };
                    setNotifications((prev) => {
                        // Prevent duplicate notifications
                        const isDuplicate = prev.some(
                            (n) => n.title === notif.title && n.body === notif.body
                        );
                        if (isDuplicate) return prev;
                        return [...prev, notif];
                    });
                    toast.success(`${notif.title}\n${notif.body}`, {
                        duration: 5000,
                        id: `${notif.title}-${Date.now()}`, // prevent duplicates
                    });
                }
            } catch {
                console.error("Invalid WS message", e.data);
            }
        };

        ws.onerror = (err) => {
            if (!mountedRef.current) return;
            
            console.error("WebSocket error:", err);
            setStatus("error");
            toast.error("Notification connection failed");
            shouldConnectRef.current = true; // Allow reconnection
        };

        ws.onclose = (event) => {
            if (!mountedRef.current) return;
            
            console.log("WebSocket closed:", event.code, event.reason);
            setStatus("closed");
            wsRef.current = null;
            shouldConnectRef.current = true; // Allow reconnection

            // Auto-reconnect with exponential backoff
            if (mountedRef.current && reconnectAttempts.current < MAX_RECONNECTS) {
                const delay = BASE_DELAY * 2 ** reconnectAttempts.current;
                reconnectAttempts.current++;
                toast.loading(`Reconnecting in ${delay / 1000}s...`, { 
                    id: "reconnect",
                    duration: Math.min(delay, 3000) // Cap loading toast duration
                });

                reconnectTimeoutRef.current = setTimeout(() => {
                    toast.dismiss("reconnect");
                    // Use the ref to call connect recursively
                    connectRef.current?.();
                }, delay);
            } else if (mountedRef.current) {
                toast.error("Max reconnects reached. Refresh to try again.", { 
                    duration: 8000 
                });
            }
        };

        wsRef.current = ws;
    }, []);

    // Set the ref after the function is defined - avoid setting refs during render
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        // No setState here - just set up cleanup
        return () => {
            mountedRef.current = false;
            shouldConnectRef.current = false;
            
            // Cleanup on unmount
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            
            if (wsRef.current?.readyState === WebSocket.OPEN || 
                wsRef.current?.readyState === WebSocket.CONNECTING) {
                wsRef.current.close();
            }
            
            wsRef.current = null;
            toast.dismiss("reconnect");
        };
    }, []); // No dependencies for cleanup effect

    // Effect for initial connection - this runs after render
    useEffect(() => {
        if (shouldConnectRef.current) {
            // Use setTimeout to avoid calling setState synchronously in effect
            const timeoutId = setTimeout(() => {
                connect();
            }, 0);
            
            return () => clearTimeout(timeoutId);
        }
    }, [connect]); // Connect as dependency

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useCallback(() => ({ 
        notifications, 
        status, 
        clearNotifications 
    }), [notifications, status, clearNotifications]);

    return (
        <NotificationContext.Provider value={contextValue()}>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: { fontSize: "14px" },
                    success: { duration: 4000 },
                    error: { duration: 6000 },
                }}
            />
            {children}
        </NotificationContext.Provider>
    );
}

// Fixed export statement
export const useNotifications = () => useContext(NotificationContext);