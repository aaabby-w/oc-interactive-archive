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

export type PixelResidenceAppearance = {
  hairStyle?: "ponytail" | "bob" | "short";
  hairColor?: number;
  hairHighlight?: number;
  skinColor?: number;
  outfitPrimary?: number;
  outfitSecondary?: number;
  accentColor?: number;
};

export type CharacterResidence = {
  greetingReplies?: Partial<Record<ResidenceActivity, string[]>>;
  appearance?: PixelResidenceAppearance;
};

export type Character = {
  slug: string;
  displayName: BilingualText;
  title?: BilingualText;
  summary: BilingualText;
  media: CharacterMedia;
  modules: CharacterModules;
  residence?: CharacterResidence;
};

export type CharacterRegistryEntry = {
  character: Character;
  isPublished: boolean;
  order: number;
  featured: boolean;
  showInNavigation: boolean;
  hasResidence: boolean;
};
