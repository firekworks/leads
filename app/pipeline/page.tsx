import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function PipelinePage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="pipeline" />
    </AuthGate>
  );
}
