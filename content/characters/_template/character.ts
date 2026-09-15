import type { Character } from "../types";

export const characterTemplate: Character = {
  slug: "replace-with-stable-slug",
  displayName: { zh: "角色名称", en: "CHARACTER NAME" },
  title: { zh: "可选称号", en: "OPTIONAL TITLE" },
  summary: {
    zh: "在这里填写简短的中文人物引言。",
    en: "Optional short English display line.",
  },
  media: {
    portrait: undefined,
    portraitAlt: undefined,
    focalPoint: "50% 35%",
    gallery: [],
  },
  modules: {},
  residence: {
    appearance: {
      hairStyle: "bob",
      hairColor: 0x59473f,
      hairHighlight: 0x80675b,
      eyeColor: 0x405f68,
      skinColor: 0xe5bfa4,
      outfitPrimary: 0x66877e,
      outfitSecondary: 0xd8c9aa,
      accentColor: 0xb96f59,
      neckwear: "choker",
    },
    greetingReplies: {},
  },
};
