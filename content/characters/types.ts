export type BilingualText = {
  zh: string;
  en?: string;
};

export type CharacterMedia = {
  portrait?: string;
  portraitAlt?: string;
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

export type ResidenceProp = "camera" | "books" | "journal" | "tea" | "flowers";

export type CharacterResidence = {
  representativeItems?: ResidenceProp[];
  greetingReplies?: Partial<Record<ResidenceActivity, string[]>>;
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
