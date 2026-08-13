import crypto from "crypto";

function getSecret(): string {
  return process.env.TOKEN_SECRET || "dev-secret-change-me";
}

/** Gera uma assinatura curta para um link de aprovação/rejeição. */
export function signAction(id: string, stage: string, action: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${id}:${stage}:${action}`)
    .digest("hex")
    .slice(0, 32);
}

/** Verifica se o token de um link de aprovação/rejeição é válido. */
export function verifyAction(id: string, stage: string, action: string, token: string): boolean {
  if (!token) return false;
  const expected = signAction(id, stage, action);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
