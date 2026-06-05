import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function PulsePage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="pulse" />
    </AuthGate>
  );
}
