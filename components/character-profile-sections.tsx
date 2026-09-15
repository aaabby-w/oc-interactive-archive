import Image from "next/image";
import Link from "next/link";
import type { Character, CharacterGalleryItem } from "@/content/characters/types";
import { siteCopy } from "@/content/site";

const placeholderFormats: CharacterGalleryItem["format"][] = [
  "full",
  "full",
  "full",
  "portrait",
  "landscape",
];

export function CharacterShowcase({ character }: { character: Character }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const items = character.media.gallery ?? [];
  const headingId = `${character.slug}-showcase-title`;

  return (
    <section className="character-showcase" aria-labelledby={headingId}>
      <header className="showcase-heading" data-global-parallax="3">
        <p>{siteCopy.characterPage.showcase.eyebrow}</p>
        <h2 id={headingId}>{siteCopy.characterPage.showcase.title}</h2>
        <span>{siteCopy.characterPage.showcase.intro}</span>
      </header>

      <div className="showcase-grid">
        {siteCopy.characterPage.showcase.slots.map((slot, index) => {
          const item = items[index];
          const format = item?.format ?? placeholderFormats[index];
          const src = item?.src.startsWith("/") ? `${basePath}${item.src}` : item?.src;

          return (
            <figure className="showcase-figure" data-format={format} key={slot.code}>
              <div className="showcase-media" data-global-parallax={index % 2 === 0 ? "2" : "-2"}>
                {item && src ? (
                  <Image
                    src={src}
                    alt={item.alt}
                    fill
                    sizes={format === "landscape" ? "(max-width: 760px) 90vw, 55vw" : "(max-width: 760px) 82vw, 25vw"}
                    style={{ objectFit: "cover", objectPosition: item.focalPoint ?? "50% 50%" }}
                  />
                ) : (
                  <div className="showcase-placeholder">
                    <span aria-hidden="true"><i /><i /><b>＋</b></span>
                    <p>{siteCopy.characterPage.showcase.pending}</p>
                  </div>
                )}
              </div>
              <figcaption>
                <span>{slot.zh}<small>{slot.en}</small></span>
                <b>{slot.code}</b>
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

  return (
    <section className="character-archive-gateway" aria-labelledby={headingId}>
      <div className="archive-gateway-index" aria-hidden="true">
        <span>TEXT</span><i /><span>FILE</span>
      </div>
      <div className="archive-gateway-copy" data-global-parallax="4">
        <p>{siteCopy.characterPage.archive.eyebrow}</p>
        <h2 id={headingId}>{siteCopy.characterPage.archive.title}</h2>
        <span>{siteCopy.characterPage.archive.intro}</span>
        <small>{siteCopy.characterPage.archive.pending}</small>
      </div>
      <Link className="archive-gateway-link" href="/archive">
        <span>{siteCopy.characterPage.archive.open}<small>{siteCopy.characterPage.archive.openEn}</small></span>
        <b aria-hidden="true">↗</b>
      </Link>
    </section>
  );
}
