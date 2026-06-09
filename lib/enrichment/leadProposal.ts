import type { Lead } from "@/types/lead";
import { estimateAdBudget, estimateMonthlyValue, recommendServicePlan } from "@/lib/scoring";

export function buildLeadProposal(lead: Lead) {
  const plan = recommendServicePlan(lead);
  const monthly = estimateMonthlyValue(lead);
  const ads = estimateAdBudget(lead);
  const demand = demandSignal(lead);
  const gap = digitalGap(lead);
  const problem = lead.reviews >= 60
    ? `Tiene demanda local visible, pero falta convertirla en consultas medibles. ${gap}.`
    : `Antes de vender una mensualidad alta conviene validar demanda, contacto y presencia digital. ${gap}.`;
  const opportunity = `Captación local con contenido profesional, Google Business Profile, WhatsApp Business, landing/SEO local y Meta Ads para atraer clientes en ${lead.city}.`;
  const recommendedService = `${plan.name}: ${plan.visits}, ${plan.content}, ${plan.focus}.`;
  const price = monthly
    ? `Mensualidad orientativa ${monthly}€/mes + inversión Meta Ads desde ${ads}€/mes.`
    : `Precio pendiente de validar en visita + Meta Ads desde ${ads}€/mes.`;

  return {
    problem,
    opportunity,
    salesHook: `${demand}. ${gap}. Firekworks puede entrar con diagnóstico visual y captación local.`,
    recommendedService,
    recommendedOffer: `${plan.name} · ${price}`,
    recommendedPlan: plan.name,
    monthlyPriceEstimate: monthly,
    adBudgetEstimate: ads,
    firstVisitGoal: "Grabar/fotografiar diagnóstico visual, revisar WhatsApp/Google Business y enseñar demo de campaña local.",
    probableObjection: "Precio, tiempo o dudas sobre resultados. Respuesta: empezar pequeño, grabar en una visita mensual y medir consultas reales.",
    nextAction: "Preparar demo visual y proponer visita presencial de 15 minutos.",
    pitchPresencial30s: `He visto ${lead.name} y creo que hay una oportunidad sencilla: convertir más búsquedas y visitas locales en consultas por WhatsApp con contenido profesional, Google Business bien trabajado y una campaña Meta Ads pequeña pero medible. Os enseñaría una demo visual y, si encaja, empezamos con ${plan.name}.`
  };
}

export function buildVisitScript(lead: Lead) {
  const proposal = buildLeadProposal(lead);
  return {
    opening: `Hola, soy Firekworks. Estoy revisando comercios de ${lead.city} con margen para captar más clientes localmente. En vuestro caso he visto ${demandSignal(lead).toLowerCase()} y ${digitalGap(lead).toLowerCase()}.`,
    questions: [
      "¿De dónde os llegan ahora la mayoría de clientes nuevos?",
      "¿Usáis WhatsApp Business con respuestas, catálogo o etiquetas?",
      "¿Tenéis Google Business Profile actualizado con fotos, palabras clave y reseñas recientes?",
      "¿Qué servicio o producto os interesa vender más este mes?",
      "Si una campaña trae consultas, ¿quién las responde y cuándo?"
    ],
    close: "Si te parece, preparo una demo visual de cómo quedaría una campaña local con vídeos/fotos reales del negocio y te digo qué inversión mínima tendría sentido en Meta Ads.",
    objections: proposal.probableObjection,
    argument: proposal.pitchPresencial30s
  };
}

function demandSignal(lead: Lead) {
  if (lead.rating && lead.reviews) return `${lead.rating} estrellas y ${lead.reviews} reseñas`;
  if (lead.reviews) return `${lead.reviews} reseñas`;
  return "demanda pendiente de verificar";
}

function digitalGap(lead: Lead) {
  if (!lead.website) return "no hay web o landing clara";
  if (!lead.instagramUrl) return "Instagram pendiente de confirmar";
  if (!lead.whatsappUrl) return "WhatsApp Business no verificado como canal principal";
  if (lead.contentUse === "Sin uso" || lead.contentUse === "Flojo") return `contenido ${lead.contentUse.toLowerCase()}`;
  return "hay margen para ordenar contenido, campaña y seguimiento";
}
