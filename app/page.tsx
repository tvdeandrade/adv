"use client";

import { useMemo, useState } from "react";
import type { Despesa, MeioTransporte } from "@/lib/types";

const MEIOS: { value: MeioTransporte; label: string }[] = [
  { value: "terrestre", label: "Terrestre" },
  { value: "aerea", label: "Aérea" },
  { value: "frota", label: "Frota" },
  { value: "outro", label: "Outro" },
];

function emptyDespesa(): Despesa {
  return { data: "", descricao: "", valor: 0, numDocumento: "", fornecedor: "" };
}

function diffDias(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const a = new Date(inicio);
  const b = new Date(fim);
  const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default function HomePage() {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [matricula, setMatricula] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");

  const [chefiaEmail, setChefiaEmail] = useState("");
  const [diretorEmail, setDiretorEmail] = useState("");

  const [destinoInicial, setDestinoInicial] = useState("");
  const [previsaoSaida, setPrevisaoSaida] = useState("");
  const [previsaoRetorno, setPrevisaoRetorno] = useState("");
  const [diasManual, setDiasManual] = useState<number | null>(null);
  const [meiosTransporte, setMeiosTransporte] = useState<MeioTransporte[]>([]);
  const [destinoFinal, setDestinoFinal] = useState("");
  const [destinoRetorno, setDestinoRetorno] = useState("");

  const [finalidade, setFinalidade] = useState("");

  const [despesas, setDespesas] = useState<Despesa[]>([emptyDespesa()]);

  const [centroCusto, setCentroCusto] = useState("");
  const [classeDiaria, setClasseDiaria] = useState("");
  const [valorUnitarioDiaria, setValorUnitarioDiaria] = useState(0);
  const [valorTotalDiariasManual, setValorTotalDiariasManual] = useState<number | null>(null);
  const [valorPassagens, setValorPassagens] = useState(0);

  const [bancoNome, setBancoNome] = useState("");
  const [contaCorrente, setContaCorrente] = useState("");
  const [agencia, setAgencia] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ id?: string; erro?: string; aviso?: string } | null>(null);

  const dias = diasManual ?? diffDias(previsaoSaida, previsaoRetorno);
  const valorTotalDiarias = valorTotalDiariasManual ?? dias * (Number(valorUnitarioDiaria) || 0);
  const totalDespesas = despesas.reduce((s, d) => s + (Number(d.valor) || 0), 0);

  function toggleMeio(m: MeioTransporte) {
    setMeiosTransporte((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  }

  function updateDespesa(idx: number, patch: Partial<Despesa>) {
    setDespesas((cur) => cur.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  function addDespesa() {
    setDespesas((cur) => [...cur, emptyDespesa()]);
  }

  function removeDespesa(idx: number) {
    setDespesas((cur) => (cur.length > 1 ? cur.filter((_, i) => i !== idx) : cur));
  }

  const podeEnviar = useMemo(() => {
    return Boolean(nome && email && chefiaEmail && diretorEmail);
  }, [nome, email, chefiaEmail, diretorEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);

    const payload = {
      beneficiario: { nome, cargo, matricula, empresa, email },
      aprovadores: { chefiaEmail, diretorEmail },
      viagem: {
        destinoInicial,
        previsaoSaida,
        previsaoRetorno,
        dias,
        meiosTransporte,
        destinoFinal,
        destinoRetorno,
      },
      finalidade,
      despesas,
      financeiro: {
        centroCusto,
        classeDiaria,
        valorUnitarioDiaria,
        valorTotalDiarias,
        valorPassagens,
      },
      banco: { nome: bancoNome, contaCorrente, agencia },
    };

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setResultado({ erro: json.error || "Falha ao enviar a solicitação." });
      } else {
        setResultado({ id: json.id, aviso: json.warning });
      }
    } catch (err: any) {
      setResultado({ erro: err.message || "Falha ao enviar a solicitação." });
    } finally {
      setEnviando(false);
    }
  }

  if (resultado?.id) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="section-card text-center">
          <h1 className="mb-2 text-xl font-bold text-emerald-700">Solicitação enviada ✔</h1>
          <p className="mb-1 text-slate-600">
            Sua solicitação foi registrada e enviada para aprovação da Chefia Imediata.
          </p>
          {resultado.aviso && (
            <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-700">{resultado.aviso}</p>
          )}
          <div className="mt-6 flex flex-col items-center gap-2">
            <a className="text-sm text-slate-500" href={`/status/${resultado.id}`}>
              Acompanhar status desta solicitação
            </a>
            <a className="text-sm text-slate-500" href={`/api/requests/${resultado.id}/pdf`} target="_blank">
              Baixar PDF da solicitação
            </a>
          </div>
          <button
            className="mt-8 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setResultado(null)}
          >
            Nova solicitação
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Diretoria de Operações
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Adiantamento de Despesas de Viagem</h1>
        <p className="mt-1 text-sm text-slate-500">
          Preencha os dados abaixo. Ao enviar, a solicitação seguirá automaticamente para aprovação da
          Chefia Imediata, Diretor da Área e Financeiro, por e-mail.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="section-card">
          <h2 className="section-title">Beneficiário</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="field-label">Beneficiário *</label>
              <input className="field-input" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div>
              <label className="field-label">Cargo</label>
              <input className="field-input" value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Matrícula</label>
              <input className="field-input" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Empresa</label>
              <input className="field-input" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="field-label">Seu e-mail (para receber confirmações) *</label>
              <input
                type="email"
                className="field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className="section-card">
          <h2 className="section-title">Aprovadores</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">E-mail da Chefia Imediata *</label>
              <input
                type="email"
                className="field-input"
                value={chefiaEmail}
                onChange={(e) => setChefiaEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label">E-mail do Diretor da Área *</label>
              <input
                type="email"
                className="field-input"
                value={diretorEmail}
                onChange={(e) => setDiretorEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className="section-card">
          <h2 className="section-title">Viagem</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="field-label">Destino Inicial</label>
              <input
                className="field-input"
                value={destinoInicial}
                onChange={(e) => setDestinoInicial(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Previsão de Saída</label>
              <input
                type="date"
                className="field-input"
                value={previsaoSaida}
                onChange={(e) => setPrevisaoSaida(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Previsão de Retorno</label>
              <input
                type="date"
                className="field-input"
                value={previsaoRetorno}
                onChange={(e) => setPrevisaoRetorno(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Dias</label>
              <input
                type="number"
                min={0}
                className="field-input"
                value={dias}
                onChange={(e) => setDiasManual(e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="field-label">Meio(s) de Transporte utilizado(s) na viagem</label>
            <div className="flex flex-wrap gap-4">
              {MEIOS.map((m) => (
                <label key={m.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={meiosTransporte.includes(m.value)}
                    onChange={() => toggleMeio(m.value)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Destino Final</label>
              <input className="field-input" value={destinoFinal} onChange={(e) => setDestinoFinal(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Destino de Retorno</label>
              <input
                className="field-input"
                value={destinoRetorno}
                onChange={(e) => setDestinoRetorno(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="field-label">Finalidade (se necessário, anexe documentos de suporte por e-mail ao aprovador)</label>
            <textarea
              className="field-input"
              rows={3}
              value={finalidade}
              onChange={(e) => setFinalidade(e.target.value)}
            />
          </div>
        </section>

        <section className="section-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title mb-0">Despesas</h2>
            <button
              type="button"
              onClick={addDespesa}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              + Adicionar linha
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-slate-500">
                  <th className="pb-2">Data</th>
                  <th className="pb-2">Descrição do Gasto</th>
                  <th className="pb-2">Valor</th>
                  <th className="pb-2">Nº do Documento</th>
                  <th className="pb-2">Fornecedor</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((d, idx) => (
                  <tr key={idx} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2">
                      <input
                        type="date"
                        className="field-input"
                        value={d.data}
                        onChange={(e) => updateDespesa(idx, { data: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        className="field-input"
                        value={d.descricao}
                        onChange={(e) => updateDespesa(idx, { descricao: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        step="0.01"
                        className="field-input"
                        value={d.valor}
                        onChange={(e) => updateDespesa(idx, { valor: Number(e.target.value) })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        className="field-input"
                        value={d.numDocumento}
                        onChange={(e) => updateDespesa(idx, { numDocumento: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        className="field-input"
                        value={d.fornecedor}
                        onChange={(e) => updateDespesa(idx, { fornecedor: e.target.value })}
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeDespesa(idx)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-right text-sm font-semibold text-slate-700">
            Total de despesas:{" "}
            {totalDespesas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </section>

        <section className="section-card">
          <h2 className="section-title">Financeiro</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="field-label">Centro de Custo</label>
              <input className="field-input" value={centroCusto} onChange={(e) => setCentroCusto(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Classe da Diária</label>
              <input className="field-input" value={classeDiaria} onChange={(e) => setClasseDiaria(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Valor Unitário da Diária</label>
              <input
                type="number"
                step="0.01"
                className="field-input"
                value={valorUnitarioDiaria}
                onChange={(e) => setValorUnitarioDiaria(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="field-label">Valor Total das Diárias</label>
              <input
                type="number"
                step="0.01"
                className="field-input"
                value={valorTotalDiarias}
                onChange={(e) =>
                  setValorTotalDiariasManual(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
            <div>
              <label className="field-label">Valor das Passagens</label>
              <input
                type="number"
                step="0.01"
                className="field-input"
                value={valorPassagens}
                onChange={(e) => setValorPassagens(Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        <section className="section-card">
          <h2 className="section-title">Dados Bancários do Beneficiário</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="field-label">Banco</label>
              <input className="field-input" value={bancoNome} onChange={(e) => setBancoNome(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Conta Corrente</label>
              <input
                className="field-input"
                value={contaCorrente}
                onChange={(e) => setContaCorrente(e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Agência</label>
              <input className="field-input" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
            </div>
          </div>
        </section>

        {resultado?.erro && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{resultado.erro}</div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!podeEnviar || enviando}
            className="rounded-md bg-slate-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {enviando ? "Enviando..." : "Enviar solicitação para aprovação"}
          </button>
        </div>
      </form>

      <footer className="mt-10 text-center text-xs text-slate-400">
        <a href="/painel" className="hover:underline">
          Painel do Financeiro
        </a>
      </footer>
    </main>
  );
}
