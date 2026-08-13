import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { saveRequest } from "@/lib/db";
import { generateTravelRequestPdf } from "@/lib/pdf";
import { sendApprovalRequestEmail, sendCreatedConfirmationEmail } from "@/lib/email";
import type { TravelRequest } from "@/lib/types";

export const runtime = "nodejs";

const despesaSchema = z.object({
  data: z.string().optional().default(""),
  descricao: z.string().optional().default(""),
  valor: z.coerce.number().optional().default(0),
  numDocumento: z.string().optional().default(""),
  fornecedor: z.string().optional().default(""),
});

const bodySchema = z.object({
  beneficiario: z.object({
    nome: z.string().min(1, "Informe o nome do beneficiário"),
    cargo: z.string().optional().default(""),
    matricula: z.string().optional().default(""),
    empresa: z.string().optional().default(""),
    email: z.string().email("E-mail do beneficiário inválido"),
  }),
  aprovadores: z.object({
    chefiaEmail: z.string().email("E-mail da chefia inválido"),
    diretorEmail: z.string().email("E-mail do diretor inválido"),
  }),
  viagem: z.object({
    destinoInicial: z.string().optional().default(""),
    previsaoSaida: z.string().optional().default(""),
    previsaoRetorno: z.string().optional().default(""),
    dias: z.coerce.number().optional().default(0),
    meiosTransporte: z.array(z.enum(["terrestre", "aerea", "frota", "outro"])).optional().default([]),
    destinoFinal: z.string().optional().default(""),
    destinoRetorno: z.string().optional().default(""),
  }),
  finalidade: z.string().optional().default(""),
  despesas: z.array(despesaSchema).optional().default([]),
  financeiro: z.object({
    centroCusto: z.string().optional().default(""),
    classeDiaria: z.string().optional().default(""),
    valorUnitarioDiaria: z.coerce.number().optional().default(0),
    valorTotalDiarias: z.coerce.number().optional().default(0),
    valorPassagens: z.coerce.number().optional().default(0),
  }),
  banco: z.object({
    nome: z.string().optional().default(""),
    contaCorrente: z.string().optional().default(""),
    agencia: z.string().optional().default(""),
  }),
});

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const now = new Date().toISOString();

  const travelRequest: TravelRequest = {
    id: uuidv4(),
    criadoEm: now,
    status: "aguardando_chefia",
    beneficiario: data.beneficiario,
    aprovadores: data.aprovadores,
    viagem: data.viagem,
    finalidade: data.finalidade,
    despesas: data.despesas,
    financeiro: data.financeiro,
    banco: data.banco,
    historico: [{ etapa: "criacao", acao: "criado", em: now }],
  };

  try {
    await saveRequest(travelRequest);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Falha ao salvar a solicitação." }, { status: 500 });
  }

  // Geração de PDF e envio de e-mails não devem impedir a criação da solicitação
  // caso o financeiro/e-mail ainda não esteja configurado — mas reportamos o erro.
  try {
    const pdf = await generateTravelRequestPdf(travelRequest);
    await sendCreatedConfirmationEmail(travelRequest, pdf);
    await sendApprovalRequestEmail(travelRequest, "chefia", travelRequest.aprovadores.chefiaEmail, pdf);
  } catch (err: any) {
    return NextResponse.json(
      {
        id: travelRequest.id,
        warning:
          "Solicitação criada, mas houve falha ao enviar e-mails: " +
          (err.message || "erro desconhecido") +
          ". Verifique a configuração de RESEND_API_KEY no servidor.",
      },
      { status: 201 }
    );
  }

  return NextResponse.json({ id: travelRequest.id }, { status: 201 });
}
