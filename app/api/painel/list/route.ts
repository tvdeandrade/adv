import { NextRequest, NextResponse } from "next/server";
import { listRequests } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("admin_auth")?.value;
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || cookie !== expected) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const items = await listRequests();
  return NextResponse.json({ items });
}
