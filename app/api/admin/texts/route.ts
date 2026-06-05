import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireInternalUser(request);
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.admin
    .from("app_texts")
    .select("id, app, key, value, description, category, is_public, updated_at")
    .order("app", { ascending: true })
    .order("category", { ascending: true })
    .order("key", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ texts: data || [] });
}

export async function PUT(request: Request) {
  const auth = await requireInternalUser(request, { admin: true });
  if ("response" in auth) return auth.response;

  const body = (await request.json()) as {
    text?: {
      app?: string;
      key?: string;
      value?: string;
      description?: string;
      category?: string;
      is_public?: boolean;
    };
  };
  const text = body.text;

  if (!text?.app || !text.key || typeof text.value !== "string") {
    return NextResponse.json({ error: "Texto incompleto" }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("app_texts")
    .upsert({
      app: text.app,
      key: text.key,
      value: text.value,
      description: text.description || "",
      category: text.category || "general",
      is_public: Boolean(text.is_public),
      updated_by: auth.user.id
    })
    .select("id, app, key, value, description, category, is_public, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ text: data });
}
