import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { CharacterRoomDemo } from "@/components/character-room-demo";
import {
  CharacterArchiveGateway,
  CharacterProfileOverview,
  CharacterShowcase,
} from "@/components/character-profile-sections";
import { SiteHeader } from "@/components/site-header";
import { getCharacterBySlug, getPublishedCharacterSlugs } from "@/content/characters/registry";
import { siteCopy } from "@/content/site";

type CharacterPageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedCharacterSlugs().map((slug) => ({ slug }));
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
  const visual = entry.character.visual;
  const heroName = visual?.heroName ?? entry.character.displayName;
  const characterStyle = {
    "--character-accent": visual?.accent,
    "--character-accent-soft-light": visual?.accentSoft,
    "--character-surface-light": visual?.surface,
  } as CSSProperties;

  return (
    <main
      className="profile-page"
      id="main-content"
      tabIndex={-1}
      style={characterStyle}
      data-title-placement={visual?.titlePlacement ?? "left"}
    >
      <SiteHeader />
      <section className="profile-art" aria-labelledby="profile-title">
        <div className="profile-art-media">
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

        <div className="profile-art-title" data-text-reveal>
          <p data-typo="meta">{siteCopy.common.profile}</p>
          <h1 id="profile-title" data-typo="hero">{heroName.zh}</h1>
          <span data-typo="meta">{heroName.en}</span>
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
      <CharacterProfileOverview character={entry.character} />
      {entry.character.modules.gallery ? <CharacterShowcase character={entry.character} /> : null}
      {entry.character.modules.archive ? <CharacterArchiveGateway character={entry.character} /> : null}
      {entry.character.modules.residence ? (
        <CharacterRoomDemo
          characterId={entry.character.slug}
          characterName={entry.character.displayName.zh}
          residence={entry.character.residence}
        />
      ) : null}
    </main>
  );
}
