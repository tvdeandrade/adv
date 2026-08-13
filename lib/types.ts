export type MeioTransporte = "terrestre" | "aerea" | "frota" | "outro";

export interface Despesa {
  data: string;
  descricao: string;
  valor: number;
  numDocumento: string;
  fornecedor: string;
}

export type Stage = "chefia" | "diretor" | "financeiro";

export type Status =
  | "aguardando_chefia"
  | "aguardando_diretor"
  | "aguardando_financeiro"
  | "aprovado"
  | "rejeitado";

export interface HistoricoItem {
  etapa: Stage | "criacao";
  acao: "criado" | "aprovado" | "rejeitado";
  em: string;
  motivo?: string;
}

export interface TravelRequest {
  id: string;
  criadoEm: string;
  status: Status;

  beneficiario: {
    nome: string;
    cargo: string;
    matricula: string;
    empresa: string;
    email: string;
  };

  aprovadores: {
    chefiaEmail: string;
    diretorEmail: string;
  };

  viagem: {
    destinoInicial: string;
    previsaoSaida: string;
    previsaoRetorno: string;
    dias: number;
    meiosTransporte: MeioTransporte[];
    destinoFinal: string;
    destinoRetorno: string;
  };

  finalidade: string;

  despesas: Despesa[];

  financeiro: {
    centroCusto: string;
    classeDiaria: string;
    valorUnitarioDiaria: number;
    valorTotalDiarias: number;
    valorPassagens: number;
  };

  banco: {
    nome: string;
    contaCorrente: string;
    agencia: string;
  };

  historico: HistoricoItem[];
}

export const STAGE_LABELS: Record<Stage, string> = {
  chefia: "Chefia Imediata",
  diretor: "Diretor da Área",
  financeiro: "Área de Finanças",
};

export const STATUS_LABELS: Record<Status, string> = {
  aguardando_chefia: "Aguardando aprovação da Chefia Imediata",
  aguardando_diretor: "Aguardando aprovação do Diretor da Área",
  aguardando_financeiro: "Aguardando aprovação da Área de Finanças",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export const NEXT_STAGE: Record<Stage, Stage | null> = {
  chefia: "diretor",
  diretor: "financeiro",
  financeiro: null,
};

export const STAGE_TO_STATUS: Record<Stage, Status> = {
  chefia: "aguardando_chefia",
  diretor: "aguardando_diretor",
  financeiro: "aguardando_financeiro",
};
