import { NextRequest } from "next/server";
import { getRequest, saveRequest } from "@/lib/db";
import { verifyAction } from "@/lib/token";
import { generateTravelRequestPdf } from "@/lib/pdf";
import { sendApprovalRequestEmail, sendFinalApprovedEmail, sendRejectedEmail } from "@/lib/email";
import { NEXT_STAGE, STAGE_LABELS, STAGE_TO_STATUS, type Stage } from "@/lib/types";

export const runtime = "nodejs";

function htmlPage(title: string, message: string, color: string) {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .card{background:#fff;padding:32px 40px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;text-align:center}
  h1{color:${color};font-size:20px;margin-bottom:12px}
  p{color:#334155;font-size:15px;line-height:1.5}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

function htmlResponse(body: string, status = 200) {
  return new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

const VALID_STAGES: Stage[] = ["chefia", "diretor", "financeiro"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";
  const stage = searchParams.get("stage") as Stage | null;
  const action = searchParams.get("action");
  const token = searchParams.get("token") || "";

  if (!id || !stage || !VALID_STAGES.includes(stage) || (action !== "aprovar" && action !== "rejeitar")) {
    return htmlResponse(htmlPage("Link inválido", "Este link de aprovação está incompleto ou incorreto.", "#dc2626"), 400);
  }

  if (!verifyAction(id, stage, action, token)) {
    return htmlResponse(htmlPage("Link inválido", "Este link de aprovação não é válido ou foi adulterado.", "#dc2626"), 400);
  }

  const travelRequest = await getRequest(id);
  if (!travelRequest) {
    return htmlResponse(htmlPage("Não encontrado", "Esta solicitação não foi encontrada.", "#dc2626"), 404);
  }

  const expectedStatus = STAGE_TO_STATUS[stage];
  if (travelRequest.status !== expectedStatus) {
    return htmlResponse(
      htmlPage(
        "Já processado",
        `Esta solicitação já foi processada anteriormente e está com o status: <b>${travelRequest.status}</b>. Nenhuma ação adicional foi tomada.`,
        "#0f172a"
      )
    );
  }

  const now = new Date().toISOString();

  if (action === "rejeitar") {
    travelRequest.status = "rejeitado";
    travelRequest.historico.push({ etapa: stage, acao: "rejeitado", em: now });
    await saveRequest(travelRequest);
    try {
      const pdf = await generateTravelRequestPdf(travelRequest);
      await sendRejectedEmail(travelRequest, stage, undefined, pdf);
    } catch {
      // não bloqueia a resposta ao aprovador se o e-mail falhar
    }
    return htmlResponse(
      htmlPage(
        "Solicitação rejeitada",
        `Você rejeitou a solicitação de <b>${travelRequest.beneficiario.nome}</b> na etapa <b>${STAGE_LABELS[stage]}</b>. O beneficiário foi notificado.`,
        "#dc2626"
      )
    );
  }

  // aprovar
  travelRequest.historico.push({ etapa: stage, acao: "aprovado", em: now });
  const next = NEXT_STAGE[stage];

  try {
    const pdf = await generateTravelRequestPdf({
      ...travelRequest,
      status: next ? STAGE_TO_STATUS[next] : "aprovado",
    });

    if (next) {
      travelRequest.status = STAGE_TO_STATUS[next];
      await saveRequest(travelRequest);
      const nextEmail =
        next === "chefia"
          ? travelRequest.aprovadores.chefiaEmail
          : next === "diretor"
          ? travelRequest.aprovadores.diretorEmail
          : process.env.FINANCE_EMAIL || "";
      if (nextEmail) {
        await sendApprovalRequestEmail(travelRequest, next, nextEmail, pdf);
      }
    } else {
      travelRequest.status = "aprovado";
      await saveRequest(travelRequest);
      await sendFinalApprovedEmail(travelRequest, pdf);
    }
  } catch (err: any) {
    await saveRequest(travelRequest);
    return htmlResponse(
      htmlPage(
        "Aprovado (com aviso)",
        `A aprovação foi registrada, mas houve falha ao enviar o e-mail para a próxima etapa: ${
          err.message || "erro desconhecido"
        }.`,
        "#d97706"
      )
    );
  }

  return htmlResponse(
    htmlPage(
      "Aprovado",
      `Você aprovou a solicitação de <b>${travelRequest.beneficiario.nome}</b> na etapa <b>${STAGE_LABELS[stage]}</b>. ${
        next ? `Ela foi encaminhada para a próxima etapa: <b>${STAGE_LABELS[next]}</b>.` : "Todas as etapas foram concluídas e o financeiro foi notificado."
      }`,
      "#16a34a"
    )
  );
}
