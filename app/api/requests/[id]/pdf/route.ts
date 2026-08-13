import { NextRequest } from "next/server";
import { getRequest } from "@/lib/db";
import { generateTravelRequestPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const travelRequest = await getRequest(params.id);
  if (!travelRequest) {
    return new Response("Solicitação não encontrada.", { status: 404 });
  }
  const pdf = await generateTravelRequestPdf(travelRequest);
  return new Response(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="adiantamento-viagem-${travelRequest.id}.pdf"`,
    },
  });
}
