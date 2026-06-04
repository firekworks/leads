"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase");

  const next = String(formData.get("next") || "/");
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=supabase");

  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  redirect("/login?notice=check-email");
}
