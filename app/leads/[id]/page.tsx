import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function LeadPage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="radar" />
    </AuthGate>
  );
}
