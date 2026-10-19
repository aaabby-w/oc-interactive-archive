import { HomeExperience } from "@/components/home-experience";
import { SiteHeader } from "@/components/site-header";
import { getFeaturedCharacter } from "@/content/characters/registry";

export default function Home() {
  const featured = getFeaturedCharacter();

  return (
    <main className="home-page" id="main-content" tabIndex={-1}>
      <SiteHeader />
      <HomeExperience
        characterSlug={featured.character.slug}
        characterNameZh={featured.character.displayName.zh}
        characterNameEn={featured.character.displayName.en}
        characterSummary={featured.character.summary.zh}
        characterArtwork={featured.character.media.portrait}
        characterArtworkAlt={featured.character.media.portraitAlt}
      />
    </main>
  );
}
