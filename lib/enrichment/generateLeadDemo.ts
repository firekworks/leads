import type { Lead } from "@/types/lead";
import { estimateAdBudget, estimateMonthlyValue, recommendServicePlan } from "@/lib/scoring";

export function buildLeadDemo(lead: Lead) {
  const plan = recommendServicePlan(lead);
  const monthly = estimateMonthlyValue(lead);
  const demand = lead.reviews
    ? `${lead.rating || "-"} estrellas y ${lead.reviews} reseñas`
    : "demanda pendiente de verificar";
  const gap = missingSignal(lead);
  const summary = `${lead.name} · ${lead.city}. ${demand}. ${gap}`;
  const problem = lead.reviews >= 60
    ? `Hay atención local, pero falta convertirla en consultas medibles. ${gap}`
    : `El primer paso es validar demanda real y ordenar los canales de captación. ${gap}`;
  const opportunity = lead.phone || lead.whatsappUrl
    ? "Puede activarse un sistema de WhatsApp Business + landing + Meta Ads con seguimiento humano."
    : "Primero conviene completar contacto y después preparar una oferta simple de captación.";
  const proposal = `${plan.name}: ${plan.focus}. ${plan.visits}, ${plan.content}, ads sugeridos ${estimateAdBudget(lead)}€/mes.`;

  return {
    summary,
    problem,
    opportunity,
    hook: "Diagnóstico visual + captación local + seguimiento por WhatsApp.",
    proposal,
    offer: monthly ? `Mensualidad estimada ${monthly}€/mes + ads desde ${estimateAdBudget(lead)}€.` : "Oferta pendiente de validar.",
    landing: `Landing para ${lead.name}: propuesta clara, prueba social, fotos/vídeos propios, CTA WhatsApp, formulario y SEO local para ${lead.city}.`,
    metaAds: `Campaña Meta Ads local con reels/anuncios grabados, radio cercano y objetivo conversación/reserva.`,
    whatsapp: `Hola, soy Firekworks. He visto ${lead.name} y creo que hay margen para convertir más búsquedas locales en consultas. ¿Te puedo enseñar una idea rápida de 2 minutos?`,
    instagram: `Hola, soy Firekworks. Trabajo captación local con contenido profesional, Meta Ads, Google Business y WhatsApp. He visto una oportunidad concreta para ${lead.name}: ${gap}`,
    visitScript: "Abrir con observación real, enseñar una demo visual breve, preguntar por captación actual y cerrar siguiente paso de diagnóstico.",
    objections: "Precio: empezar pequeño. Tiempo: una visita mensual. Dudas: demo visual antes de propuesta cerrada.",
    nextStep: "Preparar demo breve y proponer visita presencial de 15 minutos."
  };
}

function missingSignal(lead: Lead) {
  if (!lead.website) return "No se ha verificado una web/landing clara.";
  if (!lead.instagramUrl) return "No se ha verificado un Instagram oficial.";
  if (!lead.whatsappUrl) return "No se ha verificado WhatsApp como canal principal.";
  return "Conviene ordenar campaña, contenido y seguimiento.";
}
