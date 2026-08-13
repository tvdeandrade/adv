import { Resend } from "resend";
import type { Stage, TravelRequest } from "./types";
import { STAGE_LABELS } from "./types";
import { signAction } from "./token";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY não configurado. Veja o README para configurar o envio de e-mails (Resend).");
  }
  return new Resend(key);
}

function appUrl() {
  return process.env.APP_URL || "http://localhost:3000";
}

function fromAddress() {
  return process.env.EMAIL_FROM || "Adiantamento de Viagem <onboarding@resend.dev>";
}

function money(v: number) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function summaryTableHtml(req: TravelRequest): string {
  const totalDespesas = req.despesas.reduce((s, d) => s + (Number(d.valor) || 0), 0);
  return `
  <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px;color:#111">
    <tr><td style="padding:4px 8px;color:#666">Beneficiário</td><td style="padding:4px 8px;font-weight:bold">${req.beneficiario.nome}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Cargo / Matrícula</td><td style="padding:4px 8px">${req.beneficiario.cargo} — ${req.beneficiario.matricula}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Destino</td><td style="padding:4px 8px">${req.viagem.destinoInicial} → ${req.viagem.destinoFinal}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Período</td><td style="padding:4px 8px">${req.viagem.previsaoSaida} a ${req.viagem.previsaoRetorno} (${req.viagem.dias} dia(s))</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Finalidade</td><td style="padding:4px 8px">${req.finalidade}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Total de despesas lançadas</td><td style="padding:4px 8px">${money(totalDespesas)}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Total diárias</td><td style="padding:4px 8px">${money(req.financeiro.valorTotalDiarias)}</td></tr>
    <tr><td style="padding:4px 8px;color:#666">Passagens</td><td style="padding:4px 8px">${money(req.financeiro.valorPassagens)}</td></tr>
  </table>`;
}

function button(label: string, url: string, color: string): string {
  return `<a href="${url}" style="display:inline-block;padding:10px 20px;margin:6px 8px 0 0;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-family:Arial,sans-serif;font-weight:bold;font-size:14px">${label}</a>`;
}

async function sendPdfEmail(opts: {
  to: string;
  subject: string;
  html: string;
  pdf: Uint8Array;
  requestId: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: [
      {
        filename: `adiantamento-viagem-${opts.requestId}.pdf`,
        content: Buffer.from(opts.pdf).toString("base64"),
      },
    ],
  });
}

export async function sendApprovalRequestEmail(req: TravelRequest, stage: Stage, to: string, pdf: Uint8Array) {
  const base = appUrl();
  const approveUrl = `${base}/api/approve?id=${req.id}&stage=${stage}&action=aprovar&token=${signAction(
    req.id,
    stage,
    "aprovar"
  )}`;
  const rejectUrl = `${base}/api/approve?id=${req.id}&stage=${stage}&action=rejeitar&token=${signAction(
    req.id,
    stage,
    "rejeitar"
  )}`;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="color:#0f172a">Aprovação necessária — Adiantamento de Viagem</h2>
    <p>Uma solicitação de adiantamento de despesas de viagem aguarda sua aprovação como <b>${STAGE_LABELS[stage]}</b>.</p>
    ${summaryTableHtml(req)}
    <p style="margin-top:20px">O PDF completo da solicitação está anexado a este e-mail.</p>
    <div style="margin-top:20px">
      ${button("✔ Aprovar", approveUrl, "#16a34a")}
      ${button("✘ Rejeitar", rejectUrl, "#dc2626")}
    </div>
    <p style="margin-top:24px;font-size:12px;color:#888">ID da solicitação: ${req.id}</p>
  </div>`;
  await sendPdfEmail({
    to,
    subject: `Aprovação necessária: Adiantamento de Viagem — ${req.beneficiario.nome}`,
    html,
    pdf,
    requestId: req.id,
  });
}

export async function sendCreatedConfirmationEmail(req: TravelRequest, pdf: Uint8Array) {
  const base = appUrl();
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="color:#0f172a">Solicitação enviada</h2>
    <p>Sua solicitação de adiantamento de despesas de viagem foi enviada e está aguardando aprovação da <b>Chefia Imediata</b>.</p>
    ${summaryTableHtml(req)}
    <p style="margin-top:20px">Você pode acompanhar o status a qualquer momento em:<br/>
      <a href="${base}/status/${req.id}">${base}/status/${req.id}</a></p>
    <p style="margin-top:24px;font-size:12px;color:#888">ID da solicitação: ${req.id}</p>
  </div>`;
  await sendPdfEmail({
    to: req.beneficiario.email,
    subject: `Solicitação recebida: Adiantamento de Viagem — ${req.beneficiario.nome}`,
    html,
    pdf,
    requestId: req.id,
  });
}

export async function sendRejectedEmail(req: TravelRequest, stage: Stage, motivo: string | undefined, pdf: Uint8Array) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="color:#dc2626">Solicitação rejeitada</h2>
    <p>Sua solicitação de adiantamento de despesas de viagem foi <b>rejeitada</b> na etapa <b>${STAGE_LABELS[stage]}</b>.</p>
    ${motivo ? `<p><b>Motivo:</b> ${motivo}</p>` : ""}
    ${summaryTableHtml(req)}
    <p style="margin-top:24px;font-size:12px;color:#888">ID da solicitação: ${req.id}</p>
  </div>`;
  await sendPdfEmail({
    to: req.beneficiario.email,
    subject: `Solicitação rejeitada: Adiantamento de Viagem — ${req.beneficiario.nome}`,
    html,
    pdf,
    requestId: req.id,
  });
}

export async function sendFinalApprovedEmail(req: TravelRequest, pdf: Uint8Array) {
  const financeEmail = process.env.FINANCE_EMAIL;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px">
    <h2 style="color:#16a34a">Solicitação aprovada</h2>
    <p>A solicitação de adiantamento de despesas de viagem foi <b>aprovada em todas as etapas</b> e está liberada para processamento do pagamento.</p>
    ${summaryTableHtml(req)}
    <p style="margin-top:12px"><b>Banco:</b> ${req.banco.nome} — Ag: ${req.banco.agencia} — CC: ${req.banco.contaCorrente}</p>
    <p style="margin-top:24px;font-size:12px;color:#888">ID da solicitação: ${req.id}</p>
  </div>`;
  const recipients = [req.beneficiario.email, financeEmail].filter(Boolean) as string[];
  for (const to of recipients) {
    await sendPdfEmail({
      to,
      subject: `Aprovado: Adiantamento de Viagem — ${req.beneficiario.nome}`,
      html,
      pdf,
      requestId: req.id,
    });
  }
}
