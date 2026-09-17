import Link from "next/link";
import { RouteShell } from "@/components/route-shell";
import { getPublishedCharacters } from "@/content/characters/registry";
import { siteCopy } from "@/content/site";

export default function CharactersPage() {
  const characters = getPublishedCharacters();
  return (
    <RouteShell section="characters">
      <div className="character-list">
        {characters.map((entry) => (
          <article className="character-row" key={entry.character.slug} data-tilt-card>
            <span className="character-order">{String(entry.order).padStart(2, "0")}</span>
            <div className="character-name">
              <h2>{entry.character.displayName.zh}</h2>
              <p>{entry.character.displayName.en}</p>
            </div>
            <p className="character-summary">{entry.character.summary.zh}</p>
            <Link href={`/characters/${entry.character.slug}`} data-magnetic>{siteCopy.common.openRecord} <span aria-hidden="true">↗</span></Link>
          </article>
        ))}
      </div>
    </RouteShell>
  );
}
