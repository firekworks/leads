import { AuthGate } from "@/components/AuthGate";
import { LeadsWorkspace } from "@/components/LeadsWorkspace";

export default function CalendarPage() {
  return (
    <AuthGate>
      <LeadsWorkspace initialView="calendar" />
    </AuthGate>
  );
}
