import { AuthGate } from "@/components/AuthGate";
import { ScanWorkspace } from "@/components/ScanWorkspace";

export default function ScanPage() {
  return (
    <AuthGate>
      <ScanWorkspace />
    </AuthGate>
  );
}
