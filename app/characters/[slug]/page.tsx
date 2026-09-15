import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterRoomDemo } from "@/components/character-room-demo";
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

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const portrait = entry.character.media.portrait;
  const artwork = portrait
    ? portrait.startsWith("/")
      ? `${basePath}${portrait}`
      : portrait
    : `${basePath}/images/hero-conservatory-placeholder.png`;

  return (
    <main className="profile-page">
      <SiteHeader />
      <section className="profile-art" aria-labelledby="profile-title">
        <div className="profile-art-media" data-tilt-depth="1">
          <Image
            className="profile-art-image"
            src={artwork}
            alt={entry.character.media.portraitAlt ?? ""}
            fill
            priority
            sizes="100vw"
            style={{ objectPosition: entry.character.media.focalPoint ?? "58% center" }}
          />
        </div>
        <div className="profile-art-overlay" aria-hidden="true" />

        <div className="profile-art-title" data-global-parallax="6">
          <p>{siteCopy.common.profile}</p>
          <h1 id="profile-title">{entry.character.displayName.zh}</h1>
          <span>{entry.character.displayName.en}</span>
        </div>

        <div className="profile-art-folio" aria-hidden="true">
          <span>NO. {String(entry.order).padStart(3, "0")}</span>
          <i />
          <span>{entry.character.summary.en}</span>
        </div>

        <Link className="profile-art-back" href="/characters">
          <span aria-hidden="true">←</span> {siteCopy.common.back}
        </Link>
      </section>
      <CharacterRoomDemo characterName={entry.character.displayName.zh} />
    </main>
  );
}
