import type { Lead } from "@/types/lead";
import type { ProviderHealth } from "./types";

export function whatsappHealth(): ProviderHealth {
  const connected = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  return {
    id: "whatsapp",
    label: "WhatsApp",
    status: connected ? "connected" : "pending",
    lastSync: "Manual",
    estimatedCost: connected ? "Según Meta" : "0€",
    note: "No envía mensajes automáticamente sin confirmación humana."
  };
}

export function whatsappLink(lead: Pick<Lead, "phone" | "whatsappUrl">, text?: string) {
  if (lead.whatsappUrl) return lead.whatsappUrl;
  const digits = lead.phone.replace(/\D/g, "");
  if (!digits) return "";
  const phone = digits.startsWith("34") ? digits : `34${digits}`;
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
