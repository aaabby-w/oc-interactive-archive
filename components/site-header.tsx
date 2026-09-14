import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteCopy } from "@/content/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="site-identity" href="/" aria-label={siteCopy.identity.zh}>
        <span className="identity-mark" aria-hidden="true"><span /></span>
        <span className="identity-type">
          <span>{siteCopy.identity.zh}</span>
          <small>{siteCopy.identity.en}</small>
        </span>
      </Link>
      <nav className="site-nav" aria-label="主导航">
        {siteCopy.navigation.map((item) => (
          <Link href={item.href} key={item.href}>
            <span>{item.zh}</span><small>{item.en}</small>
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <span className="header-index" aria-hidden="true">00—15</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
