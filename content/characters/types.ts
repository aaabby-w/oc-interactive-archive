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

export type Character = {
  slug: string;
  displayName: BilingualText;
  title?: BilingualText;
  summary: BilingualText;
  media: CharacterMedia;
  modules: CharacterModules;
};

export type CharacterRegistryEntry = {
  character: Character;
  isPublished: boolean;
  order: number;
  featured: boolean;
  showInNavigation: boolean;
  hasResidence: boolean;
};
