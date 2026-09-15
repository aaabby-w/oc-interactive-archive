import type { CharacterRegistryEntry } from "./types";

const character01: CharacterRegistryEntry = {
  character: {
    slug: "character-01",
    displayName: { zh: "角色 01", en: "CHARACTER 01" },
    summary: {
      zh: "姓名、肖像与人物资料尚未录入。",
      en: "IDENTITY RECORD PENDING",
    },
    media: {},
    modules: {},
    residence: {
      appearance: {
        hairStyle: "ponytail",
        hairColor: 0xc8754f,
        hairHighlight: 0xe9a067,
        skinColor: 0xf0c6a5,
        outfitPrimary: 0x52736d,
        outfitSecondary: 0xe8d7b8,
        accentColor: 0xc76f52,
      },
    },
  },
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
    (entry) => entry.isPublished && entry.character.slug === slug,
  );
}

export function getResidenceCharacters() {
  return characterRegistry.filter(
    (entry) => entry.isPublished && entry.hasResidence,
  );
}
