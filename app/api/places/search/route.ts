import { NextRequest, NextResponse } from "next/server";
import type { PlaceImportResult } from "@/types/lead";

export const dynamic = "force-dynamic";

const SECTOR_QUERY: Record<string, string> = {
  Restaurante: "restaurantes",
  "Bar / cafetería": "bares cafeterías",
  Clínica: "clínicas",
  Dentista: "dentistas",
  Estética: "centros de estética",
  Peluquería: "peluquerías",
  Gimnasio: "gimnasios",
  Academia: "academias",
  Taller: "talleres mecánicos",
  Inmobiliaria: "inmobiliarias",
  Comercio: "comercios tiendas"
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: unknown[];
  primaryTypeDisplayName?: { text?: string };
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta GOOGLE_PLACES_API_KEY en Netlify → Environment variables." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { city?: string; sector?: string; limit?: number };
    const city = (body.city || "Castalla").trim();
    const sector = (body.sector || "Restaurante").trim();
    const limit = Math.max(1, Math.min(20, Number(body.limit || 12)));
    const querySector = SECTOR_QUERY[sector] || sector;

    const googleResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.nationalPhoneNumber",
          "places.websiteUri",
          "places.googleMapsUri",
          "places.rating",
          "places.userRatingCount",
          "places.photos",
          "places.primaryTypeDisplayName"
        ].join(",")
      },
      body: JSON.stringify({
        textQuery: `${querySector} en ${city}, Alicante, España`,
        languageCode: "es",
        regionCode: "ES",
        pageSize: limit
      })
    });

    if (!googleResponse.ok) {
      const message = await googleResponse.text();
      return NextResponse.json(
        { error: `Google Places ha devuelto error ${googleResponse.status}: ${message}` },
        { status: googleResponse.status }
      );
    }

    const data = (await googleResponse.json()) as { places?: GooglePlace[] };
    const places: PlaceImportResult[] = (data.places || []).map((place) => ({
      googlePlaceId: place.id || crypto.randomUUID(),
      name: place.displayName?.text || "Negocio sin nombre",
      sector: place.primaryTypeDisplayName?.text || sector,
      city,
      address: place.formattedAddress || city,
      phone: place.nationalPhoneNumber || "",
      website: place.websiteUri || "",
      googleMapsUrl: place.googleMapsUri || "",
      rating: place.rating || 0,
      reviews: place.userRatingCount || 0,
      photos: place.photos?.length || 0
    }));

    return NextResponse.json({ places });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
