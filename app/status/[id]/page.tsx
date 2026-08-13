import { getRequest } from "@/lib/db";
import { STAGE_LABELS, STATUS_LABELS } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StatusPage({ params }: { params: { id: string } }) {
  const req = await getRequest(params.id);
  if (!req) notFound();

  const totalDespesas = req.despesas.reduce((s, d) => s + (Number(d.valor) || 0), 0);

  const statusColor =
    req.status === "aprovado" ? "text-emerald-700" : req.status === "rejeitado" ? "text-red-600" : "text-amber-600";

  return (
    <main className="mx-auto max-w-2xl px-4 py-14">
      <div className="section-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Adiantamento de Despesas de Viagem
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{req.beneficiario.nome}</h1>
        <p className={`mt-2 text-lg font-bold ${statusColor}`}>{STATUS_LABELS[req.status]}</p>

        <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-400">Destino</dt>
            <dd>{req.viagem.destinoInicial || "—"} → {req.viagem.destinoFinal || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Período</dt>
            <dd>
              {req.viagem.previsaoSaida || "—"} a {req.viagem.previsaoRetorno || "—"} ({req.viagem.dias} dia(s))
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Total de despesas lançadas</dt>
            <dd>{totalDespesas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Total diárias + passagens</dt>
            <dd>
              {(req.financeiro.valorTotalDiarias + req.financeiro.valorPassagens).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </dd>
          </div>
        </dl>

        <h2 className="mt-8 mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Histórico</h2>
        <ul className="space-y-1 text-sm text-slate-600">
          {req.historico.map((h, i) => (
            <li key={i}>
              {new Date(h.em).toLocaleString("pt-BR")} —{" "}
              {h.etapa === "criacao" ? "Solicitação criada" : `${STAGE_LABELS[h.etapa]}: ${h.acao}`}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <a
            href={`/api/requests/${req.id}/pdf`}
            target="_blank"
            className="text-sm font-semibold text-slate-700 hover:underline"
          >
            Baixar PDF da solicitação →
          </a>
        </div>
      </div>
    </main>
  );
}
