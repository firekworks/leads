import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function ProspectingPage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="prospecting" />
    </AuthGate>
  );
}
