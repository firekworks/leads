import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type OwnerRequest = {
  placeId?: string;
  allowPaidRequests?: boolean;
};

type GoogleReview = {
  text?: { text?: string };
  originalText?: { text?: string };
};

export async function POST(request: Request) {
  const body = (await request.json()) as OwnerRequest;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!body.allowPaidRequests) {
    return NextResponse.json({
      candidates: [],
      message: "No se ha consultado Google. Esta acción hace una única petición Place Details con reviews."
    });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Falta GOOGLE_PLACES_API_KEY en el servidor" }, { status: 503 });
  }

  if (!body.placeId) {
    return NextResponse.json({ error: "placeId requerido" }, { status: 400 });
  }

  const resourceName = body.placeId.startsWith("places/") ? body.placeId : `places/${body.placeId}`;
  const response = await fetch(`https://places.googleapis.com/v1/${resourceName}`, {
    headers: {
      "x-goog-api-key": apiKey,
      "x-goog-fieldmask": "reviews"
    },
    signal: AbortSignal.timeout(9000)
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Google Places respondió ${response.status}` }, { status: 502 });
  }

  const payload = (await response.json()) as { reviews?: GoogleReview[] };
  const candidates = Array.from(
    new Set((payload.reviews || []).flatMap((review) => extractOwnerCandidates(reviewText(review))))
  ).slice(0, 6);

  return NextResponse.json({ candidates, reviewsChecked: payload.reviews?.length || 0 });
}

function reviewText(review: GoogleReview) {
  return review.originalText?.text || review.text?.text || "";
}

function extractOwnerCandidates(text: string) {
  const patterns = [
    /(?:dueñ[oa]|propietari[oa]|gerente|encargad[oa])\s+(?:se llama|es|:)?\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/g,
    /(?:atendid[oa] por|gracias a|preguntad por)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/g
  ];

  return patterns.flatMap((pattern) => {
    const matches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      matches.push(match[1].trim());
    }
    return matches;
  });
}
