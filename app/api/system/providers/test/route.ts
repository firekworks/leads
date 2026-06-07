import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";
import { listProviderHealth } from "@/lib/enrichment/providers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireInternalUser(request);
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    providers: listProviderHealth(),
    message: "Test seguro: no hace llamadas externas de coste."
  });
}

export async function POST(request: Request) {
  return GET(request);
}
