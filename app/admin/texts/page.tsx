import { AuthGate } from "@/components/AuthGate";
import { TextsAdmin } from "@/components/TextsAdmin";

export default function AdminTextsPage() {
  return (
    <AuthGate>
      <TextsAdmin />
    </AuthGate>
  );
}
