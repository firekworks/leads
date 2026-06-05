import { redirect } from "next/navigation";

export default function LegacyDiscardedPage() {
  redirect("/pipeline");
}
