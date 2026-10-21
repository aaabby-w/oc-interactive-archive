import { SiteHeader } from "@/components/site-header";
import { WorldCommandCenter } from "@/components/world-command-center";

export default function WorldPage() {
  return (
    <div className="world-page-shell">
      <SiteHeader />
      <WorldCommandCenter />
    </div>
  );
}
