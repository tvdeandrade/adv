"use client";

import { useEffect, useState } from "react";
import type { TravelRequest } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

export default function PainelPage() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [items, setItems] = useState<TravelRequest[] | null>(null);

  async function carregarLista() {
    setCarregando(true);
    const res = await fetch("/api/painel/list");
    if (res.ok) {
      const json = await res.json();
      setItems(json.items);
    } else {
      setItems(null);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregarLista();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const res = await fetch("/api/painel/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setErro(json.error || "Falha ao entrar.");
      return;
    }
    await carregarLista();
  }

  if (!items) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24">
        <form onSubmit={handleLogin} className="section-card space-y-4">
          <h1 className="text-lg font-bold text-slate-900">Painel do Financeiro</h1>
          <div>
            <label className="field-label">Senha</label>
            <input
              type="password"
              className="field-input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
            />
          </div>
          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <button className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Painel do Financeiro</h1>
        <button onClick={carregarLista} className="text-sm text-slate-500 hover:underline">
          Atualizar
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Criado em</th>
              <th className="px-4 py-3">Beneficiário</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhuma solicitação ainda.
                </td>
              </tr>
            )}
            {items.map((r) => {
              const total =
                r.despesas.reduce((s, d) => s + (Number(d.valor) || 0), 0) +
                r.financeiro.valorTotalDiarias +
                r.financeiro.valorPassagens;
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(r.criadoEm).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{r.beneficiario.nome}</td>
                  <td className="px-4 py-3">
                    {r.viagem.destinoInicial} → {r.viagem.destinoFinal}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "aprovado"
                          ? "text-emerald-700 font-semibold"
                          : r.status === "rejeitado"
                          ? "text-red-600 font-semibold"
                          : "text-amber-600 font-semibold"
                      }
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <a className="text-slate-500 hover:underline" href={`/status/${r.id}`} target="_blank">
                      status
                    </a>
                    {" · "}
                    <a className="text-slate-500 hover:underline" href={`/api/requests/${r.id}/pdf`} target="_blank">
                      pdf
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
