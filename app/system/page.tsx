import { AuthGate } from "@/components/AuthGate";
import { SystemWorkspace } from "@/components/SystemWorkspace";

export default function SystemPage() {
  return (
    <AuthGate>
      <SystemWorkspace />
    </AuthGate>
  );
}
