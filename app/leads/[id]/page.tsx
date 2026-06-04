import Image from "next/image";
import Link from "next/link";
import { leads } from "@/lib/mock-leads";
import { scoreLabel } from "@/lib/scoring";
import { ScoreRing } from "@/components/ScoreRing";

type LeadPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return leads.map((lead) => ({ id: lead.id }));
}

export default async function LeadPage({ params }: LeadPageProps) {
  const { id } = await params;
  const lead = leads.find((item) => item.id === id) || leads[0];

  return (
    <main className="lead-page">
      <div className="lead-page__top">
        <Link href="/" className="back-link">
          Volver al radar
        </Link>
        <Image
          src="/firekworks-icon.png"
          width={30}
          height={43}
          alt=""
          className="lead-page__mark"
        />
      </div>

      <section className="lead-page__hero">
        <div>
          <p className="eyebrow">Ficha de lead</p>
          <h1>{lead.name}</h1>
          <p>
            {lead.sector} en {lead.city}. {lead.diagnosis}
          </p>
        </div>
        <ScoreRing score={lead.score} label={scoreLabel(lead.score)} />
      </section>

      <section className="lead-page__grid">
        <article>
          <span>Dolor detectado</span>
          <p>{lead.pain}</p>
        </article>
        <article>
          <span>Próximo paso</span>
          <p>{lead.nextAction}</p>
        </article>
        <article>
          <span>Datos visibles</span>
          <p>
            {lead.rating} estrellas, {lead.reviews} reseñas, {lead.googlePhotos} fotos de Google.
          </p>
        </article>
      </section>
    </main>
  );
}
