import { AuthGate } from "@/components/AuthGate";
import { ProvidersWorkspace } from "@/components/ProvidersWorkspace";

export default function SystemProvidersPage() {
  return (
    <AuthGate>
      <ProvidersWorkspace />
    </AuthGate>
  );
}
