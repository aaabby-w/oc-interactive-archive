export type BilingualText = {
  zh: string;
  en?: string;
};

export type CharacterMedia = {
  portrait?: string;
  portraitAlt?: string;
  focalPoint?: `${number}% ${number}%`;
  gallery?: CharacterGalleryItem[];
};

export type CharacterGalleryItem = {
  src: string;
  alt: string;
  format: "full" | "portrait" | "landscape";
  focalPoint?: `${number}% ${number}%`;
  fit?: "cover" | "contain";
  title?: string;
  titleEn?: string;
  code?: string;
  credit?: string;
};

export type CharacterFact = {
  label: string;
  value: string;
  labelEn?: string;
};

export type CharacterArchiveSection = {
  eyebrow?: string;
  title: string;
  paragraphs: string[];
};

export type CharacterProfile = {
  callout?: string;
  facts?: CharacterFact[];
  keywords?: string[];
  appearance?: CharacterFact[];
  quote?: string;
};

export type CharacterArchive = {
  lede?: string;
  contentWarning?: string;
  sections: CharacterArchiveSection[];
  relationNote?: string;
};

export type CharacterVisualDirection = {
  accent?: string;
  accentSoft?: string;
  surface?: string;
  titlePlacement?: "left" | "right";
  heroName?: BilingualText;
};

export type CharacterModules = {
  story?: boolean;
  connections?: boolean;
  quotes?: boolean;
  gallery?: boolean;
  timeline?: boolean;
  archive?: boolean;
  residence?: boolean;
};

export type ResidenceActivity = "sleep" | "work" | "read" | "cat" | "idle" | "away";

export type CharacterResidence = {
  greetingReplies?: Partial<Record<ResidenceActivity, string[]>>;
};

export type Character = {
  slug: string;
  displayName: BilingualText;
  title?: BilingualText;
  summary: BilingualText;
  media: CharacterMedia;
  modules: CharacterModules;
  profile?: CharacterProfile;
  archive?: CharacterArchive;
  visual?: CharacterVisualDirection;
  residence?: CharacterResidence;
};

export type CharacterRegistryEntry = {
  character: Character;
  aliases?: string[];
  isPublished: boolean;
  order: number;
  featured: boolean;
  showInNavigation: boolean;
  hasResidence: boolean;
};
