import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { siteCopy, type RouteCopyKey } from "@/content/site";

type RouteShellProps = { section: RouteCopyKey; children?: React.ReactNode };

export function RouteShell({ section, children }: RouteShellProps) {
  const copy = siteCopy.routes[section];
  return (
    <main className="index-page">
      <SiteHeader />
      <div className="index-orbit" data-tilt-depth="1" aria-hidden="true" />
      <section className="index-heading">
        <span className="index-number" data-global-parallax="10">{copy.index}</span>
        <div data-global-parallax="5">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="index-intro">{copy.intro}</p>
        </div>
      </section>
      <section className="index-content" data-global-parallax="3">
        {children ?? <p className="empty-record">{copy.empty}</p>}
      </section>
      <Link className="back-link" href="/"><span aria-hidden="true">←</span> {siteCopy.common.back}</Link>
    </main>
  );
}
