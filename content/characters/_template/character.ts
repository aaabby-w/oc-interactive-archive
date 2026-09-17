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
    greetingReplies: {},
  },
};
