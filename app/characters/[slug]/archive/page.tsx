import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCharacterBySlug, getPublishedCharacters } from "@/content/characters/registry";

type CharacterArchivePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPublishedCharacters()
    .filter(({ character }) => Boolean(character.archive))
    .map(({ character }) => ({ slug: character.slug }));
}

export default async function CharacterArchivePage({ params }: CharacterArchivePageProps) {
  const { slug } = await params;
  const entry = getCharacterBySlug(slug);
  if (!entry) notFound();

  const { character } = entry;
  const archive = character.archive;
  if (!archive) notFound();
  const profile = character.profile;
  const visual = character.visual;
  const heroName = visual?.heroName ?? character.displayName;
  const characterStyle = {
    "--character-accent": visual?.accent,
    "--character-accent-soft": visual?.accentSoft,
    "--character-surface": visual?.surface,
  } as CSSProperties;

  return (
    <main className="dossier-page" id="main-content" tabIndex={-1} style={characterStyle}>
      <SiteHeader />

      <header className="dossier-hero">
        <div className="dossier-hero-index" aria-hidden="true">
          <span>SIS</span><i /><span>104</span>
        </div>
        <div className="dossier-hero-copy" data-text-reveal>
          <p>CHARACTER DOSSIER · NO. {String(entry.order).padStart(3, "0")}</p>
          <h1 data-scramble>{heroName.zh}</h1>
          <span>{heroName.en}</span>
          <blockquote>“{profile?.quote}”</blockquote>
        </div>
        <Link className="dossier-back" href={`/characters/${character.slug}`}>
          <span aria-hidden="true">←</span> 返回人物页
        </Link>
      </header>

      <section className="dossier-summary" aria-labelledby="dossier-summary-title">
        <div className="dossier-section-label">
          <span>01</span><p>IDENTITY RECORD</p>
        </div>
        <div className="dossier-summary-copy" data-text-reveal>
          <h2 id="dossier-summary-title">人物记录</h2>
          <p>{archive.lede}</p>
        </div>
        {profile?.facts?.length ? (
          <dl className="dossier-facts">
            {profile.facts.map((fact) => (
              <div key={`${fact.label}-${fact.value}`}>
                <dt>{fact.label}<small>{fact.labelEn}</small></dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {profile?.appearance?.length ? (
        <section className="dossier-appearance" aria-labelledby="dossier-appearance-title">
          <div className="dossier-section-label">
            <span>02</span><p>APPEARANCE</p>
          </div>
          <div className="dossier-appearance-body">
            <h2 id="dossier-appearance-title">外貌记录</h2>
            <dl>
              {profile.appearance.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      <section className="dossier-narrative" aria-labelledby="dossier-narrative-title">
        <div className="dossier-section-label">
          <span>03</span><p>RESTRICTED HISTORY</p>
        </div>
        <div className="dossier-narrative-body">
          <h2 id="dossier-narrative-title">经历档案</h2>
          {archive.contentWarning ? (
            <aside className="dossier-warning">
              <strong>内容提示</strong>
              <p>{archive.contentWarning}</p>
            </aside>
          ) : null}

          <details className="dossier-story">
            <summary>
              <span>展开完整经历</span>
              <small>OPEN RESTRICTED FILE</small>
              <b aria-hidden="true">＋</b>
            </summary>
            <div className="dossier-story-content">
              {archive.sections.map((section) => (
                <article key={section.title}>
                  {section.eyebrow ? <p>{section.eyebrow}</p> : null}
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={`${section.title}-${index}`}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </div>
          </details>

          {archive.relationNote ? (
            <aside className="dossier-relation">
              <span>RELATION NOTE</span>
              <p>{archive.relationNote}</p>
            </aside>
          ) : null}
        </div>
      </section>

      <footer className="dossier-footer">
        <span>{heroName.zh}</span>
        <small>END OF AVAILABLE RECORD</small>
        <Link href={`/characters/${character.slug}`}>返回人物页 ↑</Link>
      </footer>
    </main>
  );
}
