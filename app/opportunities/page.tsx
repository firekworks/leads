import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function OpportunitiesPage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="opportunities" />
    </AuthGate>
  );
}
