import { redirect } from "next/navigation";

export default function MapPage() {
  redirect("/opportunities?mode=map");
}
