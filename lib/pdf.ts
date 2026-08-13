import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { TravelRequest, MeioTransporte } from "./types";
import { STATUS_LABELS } from "./types";

const MEIO_LABELS: Record<MeioTransporte, string> = {
  terrestre: "Terrestre",
  aerea: "Aérea",
  frota: "Frota",
  outro: "Outro",
};

function formatMoney(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

interface Cell {
  label: string;
  value: string;
  width: number; // fraction of table width, 0..1
}

class TableDrawer {
  constructor(
    private page: PDFPage,
    private font: PDFFont,
    private bold: PDFFont,
    private x: number,
    private width: number,
    public y: number
  ) {}

  row(cells: Cell[], height = 32) {
    const { page, font, bold, x, width } = this;
    let cx = x;
    for (const cell of cells) {
      const w = cell.width * width;
      page.drawRectangle({
        x: cx,
        y: this.y - height,
        width: w,
        height,
        borderColor: rgb(0.55, 0.55, 0.55),
        borderWidth: 0.75,
      });
      page.drawText(cell.label.toUpperCase(), {
        x: cx + 4,
        y: this.y - 10,
        size: 6.5,
        font: bold,
        color: rgb(0.4, 0.4, 0.4),
      });
      const value = cell.value && cell.value.length > 0 ? cell.value : "";
      page.drawText(truncate(value, w - 8, font, 9), {
        x: cx + 4,
        y: this.y - height + 8,
        size: 9,
        font,
        color: rgb(0.05, 0.05, 0.05),
      });
      cx += w;
    }
    this.y -= height;
  }

  sectionTitle(title: string) {
    this.page.drawRectangle({
      x: this.x,
      y: this.y - 16,
      width: this.width,
      height: 16,
      color: rgb(0.09, 0.13, 0.24),
    });
    this.page.drawText(title.toUpperCase(), {
      x: this.x + 6,
      y: this.y - 12,
      size: 8.5,
      font: this.bold,
      color: rgb(1, 1, 1),
    });
    this.y -= 16;
  }

  gap(h: number) {
    this.y -= h;
  }
}

function truncate(text: string, maxWidth: number, font: PDFFont, size: number): string {
  if (!text) return "";
  let t = text;
  while (t.length > 0 && font.widthOfTextAtSize(t, size) > maxWidth) {
    t = t.slice(0, -1);
  }
  if (t.length < text.length) {
    t = t.slice(0, Math.max(0, t.length - 1)) + "…";
  }
  return t;
}

export async function generateTravelRequestPdf(req: TravelRequest): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = 40;
  const width = 595.28 - margin * 2;
  let y = 841.89 - margin;

  const companyName = process.env.COMPANY_NAME || "Empresa";

  // Header
  page.drawText(companyName, { x: margin, y, size: 9, font: bold, color: rgb(0.3, 0.3, 0.3) });
  page.drawText("Diretoria de Operações", {
    x: 595.28 - margin - 130,
    y,
    size: 9,
    font: bold,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 22;

  page.drawRectangle({
    x: margin,
    y: y - 22,
    width,
    height: 22,
    borderColor: rgb(0.05, 0.05, 0.05),
    borderWidth: 1,
  });
  page.drawText("ADIANTAMENTO DE DESPESAS DE VIAGEM", {
    x: margin + 10,
    y: y - 16,
    size: 12,
    font: bold,
  });
  y -= 22 + 14;

  const t = new TableDrawer(page, font, bold, margin, width, y);

  // Beneficiário
  t.row([
    { label: "Beneficiário", value: req.beneficiario.nome, width: 0.4 },
    { label: "Cargo", value: req.beneficiario.cargo, width: 0.22 },
    { label: "Matrícula", value: req.beneficiario.matricula, width: 0.16 },
    { label: "Empresa", value: req.beneficiario.empresa, width: 0.22 },
  ]);

  // Destino / datas
  t.row([
    { label: "Destino Inicial", value: req.viagem.destinoInicial, width: 0.28 },
    { label: "Previsão de Saída", value: formatDate(req.viagem.previsaoSaida), width: 0.2 },
    { label: "Previsão de Retorno", value: formatDate(req.viagem.previsaoRetorno), width: 0.2 },
    { label: "Dias", value: String(req.viagem.dias || ""), width: 0.1 },
    {
      label: "Meio(s) de Transporte",
      value: req.viagem.meiosTransporte.map((m) => MEIO_LABELS[m]).join(", "),
      width: 0.22,
    },
  ]);

  t.gap(8);
  t.sectionTitle("Despesas");

  // Despesas header
  const despesaCols = [
    { label: "Data", width: 0.12 },
    { label: "Descrição do Gasto", width: 0.34 },
    { label: "Valor", width: 0.14 },
    { label: "Nº do Documento", width: 0.18 },
    { label: "Fornecedor", width: 0.22 },
  ];
  const rows = req.despesas.length > 0 ? req.despesas : [];
  for (const d of rows) {
    t.row(
      [
        { label: "", value: formatDate(d.data), width: despesaCols[0].width },
        { label: "", value: d.descricao, width: despesaCols[1].width },
        { label: "", value: formatMoney(d.valor || 0), width: despesaCols[2].width },
        { label: "", value: d.numDocumento, width: despesaCols[3].width },
        { label: "", value: d.fornecedor, width: despesaCols[4].width },
      ],
      22
    );
  }
  const totalDespesas = rows.reduce((s, d) => s + (Number(d.valor) || 0), 0);
  t.row(
    [
      { label: "", value: "", width: 0.6 },
      { label: "Total de Despesas", value: formatMoney(totalDespesas), width: 0.4 },
    ],
    32
  );

  t.gap(8);

  // Destino final/retorno
  t.row([
    { label: "Destino Final", value: req.viagem.destinoFinal, width: 0.5 },
    { label: "Destino de Retorno", value: req.viagem.destinoRetorno, width: 0.5 },
  ]);

  // Finalidade
  t.row([{ label: "Finalidade", value: req.finalidade, width: 1 }], 50);

  t.gap(8);
  t.sectionTitle("Aprovações");
  t.row([
    { label: "Chefia Imediata", value: req.aprovadores.chefiaEmail, width: 0.5 },
    { label: "Diretor da Área", value: req.aprovadores.diretorEmail, width: 0.5 },
  ]);

  t.gap(8);
  t.sectionTitle("Financeiro");
  t.row([
    { label: "Centro de Custo", value: req.financeiro.centroCusto, width: 0.24 },
    { label: "Classe da Diária", value: req.financeiro.classeDiaria, width: 0.19 },
    { label: "Valor Unitário Diária", value: formatMoney(req.financeiro.valorUnitarioDiaria || 0), width: 0.19 },
    { label: "Valor Total Diárias", value: formatMoney(req.financeiro.valorTotalDiarias || 0), width: 0.19 },
    { label: "Valor das Passagens", value: formatMoney(req.financeiro.valorPassagens || 0), width: 0.19 },
  ]);

  t.row([
    { label: "Banco do Beneficiário", value: req.banco.nome, width: 0.4 },
    { label: "Conta Corrente", value: req.banco.contaCorrente, width: 0.3 },
    { label: "Agência", value: req.banco.agencia, width: 0.3 },
  ]);

  t.gap(14);
  page.drawText(`Status atual: ${STATUS_LABELS[req.status]}`, {
    x: margin,
    y: t.y,
    size: 10,
    font: bold,
  });
  t.gap(16);
  page.drawText("Histórico:", { x: margin, y: t.y, size: 9, font: bold });
  t.gap(14);
  for (const h of req.historico) {
    const line = `${new Date(h.em).toLocaleString("pt-BR")} — ${h.etapa} — ${h.acao}${
      h.motivo ? " (" + h.motivo + ")" : ""
    }`;
    page.drawText(line, { x: margin, y: t.y, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
    t.gap(12);
  }

  page.drawText(`ID da solicitação: ${req.id}`, {
    x: margin,
    y: 30,
    size: 7,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return doc.save();
}
