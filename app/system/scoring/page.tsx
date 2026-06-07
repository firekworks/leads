import { AuthGate } from "@/components/AuthGate";
import { ScoringWorkspace } from "@/components/ScoringWorkspace";

export default function SystemScoringPage() {
  return (
    <AuthGate>
      <ScoringWorkspace />
    </AuthGate>
  );
}
