import Link from "next/link";
import { notFound } from "next/navigation";
import { PortraitStage } from "@/components/portrait-stage";
import { SiteHeader } from "@/components/site-header";
import { getCharacterBySlug, getPublishedCharacters } from "@/content/characters/registry";
import { siteCopy } from "@/content/site";

type CharacterPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedCharacters().map(({ character }) => ({ slug: character.slug }));
}

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { slug } = await params;
  const entry = getCharacterBySlug(slug);
  if (!entry) notFound();

  return (
    <main className="profile-page">
      <SiteHeader />
      <section className="profile-layout">
        <div className="profile-copy">
          <p className="eyebrow">{siteCopy.common.profile}</p>
          <span className="profile-number">{String(entry.order).padStart(2, "0")}</span>
          <h1>{entry.character.displayName.zh}</h1>
          <p className="profile-en">{entry.character.displayName.en}</p>
          <p className="profile-summary">{entry.character.summary.zh}</p>
          <dl>
            <div><dt>{siteCopy.common.status}</dt><dd>{siteCopy.common.pending}</dd></div>
            <div><dt>FEATURED</dt><dd>{entry.featured ? siteCopy.common.featured : "—"}</dd></div>
          </dl>
          <Link className="back-link inline-back" href="/characters"><span aria-hidden="true">←</span> {siteCopy.common.back}</Link>
        </div>
        <PortraitStage nameZh={entry.character.displayName.zh} nameEn={entry.character.displayName.en} />
      </section>
    </main>
  );
}
