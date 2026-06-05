import { AuthGate } from "@/components/AuthGate";
import { TextsAdmin } from "@/components/TextsAdmin";

export default function TextsSettingsPage() {
  return (
    <AuthGate>
      <TextsAdmin />
    </AuthGate>
  );
}
