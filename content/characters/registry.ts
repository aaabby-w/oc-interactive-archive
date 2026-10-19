import type { CharacterRegistryEntry } from "./types";
import { qining } from "./qining";

const character01: CharacterRegistryEntry = {
  character: qining,
  aliases: ["character-01"],
  isPublished: true,
  order: 1,
  featured: true,
  showInNavigation: true,
  hasResidence: false,
};

const character02: CharacterRegistryEntry = {
  character: {
    slug: "character-02",
    displayName: { zh: "角色 02", en: "CHARACTER 02" },
    summary: { zh: "资料尚未公开。", en: "SEALED RECORD" },
    media: {},
    modules: {},
  },
  isPublished: false,
  order: 2,
  featured: false,
  showInNavigation: false,
  hasResidence: false,
};

const character03: CharacterRegistryEntry = {
  character: {
    slug: "character-03",
    displayName: { zh: "角色 03", en: "CHARACTER 03" },
    summary: { zh: "资料尚未公开。", en: "SEALED RECORD" },
    media: {},
    modules: {},
  },
  isPublished: false,
  order: 3,
  featured: false,
  showInNavigation: false,
  hasResidence: false,
};

export const characterRegistry: CharacterRegistryEntry[] = [
  character01,
  character02,
  character03,
].sort((a, b) => a.order - b.order);

export function getPublishedCharacters() {
  return characterRegistry.filter((entry) => entry.isPublished);
}

export function getFeaturedCharacter() {
  return (
    characterRegistry.find((entry) => entry.isPublished && entry.featured) ??
    getPublishedCharacters()[0]
  );
}

export function getCharacterBySlug(slug: string) {
  return characterRegistry.find(
    (entry) =>
      entry.isPublished &&
      (entry.character.slug === slug || entry.aliases?.includes(slug)),
  );
}

export function getPublishedCharacterSlugs() {
  return getPublishedCharacters().flatMap((entry) => [
    entry.character.slug,
    ...(entry.aliases ?? []),
  ]);
}

export function getResidenceCharacters() {
  return characterRegistry.filter(
    (entry) => entry.isPublished && entry.hasResidence,
  );
}
