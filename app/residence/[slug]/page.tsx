import { notFound } from "next/navigation";
import { getResidenceCharacters } from "@/content/characters/registry";

type ResidencePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  const residences = getResidenceCharacters().map(({ character }) => ({
    slug: character.slug,
  }));

  // Next.js static export requires at least one generated value for a dynamic
  // segment. This sentinel is rendered as a 404 until a residence is published.
  return residences.length > 0 ? residences : [{ slug: "not-published" }];
}

export default async function ResidencePage({ params }: ResidencePageProps) {
  const { slug } = await params;
  const entry = getResidenceCharacters().find(({ character }) => character.slug === slug);
  if (!entry) notFound();
  return null;
}
