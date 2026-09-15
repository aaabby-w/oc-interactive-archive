import type { ResidenceActivity } from "@/content/characters/types";

type DailyPlan = {
  wakeMinute: number;
  sleepMinute: number;
  lateShift: boolean;
  overtimeEnd: 60 | 120;
  workFromHome: boolean;
  morningActivity: "read" | "cat";
  eveningActivity: "cat" | "idle";
  errandTonight: boolean;
};

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function createRandom(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDailyPlan(date: Date, characterKey: string): DailyPlan {
  const random = createRandom(hash(`${characterKey}:${dayKey(date)}`));
  const weekday = date.getDay() > 0 && date.getDay() < 6;
  return {
    wakeMinute: 380 + Math.floor(random() * 41),
    sleepMinute: 1380 + Math.floor(random() * 21),
    lateShift: weekday && random() < 0.045,
    overtimeEnd: random() < 0.65 ? 60 : 120,
    workFromHome: random() < 0.42,
    morningActivity: random() < 0.58 ? "read" : "cat",
    eveningActivity: random() < 0.55 ? "cat" : "idle",
    errandTonight: random() < 0.34,
  };
}

function previousDay(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - 1);
  return result;
}

export function getResidenceActivityAt(
  date: Date,
  characterKey: string,
): ResidenceActivity {
  const minute = date.getHours() * 60 + date.getMinutes();
  const plan = createDailyPlan(date, characterKey);
  const priorPlan = createDailyPlan(previousDay(date), characterKey);

  if (priorPlan.lateShift && minute < priorPlan.overtimeEnd) return "away";
  if (minute < plan.wakeMinute) return "sleep";
  if (minute >= plan.sleepMinute) return plan.lateShift ? "away" : "sleep";

  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const workActivity: ResidenceActivity = plan.workFromHome ? "work" : "away";

  if (minute < plan.wakeMinute + 35) return "idle";
  if (minute < 480) return plan.morningActivity;
  if (minute < 540) return "away";

  if (weekend) {
    if (minute < 660) return plan.morningActivity;
    if (minute < 720) return plan.eveningActivity;
    if (minute < 840) return "away";
    if (minute < 960) return "read";
    if (minute < 1080) return plan.eveningActivity;
  } else {
    if (minute < 720) return workActivity;
    if (minute < 780) return "away";
    if (minute < 1050) return workActivity;
    if (minute < 1110) return "away";
  }

  if (minute < 1170) return plan.eveningActivity;
  if (minute < 1210) return plan.errandTonight ? "away" : "idle";
  if (minute < 1290) return "read";
  if (minute < 1330) return plan.eveningActivity;
  return plan.morningActivity === "read" ? "idle" : "read";
}

export function chooseResidenceReply(
  activity: ResidenceActivity,
  replies: Record<ResidenceActivity, readonly string[]>,
  random: () => number = Math.random,
) {
  const pool = replies[activity];
  return pool[Math.floor(random() * pool.length)];
}
