import { redirect } from "next/navigation";

export default function LegacyRutaPage() {
  redirect("/opportunities?mode=route");
}
