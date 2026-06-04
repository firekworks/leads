import type { Lead, LeadCity, LeadSector, LeadStatus, RouteStop } from "@/types/lead";
import { computeScore } from "@/lib/scoring";

const baseLeads: Omit<Lead, "score">[] = [
  {
    id: "restaurante-la-placa",
    name: "Restaurante La Placa",
    sector: "Restaurantes",
    city: "Castalla",
    address: "Plaza Mayor, 8",
    phone: "965 000 101",
    website: "",
    description: "Restaurante local con mucha vida de barrio y buena reputación en Google.",
    ownerName: "",
    instagramUrl: "https://instagram.com/laplaca_castalla",
    facebookUrl: "",
    whatsappUrl: "",
    logoUrl: "",
    followersBucket: "1.000 - 5.000",
    contentUse: "Básico",
    websiteTitle: "",
    googleMapsUrl: "https://maps.google.com",
    rating: 4.5,
    reviews: 386,
    googlePhotos: 8,
    status: "Detectado",
    priority: "Alta",
    potential: 690,
    lastContact: "Sin contacto",
    nextAction: "Visita presencial entre 12:00 y 13:00",
    pain: "Buena reputación, pero poca conversión clara a reserva o WhatsApp.",
    diagnosis: "Os encuentra gente, pero el camino hasta escribir o reservar no está lo bastante claro.",
    signals: {
      web: false,
      instagram: true,
      facebook: false,
      whatsapp: false,
      photos: true,
      googleProfile: true
    },
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-03T09:00:00Z"
  },
  {
    id: "clinica-dental-albor",
    name: "Clinica Dental Albor",
    sector: "Clínicas",
    city: "Ibi",
    address: "Avenida de la Industria, 22",
    phone: "965 000 202",
    website: "https://example.com",
    description: "Clínica dental con reputación sólida y margen para mejorar captación de citas.",
    ownerName: "",
    instagramUrl: "",
    facebookUrl: "",
    whatsappUrl: "",
    logoUrl: "",
    followersBucket: "Sin cuenta",
    contentUse: "Sin redes",
    websiteTitle: "Clinica Dental Albor",
    googleMapsUrl: "https://maps.google.com",
    rating: 4.8,
    reviews: 94,
    googlePhotos: 3,
    status: "Interesado",
    priority: "Muy alta",
    potential: 950,
    lastContact: "Hace 2 días",
    nextAction: "Enviar diagnóstico visual y propuesta base",
    pain: "Buena valoración, pero falta confianza visual y sistema directo de citas.",
    diagnosis: "La entrada es confianza: imagen profesional, Google más cuidado y campaña a cita.",
    signals: {
      web: true,
      instagram: false,
      facebook: false,
      whatsapp: false,
      photos: false,
      googleProfile: true
    },
    createdAt: "2026-05-28T10:00:00Z",
    updatedAt: "2026-06-02T09:00:00Z"
  },
  {
    id: "moveup-training",
    name: "MoveUp Training",
    sector: "Gimnasios",
    city: "Onil",
    address: "Calle del Deporte, 3",
    phone: "965 000 303",
    website: "https://example.com",
    description: "Centro de entrenamiento con actividad social, pero sin embudo claro a prueba.",
    ownerName: "",
    instagramUrl: "https://instagram.com/moveup_training",
    facebookUrl: "",
    whatsappUrl: "",
    logoUrl: "",
    followersBucket: "+5.000",
    contentUse: "Activo",
    websiteTitle: "MoveUp Training",
    googleMapsUrl: "https://maps.google.com",
    rating: 4.7,
    reviews: 146,
    googlePhotos: 14,
    status: "Visita/Reunión",
    priority: "Alta",
    potential: 790,
    lastContact: "Ayer",
    nextAction: "Volver con ejemplo de campaña de prueba",
    pain: "Hay actividad, pero falta embudo para convertir curiosos en pruebas.",
    diagnosis: "Campaña local con prueba, WhatsApp preparado y contenido que enseñe transformación.",
    signals: {
      web: true,
      instagram: true,
      facebook: false,
      whatsapp: false,
      photos: true,
      googleProfile: true
    },
    createdAt: "2026-05-26T10:00:00Z",
    updatedAt: "2026-06-02T15:00:00Z"
  },
  {
    id: "estetica-aura",
    name: "Estetica Aura",
    sector: "Estética",
    city: "Elda",
    address: "Calle Jardines, 14",
    phone: "965 000 404",
    website: "",
    description: "Centro de estética con buena imagen social y poca captación desde búsqueda local.",
    ownerName: "",
    instagramUrl: "https://instagram.com/estetica_aura",
    facebookUrl: "https://facebook.com/search/top?q=Estetica%20Aura",
    whatsappUrl: "",
    logoUrl: "",
    followersBucket: "1.000 - 5.000",
    contentUse: "Activo",
    websiteTitle: "",
    googleMapsUrl: "https://maps.google.com",
    rating: 4.9,
    reviews: 67,
    googlePhotos: 2,
    status: "Validado",
    priority: "Media",
    potential: 590,
    lastContact: "Sin contacto",
    nextAction: "Revisar escaparate y tratamientos más vendibles",
    pain: "Buena imagen social, pero poco sistema para captar citas desde Google.",
    diagnosis: "Vendería Google + WhatsApp + tratamientos claros, no solo redes bonitas.",
    signals: {
      web: false,
      instagram: true,
      facebook: true,
      whatsapp: false,
      photos: false,
      googleProfile: true
    },
    createdAt: "2026-05-29T10:00:00Z",
    updatedAt: "2026-06-01T09:00:00Z"
  },
  {
    id: "auto-taller-rico",
    name: "Auto Taller Rico",
    sector: "Talleres",
    city: "Petrer",
    address: "Poligono Salinetas, 9",
    phone: "965 000 505",
    website: "",
    description: "Taller con reseñas suficientes y comunicación digital mejorable.",
    ownerName: "",
    instagramUrl: "",
    facebookUrl: "https://facebook.com/search/top?q=Auto%20Taller%20Rico",
    whatsappUrl: "https://wa.me/34965000505",
    logoUrl: "",
    followersBucket: "Sin cuenta",
    contentUse: "Abandonado",
    websiteTitle: "",
    googleMapsUrl: "https://maps.google.com",
    rating: 4.3,
    reviews: 212,
    googlePhotos: 6,
    status: "Negociación",
    priority: "Media",
    potential: 490,
    lastContact: "Hace 6 días",
    nextAction: "Llamar para resolver dudas de presupuesto",
    pain: "Tiene demanda y reseñas, pero comunicación antigua y poco diferencial.",
    diagnosis: "Aquí el ángulo es confianza y llamadas: revisiones, averías, neumáticos y Google fuerte.",
    signals: {
      web: false,
      instagram: false,
      facebook: true,
      whatsapp: true,
      photos: true,
      googleProfile: true
    },
    createdAt: "2026-05-22T10:00:00Z",
    updatedAt: "2026-06-01T12:00:00Z"
  },
  {
    id: "academia-norte",
    name: "Academia Norte",
    sector: "Academias",
    city: "Alcoi",
    address: "Calle San Nicolas, 31",
    phone: "965 000 606",
    website: "https://example.com",
    description: "Academia con temporalidad clara y oportunidad de campañas por matrículas.",
    ownerName: "",
    instagramUrl: "",
    facebookUrl: "",
    whatsappUrl: "",
    logoUrl: "",
    followersBucket: "Pendiente",
    contentUse: "Pendiente",
    websiteTitle: "Academia Norte",
    googleMapsUrl: "https://maps.google.com",
    rating: 4.6,
    reviews: 58,
    googlePhotos: 5,
    status: "Detectado",
    priority: "Alta",
    potential: 650,
    lastContact: "Sin contacto",
    nextAction: "Preparar ángulo de matriculas por temporada",
    pain: "Tiene web y redes, pero falta campaña por temporada y matriculas.",
    diagnosis: "La venta entra por calendario: matricula, refuerzo, selectividad, idiomas y plazas.",
    signals: {
      web: true,
      instagram: false,
      facebook: false,
      whatsapp: false,
      photos: true,
      googleProfile: true
    },
    createdAt: "2026-05-23T10:00:00Z",
    updatedAt: "2026-05-30T09:00:00Z"
  }
];

export const leads: Lead[] = baseLeads
  .map((lead) => ({ ...lead, score: computeScore(lead) }))
  .sort((a, b) => b.score - a.score);

export const sectors: LeadSector[] = [
  "Restaurantes",
  "Clínicas",
  "Gimnasios",
  "Estética",
  "Peluquerías",
  "Academias",
  "Talleres",
  "Inmobiliarias"
];

export const cities: LeadCity[] = [
  "Castalla",
  "Onil",
  "Ibi",
  "Elda",
  "Sax",
  "Petrer",
  "Alcoi",
  "Alicante"
];

export const statuses: LeadStatus[] = [
  "Descartado",
  "Detectado",
  "Validado",
  "Interesado",
  "Visita/Reunión",
  "Negociación",
  "Cliente",
  "Desinteresado"
];

export const routeStops: RouteStop[] = leads
  .filter((lead) => !["Cliente", "Descartado", "Desinteresado"].includes(lead.status))
  .slice()
  .sort((a, b) => b.score - a.score)
  .map((lead, index) => ({
    ...lead,
    visitOrder: index + 1,
    routeReason:
      lead.score >= 80
        ? "Alta demanda + hueco digital claro"
        : "Buena oportunidad para visita corta"
  }));
