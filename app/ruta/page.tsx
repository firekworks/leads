import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function RutaPage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="ruta" />
    </AuthGate>
  );
}
