import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function LeadsListPage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="leads" />
    </AuthGate>
  );
}
