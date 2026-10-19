import Image from "next/image";
import Link from "next/link";
import type { Character } from "@/content/characters/types";
import { siteCopy } from "@/content/site";

export function CharacterProfileOverview({ character }: { character: Character }) {
  const profile = character.profile;
  if (!profile) return null;

  return (
    <section className="character-overview" aria-labelledby={`${character.slug}-overview-title`}>
      <div className="character-overview-intro" data-text-reveal>
        <p data-typo="meta">PROFILE · 001</p>
        <h2 id={`${character.slug}-overview-title`} data-typo="heading">{profile.callout}</h2>
        {profile.quote ? <blockquote data-typo="quote">“{profile.quote}”</blockquote> : null}
      </div>

      {profile.facts?.length ? (
        <dl className="character-facts" data-text-reveal>
          {profile.facts.map((fact) => (
            <div key={`${fact.label}-${fact.value}`} data-typo="line">
              <dt>{fact.label}<small>{fact.labelEn}</small></dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {profile.keywords?.length ? (
        <ul className="character-keywords" aria-label="角色关键词">
          {profile.keywords.map((keyword, index) => (
            <li key={keyword} data-typo="line"><span>{String(index + 1).padStart(2, "0")}</span>{keyword}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function CharacterShowcase({ character }: { character: Character }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const items = character.media.gallery ?? [];
  const headingId = `${character.slug}-showcase-title`;
  if (!items.length) return null;

  return (
    <section className="character-showcase" aria-labelledby={headingId}>
      <header className="showcase-heading" data-text-reveal>
        <p data-typo="meta">{siteCopy.characterPage.showcase.eyebrow}</p>
        <h2 id={headingId} data-typo="heading">{siteCopy.characterPage.showcase.title}</h2>
      </header>

      <div className="showcase-grid" data-count={items.length}>
        {items.map((item, index) => {
          const format = item.format;
          const src = item.src.startsWith("/") ? `${basePath}${item.src}` : item.src;

          return (
            <figure className="showcase-figure" data-format={format} key={item.code ?? item.src}>
              <div className="showcase-media" data-fit={item.fit ?? "cover"} data-tilt-card>
                <Image
                  src={src}
                  alt={item.alt}
                  fill
                  sizes={format === "landscape" ? "(max-width: 760px) 94vw, 58vw" : "(max-width: 760px) 94vw, 29vw"}
                  style={{ objectFit: item.fit ?? "cover", objectPosition: item.focalPoint ?? "50% 50%" }}
                />
              </div>
              <figcaption data-typo="line">
                <span>{item.title ?? `图像 ${index + 1}`}<small>{item.titleEn ?? format.toUpperCase()}</small></span>
                <span className="showcase-credit">{item.credit}<small>{item.code}</small></span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

export function CharacterArchiveGateway({ character }: { character: Character }) {
  const headingId = `${character.slug}-archive-title`;
  if (!character.archive) return null;

  return (
    <section className="character-archive-gateway" aria-labelledby={headingId}>
      <div className="archive-gateway-index" aria-hidden="true">
        <span>TEXT</span><i /><span>FILE</span>
      </div>
      <div className="archive-gateway-copy" data-text-reveal>
        <p data-typo="meta">{siteCopy.characterPage.archive.eyebrow}</p>
        <h2 id={headingId} data-typo="heading">{siteCopy.characterPage.archive.title}</h2>
        {character.archive.lede ? <span data-typo="body">{character.archive.lede}</span> : null}
        {character.archive.contentWarning ? <small data-typo="body">{character.archive.contentWarning}</small> : null}
      </div>
      <Link className="archive-gateway-link" href={`/characters/${character.slug}/archive`} data-magnetic>
        <span>{siteCopy.characterPage.archive.open}<small>{siteCopy.characterPage.archive.openEn}</small></span>
        <b aria-hidden="true">↗</b>
      </Link>
    </section>
  );
}
