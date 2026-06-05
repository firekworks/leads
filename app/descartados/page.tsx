import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function DiscardedLeadsPage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="discarded" />
    </AuthGate>
  );
}
