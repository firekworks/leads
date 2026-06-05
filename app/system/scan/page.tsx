import { AuthGate } from "@/components/AuthGate";
import { ScanWorkspace } from "@/components/ScanWorkspace";

export default function SystemScanPage() {
  return (
    <AuthGate>
      <ScanWorkspace />
    </AuthGate>
  );
}
