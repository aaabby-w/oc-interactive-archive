import { SiteHeader } from "@/components/site-header";
import { WorldAtlas } from "@/components/world-atlas";

export default function WorldPage() {
  return (
    <div className="world-page-shell">
      <SiteHeader />
      <WorldAtlas />
    </div>
  );
}
