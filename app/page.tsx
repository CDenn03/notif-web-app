"use client";
import { useNotifications } from "@/components/NotificationContext";

export default function Home() {
  const notifs = useNotifications();

  return (
    <main className="p-12">
      <h1 className="text-4xl font-bold mb-8">
        Next.js + Deno WebSocket Notifications
      </h1>

      <div className="space-y-4">
        <p>Open this page in several tabs → send a notification → all tabs light up!</p>

        <h2 className="text-2xl">Received ({notifs.length})</h2>
        <ul className="list-disc pl-8">
          {notifs.map((n, i) => (
            <li key={i}>
              <strong>{n.title}</strong>: {n.body}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}