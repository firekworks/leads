import { AuthGate } from "@/components/AuthGate";
import { SocialImportWorkspace } from "@/components/SocialImportWorkspace";

export default function SocialImportPage() {
  return (
    <AuthGate>
      <SocialImportWorkspace />
    </AuthGate>
  );
}
