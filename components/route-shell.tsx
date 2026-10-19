import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { siteCopy, type RouteCopyKey } from "@/content/site";

type RouteShellProps = { section: RouteCopyKey; children?: React.ReactNode };

export function RouteShell({ section, children }: RouteShellProps) {
  const copy = siteCopy.routes[section];
  return (
    <main className={`index-page index-page--${section}`} id="main-content" tabIndex={-1}>
      <SiteHeader />
      <div className="route-atmosphere" data-route-effect={section} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="index-orbit" aria-hidden="true" />
      <section className="index-heading">
        <span className="index-number">{copy.index}</span>
        <div data-text-reveal>
          <p className="eyebrow" data-typo="meta">{copy.eyebrow}</p>
          <h1 data-typo="hero">{copy.title}</h1>
          <p className="index-intro" data-typo="body">{copy.intro}</p>
        </div>
      </section>
      <section className="index-content" data-text-reveal>
        {children ?? <p className="empty-record" data-typo="body">{copy.empty}</p>}
      </section>
      <Link className="back-link" href="/"><span aria-hidden="true">←</span> {siteCopy.common.back}</Link>
    </main>
  );
}
