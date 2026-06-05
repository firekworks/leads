import { redirect } from "next/navigation";

export default function LegacyScanPage() {
  redirect("/system/scan");
}
