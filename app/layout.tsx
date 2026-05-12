import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOX",
  description: "Personal AI operating system.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-nox-bg text-nox-ink font-sans antialiased scanline">
        {children}
      </body>
    </html>
  );
}
