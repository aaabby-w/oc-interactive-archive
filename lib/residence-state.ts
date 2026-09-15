import type { ResidenceActivity } from "@/content/characters/types";

export function getResidenceActivityPool(hour: number): ResidenceActivity[] {
  if (hour < 6) return ["sleep", "sleep", "sleep", "read"];
  if (hour < 9) return ["idle", "cat", "read"];
  if (hour < 18) return ["work", "work", "read", "away", "away", "cat"];
  if (hour < 23) return ["work", "read", "cat", "idle", "away"];
  return ["sleep", "sleep", "read"];
}

export function chooseResidenceActivity(
  hour: number,
  current?: ResidenceActivity,
  random: () => number = Math.random,
) {
  const choices = getResidenceActivityPool(hour);
  const alternatives = choices.filter((choice) => choice !== current);
  const pool = alternatives.length ? alternatives : choices;
  return pool[Math.floor(random() * pool.length)];
}

export function chooseResidenceReply(
  activity: ResidenceActivity,
  replies: Record<ResidenceActivity, readonly string[]>,
  random: () => number = Math.random,
) {
  const pool = replies[activity];
  return pool[Math.floor(random() * pool.length)];
}
