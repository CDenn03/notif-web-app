import "./globals.css";
import { NotificationProvider } from "@/components/NotificationContext";

export const metadata = {
  title: "Next.js + Deno Realtime Notifications",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}