import { AuthGate } from "@/components/AuthGate";
import { AdminWorkspace } from "@/components/AdminWorkspace";

export default function AdminPage() {
  return (
    <AuthGate>
      <AdminWorkspace />
    </AuthGate>
  );
}
