"use client";
import { createContext, useContext, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

type Notification = { title: string; body: string };

const WS_URL =
  process.env.NODE_ENV === "production"
    ? "wss://YOUR-PROJECT.deno.dev"   // ← replace
    : "ws://localhost:8000";

const NotificationContext = createContext<Notification[]>([]);

export function NotificationProvider({
  children,
}: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("WS connected");
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "notification") {
        setNotifications((prev) => [...prev, data]);
        toast.success(`${data.title}\n${data.body}`);
      }
    };
    ws.onerror = (err) => console.error("WS error", err);
    ws.onclose = () => console.log("WS closed");

    return () => ws.close();
  }, []);

  return (
    <NotificationContext.Provider value={notifications}>
      <Toaster position="top-right" />
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);