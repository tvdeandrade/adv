import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adiantamento de Despesas de Viagem",
  description: "Solicitação online de adiantamento de despesas de viagem",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-100 text-slate-900">{children}</body>
    </html>
  );
}
