import { redirect } from "next/navigation";

export default function RadarPage() {
  redirect("/opportunities?mode=map");
}
