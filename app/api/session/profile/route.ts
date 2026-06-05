import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireInternalUser(request);
  if ("response" in auth) return auth.response;

  return NextResponse.json({ profile: auth.profile });
}
