export type City = "Castalla" | "Ibi" | "Onil" | "Tibi" | "Sax" | "Petrer" | "Villena" | "Biar" | string;
export type Sector =
  | "Restaurante"
  | "Bar / cafetería"
  | "Clínica"
  | "Dentista"
  | "Estética"
  | "Peluquería"
  | "Gimnasio"
  | "Academia"
  | "Taller"
  | "Inmobiliaria"
  | "Comercio"
  | string;

export type LeadStatus =
  | "Detectado"
  | "Validado"
  | "Prioritario"
  | "Visita pendiente"
  | "Visitado"
  | "Interesado"
  | "Diagnóstico enviado"
  | "Propuesta enviada"
  | "Negociación"
  | "Cliente"
  | "No encaja"
  | "Perdido";

export type Temperature = "Frío" | "Templado" | "Caliente" | "Muy caliente";
export type Channel = "google" | "whatsapp" | "instagram" | "facebook" | "website";
export type ChannelHealth = "none" | "weak" | "ok" | "strong";

export interface ChannelState {
  google: ChannelHealth;
  whatsapp: ChannelHealth;
  instagram: ChannelHealth;
  facebook: ChannelHealth;
  website: ChannelHealth;
}

export interface Lead {
  id: string;
  name: string;
  sector: Sector;
  city: City;
  address: string;
  phone: string;
  website: string;
  googleMapsUrl: string;
  googlePlaceId?: string;
  rating: number;
  reviews: number;
  photos: number;
  channels: ChannelState;
  status: LeadStatus;
  temperature: Temperature;
  score: number;
  monthlyPotential: number;
  pain: string;
  diagnosis: string;
  recommendedAction: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
  lastContact: string;
  lastChecked: string;
  source: "demo" | "manual" | "google";
  createdAt: string;
  updatedAt: string;
}

export interface Filters {
  query: string;
  city: string;
  sector: string;
  status: string;
  temperature: string;
  minScore: number;
  channelIssue: string;
}

export interface PlaceImportResult {
  googlePlaceId: string;
  name: string;
  sector: string;
  city: string;
  address: string;
  phone: string;
  website: string;
  googleMapsUrl: string;
  rating: number;
  reviews: number;
  photos: number;
}
