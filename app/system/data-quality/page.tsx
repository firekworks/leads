import { AuthGate } from "@/components/AuthGate";
import { DataQualityWorkspace } from "@/components/DataQualityWorkspace";

export default function SystemDataQualityPage() {
  return (
    <AuthGate>
      <DataQualityWorkspace />
    </AuthGate>
  );
}
