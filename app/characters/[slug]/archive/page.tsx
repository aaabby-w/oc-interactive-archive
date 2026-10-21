import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getCharacterBySlug, getPublishedCharacters } from "@/content/characters/registry";

type CharacterArchivePageProps = { params: Promise<{ slug: string }> };

function renderInlineEmphasis(text: string) {
  return text.split(/(\*[^*]+\*)/g).map((part, index) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>
    ) : (
      part
    ),
  );
}

type ArchiveEntry = {
  title: string;
  titleEn?: string;
  eyebrow?: string;
  paragraphs: string[];
  /** Appendix chapters open with an accent-colored lead line. */
  lead: boolean;
};

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

  // Sections and appendix chapters share one row component and one numbering sequence.
  const entries: ArchiveEntry[] = [
    ...archive.sections.map((section) => ({
      title: section.title,
      titleEn: section.titleEn,
      eyebrow: section.eyebrow,
      paragraphs: section.paragraphs,
      lead: false,
    })),
    ...(archive.chapters ?? []).map((chapter) => ({
      title: chapter.title,
      titleEn: chapter.titleEn,
      eyebrow: undefined,
      paragraphs: chapter.body
        .split(/\n\s*\n/g)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
      lead: true,
    })),
  ];

  return (
    <main className="dossier-page" id="main-content" tabIndex={-1} style={characterStyle}>
      <SiteHeader />

      <header className="dossier-hero">
        <div className="dossier-hero-index" aria-hidden="true">
          <span>SIS</span><i /><span>104</span>
        </div>
        <div className="dossier-hero-copy" data-text-reveal>
          <p data-typo="meta">CHARACTER DOSSIER · NO. {String(entry.order).padStart(3, "0")}</p>
          <h1 data-typo="hero">{heroName.zh}</h1>
          <span data-typo="meta">{heroName.en}</span>
          <blockquote data-typo="quote">“{profile?.quote}”</blockquote>
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
          <h2 id="dossier-summary-title" data-typo="heading">人物记录</h2>
          {archive.lede ? <p data-typo="body">{archive.lede}</p> : null}
        </div>
        {profile?.facts?.length ? (
          <dl className="dossier-facts">
            {profile.facts.map((fact) => (
              <div key={`${fact.label}-${fact.value}`} data-typo="line">
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
            <h2 id="dossier-appearance-title" data-typo="heading">外貌记录</h2>
            <dl>
              {profile.appearance.map((fact) => (
                <div key={fact.label} data-typo="line">
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
          <h2 id="dossier-narrative-title" data-typo="heading">经历档案</h2>
          {archive.contentWarning ? (
            <aside className="dossier-warning">
              <strong>内容提示</strong>
              <p data-typo="body">{archive.contentWarning}</p>
            </aside>
          ) : null}

          {entries.length ? (
            <div className="dossier-chapters" aria-label="经历章节">
              {entries.map((entry, index) => {
                const number = String(index + 1).padStart(2, "0");
                return (
                  <details className="dossier-chapter" key={entry.title}>
                    <summary>
                      <span className="dossier-chapter-index">{number}</span>
                      <span className="dossier-chapter-title">
                        <strong>{entry.title}</strong>
                        <small>{entry.titleEn ?? `CHAPTER ${number}`}</small>
                      </span>
                      <b aria-hidden="true">＋</b>
                    </summary>
                    <div className="dossier-chapter-content" data-lead={entry.lead || undefined}>
                      {entry.eyebrow ? <p data-typo="meta" className="dossier-chapter-eyebrow">{entry.eyebrow}</p> : null}
                      {entry.paragraphs.map((paragraph, paragraphIndex) => (
                        <p key={`${entry.title}-${paragraphIndex}`} data-typo="body">
                          {renderInlineEmphasis(paragraph)}
                        </p>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          ) : null}

          {archive.relationNote ? (
            <aside className="dossier-relation">
              <span>RELATION NOTE</span>
              <p data-typo="body">{archive.relationNote}</p>
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
