import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function RoutePage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="route" />
    </AuthGate>
  );
}
