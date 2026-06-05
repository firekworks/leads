import { AuthGate } from "@/components/AuthGate";
import { DataQualityWorkspace } from "@/components/DataQualityWorkspace";

export default function DataQualityPage() {
  return (
    <AuthGate>
      <DataQualityWorkspace />
    </AuthGate>
  );
}
