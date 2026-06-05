import { AuthGate } from "@/components/AuthGate";
import { TextsAdmin } from "@/components/TextsAdmin";

export default function SystemTextsPage() {
  return (
    <AuthGate>
      <TextsAdmin />
    </AuthGate>
  );
}
