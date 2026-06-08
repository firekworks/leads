import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function MapPage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="map" />
    </AuthGate>
  );
}
